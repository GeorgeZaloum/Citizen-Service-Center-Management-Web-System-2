from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User, UserSession
from apps.audit.models import ActivityLog
from apps.departments.models import Department
from shared.constants import ACCOUNT_DISABLED, ROLE_CITIZEN, ROLE_DEPT_MANAGER, ROLE_EMPLOYEE, ROLE_SYSTEM_ADMIN

from .helpers import PASSWORD, error_code, logged_in_client, make_department, make_user


class UserManagementTestCase(APITestCase):
    """Two departments, each with a manager and an employee, plus a citizen and the admin."""

    def setUp(self):
        self.municipality = make_department("Municipality")
        self.traffic = make_department("Traffic")
        self.admin = make_user(ROLE_SYSTEM_ADMIN)
        self.manager = make_user(ROLE_DEPT_MANAGER, department=self.municipality)
        self.employee = make_user(ROLE_EMPLOYEE, department=self.municipality)
        self.traffic_manager = make_user(ROLE_DEPT_MANAGER, department=self.traffic)
        self.traffic_employee = make_user(ROLE_EMPLOYEE, department=self.traffic)
        self.citizen = make_user(ROLE_CITIZEN)

    def staff_data(self, **overrides):
        data = {
            "role": ROLE_EMPLOYEE,
            "full_name": "New Clerk",
            "email": "clerk@csc.sy",
            "phone": "0944555666",
            "job_title": "Clerk",
            "password": PASSWORD,
            "password_confirmation": PASSWORD,
        }
        data.update(overrides)
        return data


class BrowseUsersTests(UserManagementTestCase):
    """UC-18 Browse Users."""

    url = reverse("users-list-create")

    def test_department_manager_sees_only_the_employees_of_their_department(self):
        users = logged_in_client(self.manager).get(self.url).json()["data"]["users"]
        self.assertEqual([user["id"] for user in users], [self.employee.id])

    def test_filters_cannot_widen_the_scope(self):
        client = logged_in_client(self.manager)
        response = client.get(self.url, {"department_id": self.traffic.id, "search": self.traffic_employee.email})
        self.assertEqual(response.json()["data"]["users"], [])

    def test_system_administrator_sees_everyone_with_pagination_and_filters(self):
        client = logged_in_client(self.admin)
        response = client.get(self.url, {"page_size": 50})
        self.assertEqual(response.json()["meta"]["pagination"]["total_items"], 6)
        traffic = client.get(self.url, {"department_id": self.traffic.id}).json()["data"]["users"]
        self.assertEqual({user["id"] for user in traffic}, {self.traffic_manager.id, self.traffic_employee.id})

    def test_4a_no_accounts_match(self):
        response = logged_in_client(self.admin).get(self.url, {"search": "nobody-matches"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.json()["data"]["users"], [])
        self.assertEqual(response.json()["meta"]["pagination"]["total_items"], 0)

    def test_citizens_and_employees_cannot_manage_accounts(self):
        for user in (self.citizen, self.employee):
            self.assertEqual(error_code(logged_in_client(user).get(self.url)), "permission_denied")


class CreateStaffAccountTests(UserManagementTestCase):
    """UC-04 Create Department Manager Account and UC-05 Create Employee Account."""

    url = reverse("users-list-create")

    def test_uc05_employee_joins_the_manager_department(self):
        response = logged_in_client(self.manager).post(self.url, self.staff_data(), format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        employee = User.objects.get(email="clerk@csc.sy")
        self.assertEqual(
            (employee.role, employee.department_id, employee.job_title), (ROLE_EMPLOYEE, self.municipality.id, "Clerk")
        )
        self.assertTrue(employee.check_password(PASSWORD))
        self.assertTrue(ActivityLog.objects.filter(action="STAFF_ACCOUNT_CREATED", entity_id=employee.id).exists())

    def test_uc05_4c_other_department_is_refused_and_recorded(self):
        data = self.staff_data(department_id=self.traffic.id)
        response = logged_in_client(self.manager).post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(error_code(response), "scope_violation")
        self.assertFalse(User.objects.filter(email="clerk@csc.sy").exists())
        self.assertTrue(ActivityLog.objects.filter(action="UNAUTHORIZED_ACCESS_ATTEMPT", user=self.manager).exists())

    def test_uc05_4a_4b_weak_password_and_taken_email(self):
        client = logged_in_client(self.manager)
        weak = self.staff_data(password="weak", password_confirmation="weak")
        self.assertEqual(error_code(client.post(self.url, weak, format="json")), "weak_password")
        taken = self.staff_data(email=self.employee.email)
        self.assertEqual(error_code(client.post(self.url, taken, format="json")), "email_taken")

    def test_department_manager_cannot_create_a_manager(self):
        data = self.staff_data(role=ROLE_DEPT_MANAGER)
        self.assertEqual(logged_in_client(self.manager).post(self.url, data, format="json").status_code, 403)

    def test_uc04_admin_creates_a_manager_alongside_the_existing_one(self):
        data = self.staff_data(role=ROLE_DEPT_MANAGER, department_id=self.traffic.id)
        response = logged_in_client(self.admin).post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(User.objects.filter(role=ROLE_DEPT_MANAGER, department=self.traffic).count(), 2)

    def test_uc04_department_must_be_given_and_active(self):
        client = logged_in_client(self.admin)
        missing = client.post(self.url, self.staff_data(role=ROLE_DEPT_MANAGER), format="json")
        self.assertIn("department_id", missing.json()["error"]["details"])
        suspended = make_department("Old Office", Department.STATUS_SUSPENDED)
        data = self.staff_data(role=ROLE_DEPT_MANAGER, department_id=suspended.id)
        self.assertEqual(error_code(client.post(self.url, data, format="json")), "department_not_active")

    def test_uc04_2a_no_active_department(self):
        Department.objects.update(status=Department.STATUS_SUSPENDED)
        data = self.staff_data(role=ROLE_DEPT_MANAGER, department_id=self.traffic.id)
        response = logged_in_client(self.admin).post(self.url, data, format="json")
        self.assertEqual(error_code(response), "no_active_department")

    def test_uc04_4b_email_of_another_manager_suggests_a_transfer(self):
        data = self.staff_data(
            role=ROLE_DEPT_MANAGER, department_id=self.municipality.id, email=self.traffic_manager.email
        )
        response = logged_in_client(self.admin).post(self.url, data, format="json")
        self.assertEqual(error_code(response), "email_taken")
        self.assertEqual(response.json()["error"]["details"]["existing_manager_id"], self.traffic_manager.id)

    def test_nobody_creates_employees_from_the_admin_side_or_system_administrators(self):
        client = logged_in_client(self.admin)
        employee = self.staff_data(department_id=self.traffic.id)
        self.assertEqual(client.post(self.url, employee, format="json").status_code, 403)
        admin = self.staff_data(role=ROLE_SYSTEM_ADMIN)
        self.assertEqual(client.post(self.url, admin, format="json").status_code, 400)


class EditStaffAccountTests(UserManagementTestCase):
    """UC-15 Edit Employee or Manager Data."""

    def url(self, user):
        return reverse("user-detail", args=[user.id])

    def test_changes_are_recorded_before_and_after(self):
        response = logged_in_client(self.manager).patch(
            self.url(self.employee), {"full_name": "Renamed", "job_title": "Senior"}, format="json"
        )
        self.assertEqual(response.json()["data"]["user"]["full_name"], "Renamed")
        log = ActivityLog.objects.get(action="STAFF_ACCOUNT_UPDATED")
        self.assertEqual(log.new_value, {"full_name": "Renamed", "job_title": "Senior"})

    def test_4a_invalid_fields(self):
        response = logged_in_client(self.manager).patch(
            self.url(self.employee), {"email": "bad", "phone": "123"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.json()["error"]["details"]), {"email", "phone"})

    def test_4b_email_or_phone_of_another_account(self):
        client = logged_in_client(self.manager)
        email = client.patch(self.url(self.employee), {"email": self.citizen.email}, format="json")
        self.assertEqual(email.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(error_code(email), "email_taken")
        phone = client.patch(self.url(self.employee), {"phone": self.traffic_employee.phone}, format="json")
        self.assertEqual(error_code(phone), "phone_taken")

    def test_department_cannot_be_changed_here(self):
        response = logged_in_client(self.admin).patch(
            self.url(self.employee), {"department_id": self.traffic.id}, format="json"
        )
        self.assertEqual(error_code(response), "immutable_field")
        self.employee.refresh_from_db()
        self.assertEqual(self.employee.department_id, self.municipality.id)

    def test_system_administrator_cannot_edit_citizens(self):
        response = logged_in_client(self.admin).patch(self.url(self.citizen), {"full_name": "X"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class ResetPasswordTests(UserManagementTestCase):
    """UC-03 Reset User Password."""

    def reset(self, client, user, password="Reset-Pass9"):
        data = {"new_password": password, "new_password_confirmation": password}
        return client.post(reverse("user-reset-password", args=[user.id]), data, format="json")

    def test_reset_ends_all_sessions_and_the_new_password_works(self):
        employee_client = logged_in_client(self.employee)
        self.assertEqual(self.reset(logged_in_client(self.manager), self.employee).status_code, 200)
        self.assertEqual(employee_client.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertFalse(UserSession.objects.filter(user=self.employee, revoked_at__isnull=True).exists())
        login = {"email": self.employee.email, "password": "Reset-Pass9"}
        self.assertEqual(APIClient().post(reverse("auth-login"), login).status_code, 200)

    def test_4a_weak_password(self):
        self.assertEqual(error_code(self.reset(logged_in_client(self.manager), self.employee, "weak")), "weak_password")

    def test_system_administrator_resets_managers_and_citizens_but_not_employees(self):
        client = logged_in_client(self.admin)
        self.assertEqual(self.reset(client, self.manager).status_code, 200)
        self.assertEqual(self.reset(client, self.citizen).status_code, 200)
        self.assertEqual(self.reset(client, self.employee).status_code, 403)


class AccountStatusTests(UserManagementTestCase):
    """UC-16 Deactivate and Activate Account."""

    def set_status(self, client, user, new_status, reason=""):
        url = reverse("user-status", args=[user.id])
        return client.patch(url, {"status": new_status, "reason": reason}, format="json")

    def test_deactivated_user_is_logged_out_and_cannot_log_in(self):
        employee_client = logged_in_client(self.employee)
        response = self.set_status(logged_in_client(self.manager), self.employee, ACCOUNT_DISABLED, "Left")
        self.assertEqual(response.json()["data"]["user"]["status"], ACCOUNT_DISABLED)
        self.assertEqual(employee_client.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)
        login = APIClient().post(reverse("auth-login"), {"email": self.employee.email, "password": PASSWORD})
        self.assertEqual(error_code(login), "account_disabled")
        log = ActivityLog.objects.get(action="ACCOUNT_DEACTIVATED")
        self.assertEqual(log.new_value["reason"], "Left")

    def test_reason_is_required_and_own_account_is_refused(self):
        client = logged_in_client(self.admin)
        self.assertIn("reason", self.set_status(client, self.citizen, ACCOUNT_DISABLED).json()["error"]["details"])
        own = self.set_status(client, self.admin, ACCOUNT_DISABLED, "x")
        self.assertEqual(error_code(own), "self_action_forbidden")

    def test_1a_reactivation_and_invalid_transitions(self):
        client = logged_in_client(self.admin)
        self.assertEqual(error_code(self.set_status(client, self.citizen, "ACTIVE")), "invalid_state_transition")
        self.set_status(client, self.citizen, ACCOUNT_DISABLED, "Fraud")
        self.assertEqual(self.set_status(client, self.citizen, "ACTIVE").status_code, 200)

    def test_staff_without_department_must_be_transferred_before_activation(self):
        orphan = make_user(ROLE_DEPT_MANAGER, status=ACCOUNT_DISABLED)
        response = self.set_status(logged_in_client(self.admin), orphan, "ACTIVE")
        self.assertEqual(error_code(response), "department_required")


class TransferTests(UserManagementTestCase):
    """UC-17 Transfer Employee or Manager Between Departments."""

    def transfer(self, client, user, department):
        return client.post(reverse("user-transfer", args=[user.id]), {"department_id": department.id}, format="json")

    def test_transfer_moves_the_scope_and_keeps_history_with_the_old_department(self):
        response = self.transfer(logged_in_client(self.admin), self.employee, self.traffic)
        self.assertEqual(response.json()["data"]["user"]["department"]["id"], self.traffic.id)
        old_view = logged_in_client(self.manager).get(reverse("users-list-create")).json()["data"]["users"]
        new_view = logged_in_client(self.traffic_manager).get(reverse("users-list-create")).json()["data"]["users"]
        self.assertNotIn(self.employee.id, [user["id"] for user in old_view])
        self.assertIn(self.employee.id, [user["id"] for user in new_view])
        log = ActivityLog.objects.get(action="ACCOUNT_TRANSFERRED")
        self.assertEqual(log.department_id, self.municipality.id)

    def test_same_or_suspended_department_is_refused(self):
        client = logged_in_client(self.admin)
        self.assertEqual(self.transfer(client, self.employee, self.municipality).status_code, 400)
        suspended = make_department("Old Office", Department.STATUS_SUSPENDED)
        self.assertEqual(error_code(self.transfer(client, self.employee, suspended)), "department_not_active")

    def test_2a_no_other_active_department(self):
        self.traffic.status = Department.STATUS_SUSPENDED
        self.traffic.save()
        response = self.transfer(logged_in_client(self.admin), self.employee, self.traffic)
        self.assertEqual(error_code(response), "no_other_active_department")

    def test_only_the_system_administrator_transfers(self):
        response = self.transfer(logged_in_client(self.manager), self.employee, self.traffic)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
