from unittest import mock

from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.tests.helpers import PASSWORD, error_code, logged_in_client, make_department, make_user
from apps.audit.models import ActivityLog
from apps.departments.models import Department
from shared.constants import ACCOUNT_DISABLED, ROLE_DEPT_MANAGER, ROLE_EMPLOYEE, ROLE_SYSTEM_ADMIN


class DepartmentTestCase(APITestCase):
    def setUp(self):
        self.municipality = make_department("Municipality")
        self.traffic = make_department("Traffic")
        self.manager = make_user(ROLE_DEPT_MANAGER, department=self.municipality)
        self.employee = make_user(ROLE_EMPLOYEE, department=self.municipality)
        self.traffic_manager = make_user(ROLE_DEPT_MANAGER, department=self.traffic)
        self.admin = make_user(ROLE_SYSTEM_ADMIN)
        self.client = logged_in_client(self.admin)

    def detail_url(self, department):
        return reverse("departments-detail", args=[department.id])

    def set_status(self, department, new_status):
        return self.client.patch(
            reverse("departments-status", args=[department.id]), {"status": new_status}, format="json"
        )


class BrowseDepartmentsTests(DepartmentTestCase):
    """UC-14 Browse Departments."""

    url = reverse("departments-list-create")

    def test_list_shows_managers_and_counts_and_hides_archived(self):
        make_department("Closed Office", Department.STATUS_ARCHIVED)
        departments = self.client.get(self.url).json()["data"]["departments"]
        self.assertEqual([d["name"] for d in departments], ["Municipality", "Traffic"])
        self.assertEqual([m["id"] for m in departments[0]["managers"]], [self.manager.id])
        self.assertEqual((departments[0]["employee_count"], departments[0]["service_count"]), (1, 0))

    def test_2a_filter_by_status_and_no_match(self):
        make_department("Closed Office", Department.STATUS_ARCHIVED)
        archived = self.client.get(self.url, {"status": "ARCHIVED"}).json()["data"]["departments"]
        self.assertEqual([d["name"] for d in archived], ["Closed Office"])
        self.assertEqual(self.client.get(self.url, {"search": "nothing"}).json()["data"]["departments"], [])

    def test_department_page_lists_members_and_actions(self):
        data = self.client.get(self.detail_url(self.municipality)).json()["data"]["department"]
        self.assertEqual([e["id"] for e in data["employees"]], [self.employee.id])
        self.assertEqual(data["actions"], ["EDIT", "SUSPEND", "ADD_MANAGER", "REMOVE_MANAGER"])

    def test_only_the_system_administrator_manages_departments(self):
        for user in (self.manager, self.employee):
            self.assertEqual(error_code(logged_in_client(user).get(self.url)), "permission_denied")


class CreateDepartmentTests(DepartmentTestCase):
    """UC-09 Create Department."""

    url = reverse("departments-list-create")

    def test_new_department_is_active_and_without_a_manager(self):
        data = {"name": "Civil Registry", "authority": "Civil Registry", "description": "Records"}
        response = self.client.post(self.url, data, format="json")
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        department = response.json()["data"]["department"]
        self.assertEqual((department["status"], department["has_managers"]), ("ACTIVE", False))
        self.assertTrue(ActivityLog.objects.filter(action="DEPARTMENT_CREATED", entity_id=department["id"]).exists())

    def test_4a_missing_fields(self):
        response = self.client.post(self.url, {"description": "x"}, format="json")
        self.assertEqual(set(response.json()["error"]["details"]), {"name", "authority"})

    def test_4b_name_taken_ignoring_case_even_by_an_archived_department(self):
        make_department("Closed Office", Department.STATUS_ARCHIVED)
        for name in ("TRAFFIC", "closed office"):
            response = self.client.post(self.url, {"name": name, "authority": "x"}, format="json")
            self.assertEqual(error_code(response), "department_name_taken")


class EditDepartmentTests(DepartmentTestCase):
    """UC-10 Edit Department."""

    def test_edit_keeps_members_and_records_before_and_after(self):
        response = self.client.patch(self.detail_url(self.municipality), {"name": "City Council"}, format="json")
        self.assertEqual(response.json()["data"]["department"]["name"], "City Council")
        self.assertEqual(response.json()["data"]["department"]["managers"][0]["id"], self.manager.id)
        log = ActivityLog.objects.get(action="DEPARTMENT_UPDATED")
        self.assertEqual((log.old_value, log.new_value), ({"name": "Municipality"}, {"name": "City Council"}))

    def test_4a_missing_fields(self):
        response = self.client.patch(self.detail_url(self.municipality), {"name": "", "authority": ""}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(set(response.json()["error"]["details"]), {"name", "authority"})
        self.municipality.refresh_from_db()
        self.assertEqual(self.municipality.name, "Municipality")

    def test_4b_name_of_another_department(self):
        response = self.client.patch(self.detail_url(self.municipality), {"name": "traffic"}, format="json")
        self.assertEqual(error_code(response), "department_name_taken")

    def test_archived_department_cannot_be_edited(self):
        archived = make_department("Closed Office", Department.STATUS_ARCHIVED)
        response = self.client.patch(self.detail_url(archived), {"name": "New"}, format="json")
        self.assertEqual(error_code(response), "department_archived")


class SuspendActivateTests(DepartmentTestCase):
    """UC-11 Suspend and Activate Department."""

    def test_suspend_then_activate(self):
        suspended = self.set_status(self.municipality, "SUSPENDED").json()["data"]["department"]
        self.assertEqual(suspended["status"], "SUSPENDED")
        self.assertIn("DELETE", suspended["actions"])
        self.assertEqual(self.set_status(self.municipality, "ACTIVE").json()["data"]["department"]["status"], "ACTIVE")
        self.assertEqual(
            list(ActivityLog.objects.order_by("id").values_list("action", flat=True)),
            ["DEPARTMENT_SUSPENDED", "DEPARTMENT_ACTIVATED"],
        )

    def test_employees_of_a_suspended_department_can_still_log_in(self):
        self.set_status(self.municipality, "SUSPENDED")
        login = APIClient().post(reverse("auth-login"), {"email": self.employee.email, "password": PASSWORD})
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_status_must_actually_change(self):
        self.assertEqual(error_code(self.set_status(self.municipality, "ACTIVE")), "invalid_state_transition")


class DeleteArchiveTests(DepartmentTestCase):
    """UC-12 Delete or Archive Department."""

    def setUp(self):
        super().setUp()
        self.old = make_department("Old Registry", Department.STATUS_SUSPENDED)

    def delete(self, department, confirm_name):
        return self.client.delete(self.detail_url(department), {"confirm_name": confirm_name}, format="json")

    def test_deletion_keeps_deactivated_accounts_without_their_department(self):
        former = make_user(ROLE_EMPLOYEE, department=self.old, status=ACCOUNT_DISABLED)
        response = self.delete(self.old, "Old Registry")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(Department.objects.filter(id=self.old.id).exists())
        former.refresh_from_db()
        self.assertEqual((former.department_id, former.status), (None, ACCOUNT_DISABLED))
        self.assertEqual(ActivityLog.objects.get(action="DEPARTMENT_DELETED").department_id, self.old.id)

    def test_active_department_must_be_suspended_first(self):
        self.assertEqual(error_code(self.delete(self.municipality, "Municipality")), "department_not_suspended")

    def test_2a_active_accounts_are_listed(self):
        clerk = make_user(ROLE_EMPLOYEE, department=self.old)
        response = self.delete(self.old, "Old Registry")
        self.assertEqual(error_code(response), "department_has_active_accounts")
        self.assertEqual([a["id"] for a in response.json()["error"]["details"]["accounts"]], [clerk.id])

    def test_2b_department_with_requests_is_archived_not_deleted(self):
        with mock.patch("apps.departments.services.department_service.count_requests", return_value=3):
            self.assertEqual(error_code(self.delete(self.old, "Old Registry")), "department_has_requests")
            response = self.client.post(reverse("departments-archive", args=[self.old.id]))
        self.assertEqual(response.json()["data"]["department"]["status"], "ARCHIVED")

    def test_department_without_requests_is_deleted_not_archived(self):
        response = self.client.post(reverse("departments-archive", args=[self.old.id]))
        self.assertEqual(error_code(response), "department_has_no_requests")

    def test_4a_typed_name_must_match_exactly(self):
        response = self.delete(self.old, "old registry")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(error_code(response), "confirmation_mismatch")
        self.assertTrue(Department.objects.filter(id=self.old.id).exists())


class RemoveManagerTests(DepartmentTestCase):
    """UC-13 Remove Manager from Department."""

    def remove(self, user, **data):
        url = reverse("departments-remove-manager", args=[self.municipality.id, user.id])
        return self.client.post(url, data, format="json")

    def test_deactivation_unlinks_the_manager_and_ends_their_access(self):
        manager_client = logged_in_client(self.manager)
        data = self.remove(self.manager, mode="DEACTIVATE").json()["data"]
        self.assertTrue(data["left_without_manager"])
        self.assertFalse(data["department"]["has_managers"])
        self.manager.refresh_from_db()
        self.assertEqual((self.manager.department_id, self.manager.status), (None, ACCOUNT_DISABLED))
        self.assertEqual(manager_client.get(reverse("auth-me")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertTrue(ActivityLog.objects.filter(action="MANAGER_REMOVED").exists())

    def test_3a_transfer_to_another_department(self):
        response = self.remove(self.manager, mode="TRANSFER", target_department_id=self.traffic.id)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.manager.refresh_from_db()
        self.assertEqual(self.manager.department_id, self.traffic.id)
        self.assertTrue(ActivityLog.objects.filter(action="ACCOUNT_TRANSFERRED").exists())

    def test_transfer_needs_a_target_and_only_managers_can_be_removed(self):
        self.assertEqual(self.remove(self.manager, mode="TRANSFER").status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(self.remove(self.employee, mode="DEACTIVATE").status_code, status.HTTP_404_NOT_FOUND)
