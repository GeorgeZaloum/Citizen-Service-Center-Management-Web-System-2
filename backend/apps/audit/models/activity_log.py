from django.core.serializers.json import DjangoJSONEncoder
from django.db import models

from shared.exceptions import PermissionDeniedDomain


class ImmutableLogError(PermissionDeniedDomain):
    default_code = "audit_log_immutable"
    default_detail = "Activity log entries cannot be modified or deleted."


class ActivityLogQuerySet(models.QuerySet):
    """Bulk changes are refused like single ones (FR-LOG-05)."""

    def update(self, **kwargs):
        raise ImmutableLogError()

    def delete(self):
        raise ImmutableLogError()

    def bulk_update(self, objs, fields, batch_size=None):
        raise ImmutableLogError()


class ActivityLog(models.Model):
    """Append-only record of operations (ERD `activity_logs`).

    Nobody can change or delete an entry, the System Administrator included: the model
    and the queryset refuse it, and a PostgreSQL trigger refuses it even from raw SQL.
    `department_id` is a plain number (not a foreign key) so the history of a deleted
    department stays, and the work of a transferred account stays with its old department.
    """

    ACTION_CITIZEN_REGISTERED = "CITIZEN_REGISTERED"
    ACTION_LOGIN_SUCCEEDED = "LOGIN_SUCCEEDED"
    ACTION_ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    ACTION_LOGGED_OUT = "LOGGED_OUT"
    ACTION_PASSWORD_CHANGED = "PASSWORD_CHANGED"
    ACTION_PROFILE_UPDATED = "PROFILE_UPDATED"
    ACTION_PASSWORD_RESET = "PASSWORD_RESET"
    ACTION_STAFF_ACCOUNT_CREATED = "STAFF_ACCOUNT_CREATED"
    ACTION_STAFF_ACCOUNT_UPDATED = "STAFF_ACCOUNT_UPDATED"
    ACTION_ACCOUNT_DEACTIVATED = "ACCOUNT_DEACTIVATED"
    ACTION_ACCOUNT_ACTIVATED = "ACCOUNT_ACTIVATED"
    ACTION_ACCOUNT_TRANSFERRED = "ACCOUNT_TRANSFERRED"
    ACTION_DEPARTMENT_CREATED = "DEPARTMENT_CREATED"
    ACTION_DEPARTMENT_UPDATED = "DEPARTMENT_UPDATED"
    ACTION_DEPARTMENT_SUSPENDED = "DEPARTMENT_SUSPENDED"
    ACTION_DEPARTMENT_ACTIVATED = "DEPARTMENT_ACTIVATED"
    ACTION_DEPARTMENT_ARCHIVED = "DEPARTMENT_ARCHIVED"
    ACTION_DEPARTMENT_DELETED = "DEPARTMENT_DELETED"
    ACTION_MANAGER_REMOVED = "MANAGER_REMOVED"
    ACTION_CENTER_SETTINGS_UPDATED = "CENTER_SETTINGS_UPDATED"
    ACTION_UNAUTHORIZED_ACCESS = "UNAUTHORIZED_ACCESS_ATTEMPT"

    user = models.ForeignKey(
        "accounts.User", on_delete=models.PROTECT, null=True, blank=True, related_name="activity_logs"
    )
    action = models.CharField(max_length=100)
    entity_type = models.CharField(max_length=50)
    entity_id = models.BigIntegerField(null=True, blank=True)
    old_value = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    new_value = models.JSONField(null=True, blank=True, encoder=DjangoJSONEncoder)
    department_id = models.BigIntegerField(null=True, blank=True, db_index=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    objects = ActivityLogQuerySet.as_manager()

    class Meta:
        db_table = "activity_logs"
        ordering = ["-created_at", "-id"]

    def __str__(self):
        return f"ActivityLog<{self.action}:{self.entity_type}:{self.entity_id}>"

    def save(self, *args, **kwargs):
        if not self._state.adding:
            raise ImmutableLogError()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        raise ImmutableLogError()
