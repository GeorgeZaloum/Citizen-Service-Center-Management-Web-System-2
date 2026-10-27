from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.audit.models import ActivityLog
from shared.constants import ROLE_DEPT_MANAGER, ROLE_EMPLOYEE

from .helpers import PASSWORD, error_code, logged_in_client, make_department, make_user


class DepartmentIsolationTests(APITestCase):
    """FR-USR-08: a Department Manager cannot reach another department's accounts, even by
    editing the id in the request by hand."""

    def setUp(self):
        municipality, traffic = make_department("Municipality"), make_department("Traffic")
        self.manager = make_user(ROLE_DEPT_MANAGER, department=municipality)
        self.peer_manager = make_user(ROLE_DEPT_MANAGER, department=municipality)
        self.stranger = make_user(ROLE_EMPLOYEE, department=traffic, full_name="Stranger")
        self.client = logged_in_client(self.manager)

    def test_every_operation_on_another_department_answers_not_found(self):
        requests = [
            ("get", "user-detail", None),
            ("patch", "user-detail", {"full_name": "X"}),
            (
                "post",
                "user-reset-password",
                {"new_password": "Reset-Pass9", "new_password_confirmation": "Reset-Pass9"},
            ),
            ("patch", "user-status", {"status": "DISABLED", "reason": "x"}),
        ]
        for method, name, data in requests:
            response = getattr(self.client, method)(reverse(name, args=[self.stranger.id]), data, format="json")
            self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND, name)
            self.assertEqual(error_code(response), "not_found")

        self.stranger.refresh_from_db()
        self.assertEqual((self.stranger.full_name, self.stranger.status), ("Stranger", "ACTIVE"))
        self.assertTrue(self.stranger.check_password(PASSWORD))
        self.assertEqual(ActivityLog.objects.filter(action="UNAUTHORIZED_ACCESS_ATTEMPT").count(), 3)

    def test_other_managers_of_the_same_department_are_out_of_scope(self):
        url = reverse("user-status", args=[self.peer_manager.id])
        response = self.client.patch(url, {"status": "DISABLED", "reason": "x"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonymous_requests_need_authentication(self):
        self.client.logout()
        response = self.client.get(reverse("users-list-create"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(response.json()["error"]["type"], "authentication_error")
