from apps.audit.models import ActivityLog
from apps.audit.repositories import ActivityLogRepository
from shared.utils import json_ready


class AuditService:
    """Every service records its sensitive operations here, explicitly (FR-LOG-01, FR-LOG-02).

    An explicit call (not Django signals) because only the service knows the actor, the
    reason and the values before and after the change, and the entry then joins the same
    database transaction as the change itself.
    """

    @staticmethod
    def log(
        *, action, entity_type, entity_id=None, actor=None, department_id=None, old_value=None, new_value=None, ip=None
    ):
        return ActivityLogRepository.create(
            user=actor if actor is not None and actor.is_authenticated else None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            department_id=department_id,
            old_value=json_ready(old_value),
            new_value=json_ready(new_value),
            ip_address=ip,
        )

    @staticmethod
    def log_unauthorized(*, actor, entity_type, entity_id, reason, ip=None):
        """A rejected out-of-scope or tampered request (UC-03 4b, UC-05 4c, UC-08 4c ...).

        Callers record it before raising and outside any transaction, so the entry stays
        even though the operation itself does not happen.
        """
        return AuditService.log(
            action=ActivityLog.ACTION_UNAUTHORIZED_ACCESS,
            entity_type=entity_type,
            entity_id=entity_id,
            actor=actor,
            department_id=getattr(actor, "department_id", None),
            new_value={"reason": reason},
            ip=ip,
        )
