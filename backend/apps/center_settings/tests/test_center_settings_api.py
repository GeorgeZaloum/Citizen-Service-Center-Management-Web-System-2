from django.db import IntegrityError, connection, transaction
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from apps.accounts.tests.helpers import error_code, logged_in_client, make_department, make_user
from apps.audit.models import ActivityLog
from apps.center_settings.models import CenterSettings
from shared.constants import ROLE_CITIZEN, ROLE_DEPT_MANAGER, ROLE_SYSTEM_ADMIN

DATA = {
    "name": "Jaramana Center",
    "address": "Main Street",
    "contact_phones": "011-5555555",
    "work_start": "08:00",
    "work_end": "14:00",
}


class CenterSettingsTests(APITestCase):
    """UC-19 Configure Center Information: main flow and alternative 4a."""

    url = reverse("center-settings")

    def setUp(self):
        self.admin_client = logged_in_client(make_user(ROLE_SYSTEM_ADMIN))

    def test_saved_information_is_shown_to_visitors_and_recorded(self):
        response = self.admin_client.put(self.url, DATA, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(APIClient().get(self.url).json()["data"]["center_settings"], DATA)
        log = ActivityLog.objects.get(action="CENTER_SETTINGS_UPDATED")
        self.assertIsNone(log.old_value)

    def test_a_change_records_only_the_changed_values(self):
        self.admin_client.put(self.url, DATA, format="json")
        self.admin_client.put(self.url, {**DATA, "work_end": "15:00"}, format="json")
        self.admin_client.put(self.url, {**DATA, "work_end": "15:00"}, format="json")  # no change, no entry
        logs = ActivityLog.objects.filter(action="CENTER_SETTINGS_UPDATED").order_by("id")
        self.assertEqual(logs.count(), 2)
        self.assertEqual((logs[1].old_value, logs[1].new_value), ({"work_end": "14:00:00"}, {"work_end": "15:00:00"}))

    def test_4a_missing_fields_and_reversed_hours(self):
        missing = self.admin_client.put(self.url, {"name": "X"}, format="json")
        self.assertTrue(
            {"address", "contact_phones", "work_start", "work_end"} <= set(missing.json()["error"]["details"])
        )
        reversed_hours = self.admin_client.put(self.url, {**DATA, "work_end": "07:00"}, format="json")
        self.assertEqual(error_code(reversed_hours), "invalid_working_hours")

    def test_only_the_system_administrator_configures(self):
        manager = make_user(ROLE_DEPT_MANAGER, department=make_department())
        for client in (logged_in_client(manager), logged_in_client(make_user(ROLE_CITIZEN))):
            self.assertEqual(client.put(self.url, DATA, format="json").status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(APIClient().put(self.url, DATA, format="json").status_code, status.HTTP_401_UNAUTHORIZED)

    def test_defaults_before_the_first_configuration(self):
        self.assertEqual(APIClient().get(self.url).json()["data"]["center_settings"]["name"], "Citizen Service Center")

    def test_database_keeps_a_single_row(self):
        CenterSettings.defaults().save()
        with self.assertRaises(IntegrityError), transaction.atomic():
            connection.cursor().execute(
                "INSERT INTO center_settings (id, name, address, contact_phones, work_start, work_end)"
                " VALUES (2, 'x', 'x', 'x', '08:00', '09:00')"
            )
