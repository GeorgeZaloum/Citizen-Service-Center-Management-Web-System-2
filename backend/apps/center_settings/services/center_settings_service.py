from django.db import transaction

from apps.audit.models import ActivityLog
from apps.audit.services import AuditService
from apps.center_settings.models import SINGLETON_ID, CenterSettings
from apps.center_settings.repositories import CenterSettingsRepository
from shared.exceptions import ValidationFailed
from shared.utils import changed_values, snapshot

CENTER_FIELDS = ["name", "address", "contact_phones", "work_start", "work_end"]


class CenterSettingsService:
    """UC-19 Configure Center Information (FR-SET-01)."""

    @staticmethod
    @transaction.atomic
    def update(*, actor, attrs, ip=None):
        """Save the center information shown on the public pages and the "Forgot password"
        screen, recording the values before and after the change."""
        if attrs["work_end"] <= attrs["work_start"]:
            raise ValidationFailed(
                "The working hours must end after they start.",
                code="invalid_working_hours",
                details={"work_end": ["The working hours must end after they start."]},
            )
        current = CenterSettingsRepository.get()
        before = snapshot(current, CENTER_FIELDS) if current else {}
        settings_row = current or CenterSettings()
        for field in CENTER_FIELDS:
            value = attrs[field]
            setattr(settings_row, field, value.strip() if isinstance(value, str) else value)

        old_value, new_value = changed_values(before, snapshot(settings_row, CENTER_FIELDS))
        if new_value:
            CenterSettingsRepository.save(settings_row)
            AuditService.log(
                action=ActivityLog.ACTION_CENTER_SETTINGS_UPDATED,
                entity_type="center_settings",
                entity_id=SINGLETON_ID,
                actor=actor,
                old_value=old_value if current else None,
                new_value=new_value,
                ip=ip,
            )
        return settings_row
