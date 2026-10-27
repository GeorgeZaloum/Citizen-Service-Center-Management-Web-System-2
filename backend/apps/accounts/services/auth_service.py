from datetime import timedelta
from functools import cache

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import IdentityDocument
from apps.accounts.repositories import IdentityDocumentRepository, SessionRepository, UserRepository
from apps.accounts.services.account_rules import ensure_contact_available, reject_fixed_fields
from apps.audit.models import ActivityLog
from apps.audit.services import AuditService
from shared.constants import ROLE_CITIZEN
from shared.exceptions import (
    AuthenticationFailedDomain,
    BusinessRuleViolation,
    PermissionDeniedDomain,
    ValidationFailed,
)
from shared.utils import changed_values, snapshot
from shared.validators import id_image_problem, password_problems, validate_password_strength

PROFILE_EDITABLE_FIELDS = {"email", "phone"}


@cache
def _dummy_password_hash():
    return make_password("timing-equalizer")


class AuthService:
    """Operations a user performs on their own account: UC-01, UC-02, UC-06, UC-07, UC-08."""

    # ------------------------------------------------------------------ UC-01
    @staticmethod
    def register_citizen(*, full_name, national_id, email, phone, password, id_card_front, id_card_back, ip=None):
        """Create an active citizen account with both ID card images; no session is opened."""
        errors = {}
        if problems := password_problems(password):
            errors["password"] = problems
        for field, image in (("id_card_front", id_card_front), ("id_card_back", id_card_back)):
            if problem := id_image_problem(image):
                errors[field] = [problem]
        if errors:
            raise ValidationFailed(details=errors)

        taken = UserRepository.taken_fields(email=email, phone=phone, national_id=national_id)
        if taken:
            raise BusinessRuleViolation(
                "The data is linked to an existing account. Log in, or contact the center's management.",
                code="account_exists",
                details={"fields": sorted(taken)},
            )
        return AuthService._create_citizen(
            full_name=full_name,
            national_id=national_id,
            email=email,
            phone=phone,
            password=password,
            id_card_front=id_card_front,
            id_card_back=id_card_back,
            ip=ip,
        )

    @staticmethod
    @transaction.atomic
    def _create_citizen(*, full_name, national_id, email, phone, password, id_card_front, id_card_back, ip):
        user = UserRepository.create_user(
            full_name=full_name.strip(),
            national_id=national_id,
            email=email,
            phone=phone,
            password=password,
            role=ROLE_CITIZEN,
        )
        IdentityDocumentRepository.create(user=user, side=IdentityDocument.SIDE_FRONT, file=id_card_front)
        IdentityDocumentRepository.create(user=user, side=IdentityDocument.SIDE_BACK, file=id_card_back)
        AuditService.log(
            action=ActivityLog.ACTION_CITIZEN_REGISTERED,
            entity_type="user",
            entity_id=user.id,
            actor=user,
            new_value=snapshot(user, ["full_name", "email", "phone", "national_id", "role"]),
            ip=ip,
        )
        return user

    # ------------------------------------------------------------------ UC-02
    @staticmethod
    def login(*, email, password, ip=None):
        """Check the credentials and the account state; the view then opens the session.

        Not atomic on purpose: the failed-attempt counter must be saved even though the
        login fails.
        """
        user = UserRepository.get_by_email(email)
        if user is None:
            check_password(password, _dummy_password_hash())  # same response time as a real check
            raise AuthService._invalid_credentials()

        now = timezone.now()
        if user.locked_until and user.locked_until > now:
            raise AuthService._account_locked(user, now)
        if not user.check_password(password):
            AuthService._register_failed_attempt(user, now, ip)
        if not user.is_active:
            raise PermissionDeniedDomain(
                "The account is deactivated. Please contact the center's management.", code="account_disabled"
            )

        if user.failed_attempts or user.locked_until:
            UserRepository.save(user, failed_attempts=0, locked_until=None)
        AuditService.log(
            action=ActivityLog.ACTION_LOGIN_SUCCEEDED,
            entity_type="user",
            entity_id=user.id,
            actor=user,
            department_id=user.department_id,
            ip=ip,
        )
        return user

    @staticmethod
    def _register_failed_attempt(user, now, ip):
        """UC-02 4a, or 4b once the limit is reached (5 attempts, 15 minutes by default). Always raises."""
        attempts = user.failed_attempts + 1
        if attempts < settings.LOGIN_MAX_FAILED_ATTEMPTS:
            UserRepository.save(user, failed_attempts=attempts)
            raise AuthService._invalid_credentials()

        UserRepository.save(user, failed_attempts=0, locked_until=now + timedelta(minutes=settings.LOGIN_LOCK_MINUTES))
        AuditService.log(
            action=ActivityLog.ACTION_ACCOUNT_LOCKED,
            entity_type="user",
            entity_id=user.id,
            department_id=user.department_id,
            ip=ip,
        )
        raise AuthService._account_locked(user, now)

    @staticmethod
    def _invalid_credentials():
        """One generic message that never says which field is wrong."""
        return AuthenticationFailedDomain("Incorrect email or password.", code="invalid_credentials")

    @staticmethod
    def _account_locked(user, now):
        return AuthenticationFailedDomain(
            "The account is temporarily locked after repeated failed login attempts.",
            code="account_locked",
            details={
                "locked_until": user.locked_until.isoformat(),
                "retry_after_seconds": max(int((user.locked_until - now).total_seconds()), 1),
            },
        )

    # ------------------------------------------------------------------ UC-06
    @staticmethod
    def record_logout(*, user, ip=None):
        AuditService.log(
            action=ActivityLog.ACTION_LOGGED_OUT,
            entity_type="user",
            entity_id=user.id,
            actor=user,
            department_id=user.department_id,
            ip=ip,
        )

    # ------------------------------------------------------------------ UC-07
    @staticmethod
    @transaction.atomic
    def change_password(*, user, current_password, new_password, current_session_key=None, ip=None):
        """Change the password and end the user's other sessions; the current one stays."""
        if not user.check_password(current_password):
            raise ValidationFailed(
                "The current password is incorrect.",
                code="incorrect_current_password",
                details={"current_password": ["The current password is incorrect."]},
            )
        validate_password_strength(new_password, field="new_password")
        if user.check_password(new_password):
            raise ValidationFailed(
                "The new password must differ from the current one.",
                code="password_same_as_current",
                details={"new_password": ["The new password must differ from the current one."]},
            )

        user.set_password(new_password)
        user.save(update_fields=["password"])
        SessionRepository.revoke_all(user_id=user.id, except_key=current_session_key)
        AuditService.log(
            action=ActivityLog.ACTION_PASSWORD_CHANGED,
            entity_type="user",
            entity_id=user.id,
            actor=user,
            department_id=user.department_id,
            ip=ip,
        )
        return user

    # ------------------------------------------------------------------ UC-08
    @staticmethod
    def update_profile(*, user, submitted_fields, email=None, phone=None, ip=None):
        """Only email and phone are editable; any other field is refused and recorded (4c)."""
        reject_fixed_fields(
            actor=user,
            target_id=user.id,
            submitted_fields=submitted_fields,
            editable_fields=PROFILE_EDITABLE_FIELDS,
            ip=ip,
        )
        email = email.strip().lower() if email else None
        ensure_contact_available(email=email, phone=phone, exclude_id=user.id)
        return AuthService._save_profile(user=user, email=email, phone=phone, ip=ip)

    @staticmethod
    @transaction.atomic
    def _save_profile(*, user, email, phone, ip):
        before = snapshot(user, PROFILE_EDITABLE_FIELDS)
        changes = {field: value for field, value in {"email": email, "phone": phone}.items() if value}
        old_value, new_value = changed_values(before, {**before, **changes})
        if new_value:
            UserRepository.save(user, **new_value)
            AuditService.log(
                action=ActivityLog.ACTION_PROFILE_UPDATED,
                entity_type="user",
                entity_id=user.id,
                actor=user,
                department_id=user.department_id,
                old_value=old_value,
                new_value=new_value,
                ip=ip,
            )
        return user
