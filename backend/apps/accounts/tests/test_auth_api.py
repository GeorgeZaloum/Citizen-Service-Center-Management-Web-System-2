from datetime import timedelta

from django.middleware.csrf import _get_new_csrf_string
from django.test import override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import IdentityDocument, User, UserSession
from apps.audit.models import ActivityLog
from shared.constants import ACCOUNT_DISABLED, ROLE_CITIZEN, ROLE_DEPT_MANAGER, ROLE_EMPLOYEE, ROLE_SYSTEM_ADMIN

from .helpers import PASSWORD, error_code, image_file, logged_in_client, make_department, make_user


def registration_data(**overrides):
    data = {
        "full_name": "Rana Khoury",
        "national_id": "01234567890",
        "email": "rana@mail.sy",
        "phone": "0933111222",
        "password": PASSWORD,
        "password_confirmation": PASSWORD,
        "id_card_front": image_file("front.png"),
        "id_card_back": image_file("back.jpg", "JPEG"),
    }
    data.update(overrides)
    return data


class RegisterCitizenTests(APITestCase):
    """UC-01 Register Citizen Account: main flow and alternatives 4a, 4b, 4c."""

    url = reverse("auth-register")

    def test_registration_creates_an_active_citizen_with_both_images_and_no_session(self):
        response = self.client.post(self.url, registration_data(), format="multipart")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.json()["success"])
        user = User.objects.get(email="rana@mail.sy")
        self.assertEqual((user.role, user.status), (ROLE_CITIZEN, "ACTIVE"))
        self.assertEqual(IdentityDocument.objects.filter(user=user).count(), 2)
        self.assertNotIn("sessionid", response.cookies)
        self.assertTrue(ActivityLog.objects.filter(action="CITIZEN_REGISTERED", entity_id=user.id).exists())

    def test_4a_invalid_fields(self):
        response = self.client.post(
            self.url, registration_data(email="bad", phone="123", national_id="12"), format="multipart"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.json()["error"]["type"], "validation_error")
        self.assertTrue({"email", "phone", "national_id"} <= set(response.json()["error"]["details"]))

    def test_4a_passwords_do_not_match(self):
        response = self.client.post(
            self.url, registration_data(password_confirmation="Other-Pass1"), format="multipart"
        )
        self.assertIn("password_confirmation", response.json()["error"]["details"])

    def test_4a_weak_password(self):
        data = registration_data(password="weakpass", password_confirmation="weakpass")
        response = self.client.post(self.url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(len(response.json()["error"]["details"]["password"]), 2)  # no uppercase, no digit
        self.assertFalse(User.objects.exists())

    def test_4b_data_linked_to_an_existing_account(self):
        make_user(ROLE_CITIZEN, email="rana@mail.sy")
        response = self.client.post(self.url, registration_data(), format="multipart")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(error_code(response), "account_exists")
        self.assertEqual(response.json()["error"]["details"]["fields"], ["email"])

    def test_4c_image_with_wrong_content_is_refused(self):
        data = registration_data(id_card_back=image_file("back.png", "GIF"))
        response = self.client.post(self.url, data, format="multipart")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("id_card_back", response.json()["error"]["details"])
        self.assertFalse(User.objects.exists())

    def test_4c_missing_image(self):
        data = registration_data()
        data.pop("id_card_front")
        response = self.client.post(self.url, data, format="multipart")
        self.assertIn("id_card_front", response.json()["error"]["details"])

    @override_settings(ID_IMAGE_MAX_BYTES=50)
    def test_4c_image_too_large(self):
        response = self.client.post(self.url, registration_data(), format="multipart")
        self.assertIn("id_card_front", response.json()["error"]["details"])

    def test_role_sent_by_the_client_is_ignored(self):
        """FR-USR-03: no staff account can be created from the public form."""
        self.client.post(self.url, registration_data(role=ROLE_SYSTEM_ADMIN), format="multipart")
        self.assertEqual(User.objects.get().role, ROLE_CITIZEN)

    def test_logged_in_users_cannot_register(self):
        client = logged_in_client(make_user(ROLE_CITIZEN))
        response = client.post(self.url, registration_data(), format="multipart")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(error_code(response), "already_authenticated")


class CsrfTests(APITestCase):
    def test_unsafe_anonymous_request_without_csrf_token_is_refused(self):
        client = APIClient(enforce_csrf_checks=True)
        make_user(ROLE_CITIZEN, email="c@mail.sy")
        response = client.post(reverse("auth-login"), {"email": "c@mail.sy", "password": PASSWORD})
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(error_code(response), "csrf_failed")

    def test_login_with_csrf_token(self):
        client = APIClient(enforce_csrf_checks=True)
        make_user(ROLE_CITIZEN, email="c@mail.sy")
        token = client.get(reverse("auth-csrf")).json()["data"]["csrf_token"]
        response = client.post(
            reverse("auth-login"), {"email": "c@mail.sy", "password": PASSWORD}, HTTP_X_CSRFTOKEN=token
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.cookies["sessionid"]["httponly"])

    def test_token_endpoint_sets_the_cookie(self):
        client = APIClient()
        client.cookies["csrftoken"] = _get_new_csrf_string()
        self.assertIn("csrf_token", client.get(reverse("auth-csrf")).json()["data"])


class LoginTests(APITestCase):
    """UC-02 Log In: main flow and alternatives 4a, 4b (lockout), 4c."""

    url = reverse("auth-login")

    def login(self, email="c@mail.sy", password=PASSWORD):
        return self.client.post(self.url, {"email": email, "password": password}, format="json")

    def test_each_role_receives_its_role_department_and_capabilities(self):
        department = make_department("Traffic")
        for role in (ROLE_CITIZEN, ROLE_EMPLOYEE, ROLE_DEPT_MANAGER, ROLE_SYSTEM_ADMIN):
            staff = role in (ROLE_EMPLOYEE, ROLE_DEPT_MANAGER)
            user = make_user(role, department=department if staff else None)
            response = APIClient().post(self.url, {"email": user.email.upper(), "password": PASSWORD})
            data = response.json()["data"]["user"]
            self.assertEqual(data["role"], role)
            self.assertEqual(data["department"]["name"] if staff else data["department"], "Traffic" if staff else None)
            self.assertIn("password.change", data["capabilities"])

    def test_session_opens_and_me_returns_the_user(self):
        make_user(ROLE_CITIZEN, email="c@mail.sy")
        self.login()
        self.assertEqual(self.client.get(reverse("auth-me")).json()["data"]["user"]["email"], "c@mail.sy")
        self.assertTrue(ActivityLog.objects.filter(action="LOGIN_SUCCEEDED").exists())

    def test_4a_same_generic_message_for_unknown_email_and_wrong_password(self):
        make_user(ROLE_CITIZEN, email="c@mail.sy")
        wrong = self.login(password="Wrong-Pass1")
        unknown = self.login(email="nobody@mail.sy")
        self.assertEqual(wrong.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(wrong.json(), unknown.json())
        self.assertEqual(error_code(wrong), "invalid_credentials")

    def test_4b_fifth_failure_locks_the_account_for_fifteen_minutes(self):
        user = make_user(ROLE_CITIZEN, email="c@mail.sy")
        for _ in range(4):
            self.assertEqual(error_code(self.login(password="Wrong-Pass1")), "invalid_credentials")
        fifth = self.login(password="Wrong-Pass1")
        self.assertEqual(error_code(fifth), "account_locked")
        self.assertGreater(fifth.json()["error"]["details"]["retry_after_seconds"], 14 * 60)
        self.assertEqual(error_code(self.login()), "account_locked")  # even with the right password
        self.assertTrue(ActivityLog.objects.filter(action="ACCOUNT_LOCKED", entity_id=user.id).exists())

        User.objects.filter(id=user.id).update(locked_until=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self.login().status_code, status.HTTP_200_OK)
        user.refresh_from_db()
        self.assertEqual((user.failed_attempts, user.locked_until), (0, None))

    def test_4c_deactivated_account(self):
        make_user(ROLE_CITIZEN, email="c@mail.sy", status=ACCOUNT_DISABLED)
        response = self.login()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(error_code(response), "account_disabled")

    def test_deactivated_account_with_wrong_password_reveals_nothing(self):
        make_user(ROLE_CITIZEN, email="c@mail.sy", status=ACCOUNT_DISABLED)
        self.assertEqual(error_code(self.login(password="Wrong-Pass1")), "invalid_credentials")


class LogoutTests(APITestCase):
    """UC-06 Log Out."""

    def test_logout_revokes_the_session(self):
        user = make_user(ROLE_CITIZEN, email="c@mail.sy")
        self.client.post(reverse("auth-login"), {"email": "c@mail.sy", "password": PASSWORD})
        response = self.client.post(reverse("auth-logout"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNotNone(UserSession.objects.get(user=user).revoked_at)
        self.assertEqual(self.client.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_2a_session_already_ended(self):
        self.assertEqual(self.client.post(reverse("auth-logout")).status_code, status.HTTP_401_UNAUTHORIZED)


class ChangePasswordTests(APITestCase):
    """UC-07 Change Password: main flow and alternatives 4a, 4b."""

    url = reverse("auth-change-password")

    def change(self, client, current=PASSWORD, new="Newer-Pass2"):
        data = {"current_password": current, "new_password": new, "new_password_confirmation": new}
        return client.post(self.url, data, format="json")

    def test_other_sessions_end_and_the_current_one_stays(self):
        make_user(ROLE_CITIZEN, email="c@mail.sy")
        laptop, phone = APIClient(), APIClient()
        for client in (laptop, phone):
            client.post(reverse("auth-login"), {"email": "c@mail.sy", "password": PASSWORD})
        self.assertEqual(self.change(laptop).status_code, status.HTTP_200_OK)
        self.assertEqual(laptop.get(reverse("auth-me")).status_code, status.HTTP_200_OK)
        self.assertEqual(phone.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_4a_incorrect_current_password(self):
        client = logged_in_client(make_user(ROLE_CITIZEN))
        self.assertEqual(error_code(self.change(client, current="Wrong-Pass1")), "incorrect_current_password")

    def test_4b_weak_or_same_as_current(self):
        client = logged_in_client(make_user(ROLE_CITIZEN))
        self.assertEqual(error_code(self.change(client, new="weak")), "weak_password")
        self.assertEqual(error_code(self.change(client, new=PASSWORD)), "password_same_as_current")


class EditProfileTests(APITestCase):
    """UC-08 Edit Profile: main flow and alternatives 4a, 4b, 4c."""

    url = reverse("auth-me")

    def test_email_and_phone_change_is_recorded_before_and_after(self):
        user = make_user(ROLE_CITIZEN, email="old@mail.sy")
        response = logged_in_client(user).patch(self.url, {"email": "New@Mail.sy"}, format="json")
        self.assertEqual(response.json()["data"]["user"]["email"], "new@mail.sy")
        log = ActivityLog.objects.get(action="PROFILE_UPDATED")
        self.assertEqual((log.old_value, log.new_value), ({"email": "old@mail.sy"}, {"email": "new@mail.sy"}))

    def test_4a_invalid_phone(self):
        client = logged_in_client(make_user(ROLE_CITIZEN))
        self.assertEqual(client.patch(self.url, {"phone": "123"}, format="json").status_code, 400)

    def test_4b_email_of_another_account(self):
        make_user(ROLE_CITIZEN, email="taken@mail.sy")
        client = logged_in_client(make_user(ROLE_CITIZEN))
        response = client.patch(self.url, {"email": "taken@mail.sy"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(error_code(response), "email_taken")

    def test_4c_fixed_fields_are_refused_on_the_server_and_recorded(self):
        user = make_user(ROLE_CITIZEN, full_name="Original")
        response = logged_in_client(user).patch(
            self.url, {"full_name": "Hacked", "role": ROLE_SYSTEM_ADMIN}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(error_code(response), "immutable_field")
        self.assertEqual(response.json()["error"]["details"]["fields"], ["full_name", "role"])
        user.refresh_from_db()
        self.assertEqual((user.full_name, user.role), ("Original", ROLE_CITIZEN))
        self.assertTrue(ActivityLog.objects.filter(action="UNAUTHORIZED_ACCESS_ATTEMPT", user=user).exists())

    def test_me_lists_the_identity_document_links_of_a_citizen(self):
        user = make_user(ROLE_CITIZEN)
        links = logged_in_client(user).get(self.url).json()["data"]["user"]["identity_documents"]
        self.assertEqual([link["side"] for link in links], ["FRONT", "BACK"])
        self.assertTrue(links[0]["url"].endswith(f"/api/v1/auth/users/{user.id}/identity-documents/front/"))
