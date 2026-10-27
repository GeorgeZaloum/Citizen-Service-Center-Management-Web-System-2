from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.models import User
from apps.audit.models import ActivityLog
from shared.constants import ROLE_CITIZEN, ROLE_DEPT_MANAGER, ROLE_EMPLOYEE, ROLE_SYSTEM_ADMIN

from .helpers import PASSWORD, image_file, logged_in_client, make_department, make_user


class IdentityDocumentTests(APITestCase):
    """ID card images: only the citizen and the System Administrator, never a public URL."""

    def setUp(self):
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
        APIClient().post(reverse("auth-register"), data, format="multipart")
        self.citizen = User.objects.get(email="rana@mail.sy")

    def url(self, side="front"):
        return reverse("user-identity-document", args=[self.citizen.id, side])

    def test_citizen_downloads_both_sides(self):
        client = logged_in_client(self.citizen)
        front = client.get(self.url())
        self.assertEqual(front.status_code, status.HTTP_200_OK)
        self.assertEqual((front["Content-Type"], front["Cache-Control"]), ("image/png", "private, no-store"))
        self.assertTrue(b"".join(front.streaming_content).startswith(b"\x89PNG"))
        self.assertEqual(client.get(self.url("back"))["Content-Type"], "image/jpeg")

    def test_system_administrator_downloads(self):
        self.assertEqual(logged_in_client(make_user(ROLE_SYSTEM_ADMIN)).get(self.url()).status_code, 200)

    def test_everyone_else_gets_not_found_and_the_attempt_is_recorded(self):
        department = make_department()
        for user in (
            make_user(ROLE_CITIZEN),
            make_user(ROLE_EMPLOYEE, department=department),
            make_user(ROLE_DEPT_MANAGER, department=department),
        ):
            self.assertEqual(logged_in_client(user).get(self.url()).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(ActivityLog.objects.filter(action="UNAUTHORIZED_ACCESS_ATTEMPT").count(), 3)

    def test_unknown_side_and_anonymous_requests(self):
        self.assertEqual(logged_in_client(self.citizen).get(self.url("middle")).status_code, 404)
        self.assertEqual(APIClient().get(self.url()).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_media_folder_is_not_served(self):
        path = self.citizen.identity_documents.first().file_path.name
        self.assertEqual(APIClient().get(f"/media/{path}").status_code, status.HTTP_404_NOT_FOUND)
