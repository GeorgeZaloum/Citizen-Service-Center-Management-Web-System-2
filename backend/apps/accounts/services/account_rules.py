from apps.accounts.repositories import UserRepository
from apps.audit.services import AuditService
from shared.exceptions import BusinessRuleViolation, PermissionDeniedDomain


def ensure_contact_available(*, email, phone, exclude_id=None):
    """Email and phone are unique across all accounts (ERD)."""
    taken = UserRepository.taken_fields(email=email, phone=phone, exclude_id=exclude_id)
    if "email" in taken:
        raise BusinessRuleViolation(
            "The email is used by another account.",
            code="email_taken",
            details={"email": ["The email is used by another account."]},
        )
    if "phone" in taken:
        raise BusinessRuleViolation(
            "The phone number is used by another account.",
            code="phone_taken",
            details={"phone": ["The phone number is used by another account."]},
        )


def reject_fixed_fields(*, actor, target_id, submitted_fields, editable_fields, ip=None):
    """Refuse and record a request that tries to change a fixed field (UC-08 4c, UC-15)."""
    fixed_fields = sorted(set(submitted_fields) - set(editable_fields))
    if not fixed_fields:
        return
    AuditService.log_unauthorized(
        actor=actor, entity_type="user", entity_id=target_id, reason=f"fixed fields: {fixed_fields}", ip=ip
    )
    raise PermissionDeniedDomain(
        "Some of the submitted fields cannot be changed.",
        code="immutable_field",
        details={"fields": fixed_fields},
    )
