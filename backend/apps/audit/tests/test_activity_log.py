from datetime import time

from django.contrib.admin.sites import site
from django.db import DatabaseError, connection, transaction
from django.test import RequestFactory, TestCase

from apps.accounts.tests.helpers import make_user
from apps.audit.models import ActivityLog, ImmutableLogError
from apps.audit.services import AuditService
from shared.constants import ROLE_SYSTEM_ADMIN


class AuditServiceTests(TestCase):
    """FR-LOG-01 / FR-LOG-02: one entry per operation, with the values before and after."""

    def test_entry_keeps_actor_values_and_address(self):
        admin = make_user(ROLE_SYSTEM_ADMIN)
        AuditService.log(
            action=ActivityLog.ACTION_CENTER_SETTINGS_UPDATED,
            entity_type="center_settings",
            entity_id=1,
            actor=admin,
            old_value={"work_start": time(8, 0)},
            new_value={"work_start": time(9, 0)},
            ip="10.0.0.9",
        )
        entry = ActivityLog.objects.get()
        self.assertEqual((entry.user_id, entry.ip_address), (admin.id, "10.0.0.9"))
        self.assertEqual((entry.old_value, entry.new_value), ({"work_start": "08:00:00"}, {"work_start": "09:00:00"}))

    def test_anonymous_events_have_no_user(self):
        AuditService.log(action=ActivityLog.ACTION_ACCOUNT_LOCKED, entity_type="user", entity_id=5)
        self.assertIsNone(ActivityLog.objects.get().user_id)


class ImmutabilityTests(TestCase):
    """FR-LOG-05: nobody can change or delete an entry, on any of the three levels."""

    def setUp(self):
        self.entry = ActivityLog.objects.create(action="DEPARTMENT_CREATED", entity_type="department", entity_id=1)

    def test_model_refuses_changes_and_deletion(self):
        self.entry.action = "FORGED"
        with self.assertRaises(ImmutableLogError):
            self.entry.save()
        with self.assertRaises(ImmutableLogError):
            self.entry.delete()
        self.assertEqual(ActivityLog.objects.get().action, "DEPARTMENT_CREATED")

    def test_queryset_refuses_bulk_changes(self):
        with self.assertRaises(ImmutableLogError):
            ActivityLog.objects.update(action="FORGED")
        with self.assertRaises(ImmutableLogError):
            ActivityLog.objects.all().delete()
        self.assertEqual(ActivityLog.objects.count(), 1)

    def test_database_refuses_raw_update_and_delete(self):
        for sql in ("UPDATE activity_logs SET action = 'FORGED'", "DELETE FROM activity_logs"):
            with self.assertRaisesMessage(DatabaseError, "append-only"), transaction.atomic():
                connection.cursor().execute(sql)
        self.assertEqual(ActivityLog.objects.get().action, "DEPARTMENT_CREATED")

    def test_admin_site_is_read_only_even_for_the_system_administrator(self):
        request = RequestFactory().get("/")
        request.user = make_user(ROLE_SYSTEM_ADMIN)
        model_admin = site._registry[ActivityLog]
        self.assertFalse(model_admin.has_add_permission(request))
        self.assertFalse(model_admin.has_change_permission(request))
        self.assertFalse(model_admin.has_delete_permission(request))


class TruncateTests(TestCase):
    """Separate class: a row inserted in the same transaction would make PostgreSQL refuse
    TRUNCATE before the trigger runs."""

    def test_database_refuses_truncate(self):
        with self.assertRaisesMessage(DatabaseError, "append-only"), transaction.atomic():
            connection.cursor().execute("TRUNCATE activity_logs")
