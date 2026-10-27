from django.db import transaction

from apps.accounts.repositories import SessionRepository, UserRepository
from apps.accounts.selectors import get_visible_user
from apps.accounts.services.account_rules import ensure_contact_available, reject_fixed_fields
from apps.audit.models import ActivityLog
from apps.audit.services import AuditService
from apps.departments.models import Department
from apps.departments.repositories import DepartmentRepository
from shared.constants import (
    ACCOUNT_ACTIVE,
    ACCOUNT_DISABLED,
    ALL_ROLES,
    ROLE_CITIZEN,
    ROLE_DEPT_MANAGER,
    ROLE_EMPLOYEE,
    ROLE_SYSTEM_ADMIN,
    STAFF_ROLES,
)
from shared.exceptions import (
    BusinessRuleViolation,
    InvalidStateTransition,
    PermissionDeniedDomain,
    ResourceNotFound,
    ValidationFailed,
)
from shared.utils import changed_values, snapshot
from shared.validators import validate_password_strength

STAFF_EDITABLE_FIELDS = {"full_name", "email", "phone", "job_title"}

# Operations the System Administrator may run, and on which roles (permission matrix).
SYSTEM_ADMIN_TARGETS = {
    "view": ALL_ROLES,
    "edit": STAFF_ROLES,
    "reset_password": {ROLE_DEPT_MANAGER, ROLE_CITIZEN},
    "set_status": ALL_ROLES,
    "transfer": STAFF_ROLES,
}
# A Department Manager sees only the employees of their own department (see the
# selector) and may run these operations on them.
DEPARTMENT_MANAGER_OPERATIONS = {"view", "edit", "reset_password", "set_status"}
# Which role each manager may create (UC-04, UC-05). No one creates a System Administrator.
CREATABLE_ROLE = {ROLE_SYSTEM_ADMIN: ROLE_DEPT_MANAGER, ROLE_DEPT_MANAGER: ROLE_EMPLOYEE}


class UserService:
    """Operations a manager performs on other accounts: UC-03 – UC-05, UC-15 – UC-17.

    Public methods check scope and permissions first, outside any transaction, so a
    rejected attempt stays in the activity log; the changes run in a transaction after.
    """

    # ------------------------------------------------------------------ scope
    @staticmethod
    def get_managed_user(*, actor, user_id, operation="view", ip=None):
        """The account a manager acts on, if it is in their scope and the operation is allowed.

        Outside the scope it is "not found" (its existence is not revealed); write attempts
        on it are recorded (UC-03 4b, UC-15 4c, UC-16 4a).
        """
        target = get_visible_user(actor, user_id)
        if target is None:
            if operation != "view":
                AuditService.log_unauthorized(
                    actor=actor, entity_type="user", entity_id=user_id, reason=f"{operation} outside scope", ip=ip
                )
            raise ResourceNotFound("User not found.")
        if not UserService._allows(actor, operation, target):
            AuditService.log_unauthorized(
                actor=actor, entity_type="user", entity_id=user_id, reason=f"{operation} not allowed", ip=ip
            )
            raise PermissionDeniedDomain(f"Your role cannot run '{operation}' on this account.")
        return target

    @staticmethod
    def _allows(actor, operation, target):
        if actor.role == ROLE_SYSTEM_ADMIN:
            return target.role in SYSTEM_ADMIN_TARGETS.get(operation, set())
        if actor.role == ROLE_DEPT_MANAGER:
            return operation in DEPARTMENT_MANAGER_OPERATIONS
        return False

    # ------------------------------------------------------------------ UC-04, UC-05
    @staticmethod
    def create_staff_account(
        *, actor, role, full_name, email, phone, password, job_title=None, department_id=None, ip=None
    ):
        """The System Administrator creates Department Managers; a Department Manager creates
        Employees, always in their own department. No public path creates either (FR-USR-03)."""
        if CREATABLE_ROLE.get(actor.role) != role:
            raise PermissionDeniedDomain("Your role cannot create this type of account.")
        department = UserService._department_for_new_account(actor, department_id, ip)
        validate_password_strength(password)
        UserService._ensure_new_staff_contact(actor, role, email, phone)
        return UserService._create_staff_account(
            actor=actor,
            role=role,
            full_name=full_name,
            email=email,
            phone=phone,
            password=password,
            job_title=job_title if role == ROLE_EMPLOYEE else None,
            department=department,
            ip=ip,
        )

    @staticmethod
    def _department_for_new_account(actor, department_id, ip):
        if actor.role == ROLE_DEPT_MANAGER:
            if department_id not in (None, actor.department_id):
                AuditService.log_unauthorized(
                    actor=actor,
                    entity_type="department",
                    entity_id=department_id,
                    reason="create an employee in another department",
                    ip=ip,
                )
                raise PermissionDeniedDomain(
                    "Employees are created in your own department only.", code="scope_violation"
                )
            department_id = actor.department_id
        elif not DepartmentRepository.any_active():
            raise BusinessRuleViolation(
                "There are no active departments. Create a department first.", code="no_active_department"
            )
        if department_id is None:
            raise ValidationFailed(details={"department_id": ["The department is required."]})
        return UserService._active_department(department_id)

    @staticmethod
    def _active_department(department_id):
        department = DepartmentRepository.get_by_id(department_id)
        if department is None:
            raise ValidationFailed(details={"department_id": ["The department does not exist."]})
        if department.status != Department.STATUS_ACTIVE:
            raise BusinessRuleViolation("The department is not active.", code="department_not_active")
        return department

    @staticmethod
    def _ensure_new_staff_contact(actor, role, email, phone):
        """UC-04 4b: if the email belongs to another Department Manager, suggest a transfer instead."""
        existing = UserRepository.get_by_email(email)
        if existing and existing.role == ROLE_DEPT_MANAGER and role == ROLE_DEPT_MANAGER:
            raise BusinessRuleViolation(
                "The email belongs to another Department Manager: transfer that manager instead.",
                code="email_taken",
                details={"email": ["The email is used by another account."], "existing_manager_id": existing.id},
            )
        ensure_contact_available(email=email, phone=phone)

    @staticmethod
    @transaction.atomic
    def _create_staff_account(*, actor, role, full_name, email, phone, password, job_title, department, ip):
        user = UserRepository.create_user(
            full_name=full_name.strip(),
            email=email,
            phone=phone,
            password=password,
            role=role,
            job_title=job_title or None,
            department=department,
        )
        AuditService.log(
            action=ActivityLog.ACTION_STAFF_ACCOUNT_CREATED,
            entity_type="user",
            entity_id=user.id,
            actor=actor,
            department_id=department.id,
            new_value=snapshot(user, ["full_name", "email", "phone", "role", "department_id", "job_title"]),
            ip=ip,
        )
        return user

    # ------------------------------------------------------------------ UC-15
    @staticmethod
    def update_staff_account(
        *, actor, user_id, submitted_fields, full_name=None, email=None, phone=None, job_title=None, ip=None
    ):
        """The department is not edited here (transfer is UC-17); sending it is refused and recorded."""
        reject_fixed_fields(
            actor=actor,
            target_id=user_id,
            submitted_fields=submitted_fields,
            editable_fields=STAFF_EDITABLE_FIELDS,
            ip=ip,
        )
        user = UserService.get_managed_user(actor=actor, user_id=user_id, operation="edit", ip=ip)
        email = email.strip().lower() if email else None
        ensure_contact_available(email=email, phone=phone, exclude_id=user.id)

        changes = {"full_name": full_name.strip() if full_name else None, "email": email, "phone": phone}
        changes = {field: value for field, value in changes.items() if value}
        if "job_title" in submitted_fields:
            changes["job_title"] = job_title or None
        return UserService._save_staff_changes(actor=actor, user=user, changes=changes, ip=ip)

    @staticmethod
    @transaction.atomic
    def _save_staff_changes(*, actor, user, changes, ip):
        before = snapshot(user, STAFF_EDITABLE_FIELDS)
        old_value, new_value = changed_values(before, {**before, **changes})
        if new_value:
            UserRepository.save(user, **new_value)
            AuditService.log(
                action=ActivityLog.ACTION_STAFF_ACCOUNT_UPDATED,
                entity_type="user",
                entity_id=user.id,
                actor=actor,
                department_id=user.department_id,
                old_value=old_value,
                new_value=new_value,
                ip=ip,
            )
        return user

    # ------------------------------------------------------------------ UC-03
    @staticmethod
    def reset_password(*, actor, user_id, new_password, ip=None):
        """The manager sets the new password directly (never emailed); all the user's
        sessions end and any temporary lock is removed."""
        user = UserService.get_managed_user(actor=actor, user_id=user_id, operation="reset_password", ip=ip)
        validate_password_strength(new_password, field="new_password")
        return UserService._apply_password_reset(actor=actor, user=user, new_password=new_password, ip=ip)

    @staticmethod
    @transaction.atomic
    def _apply_password_reset(*, actor, user, new_password, ip):
        was_locked = user.locked_until is not None
        user.set_password(new_password)
        user.failed_attempts = 0
        user.locked_until = None
        user.save(update_fields=["password", "failed_attempts", "locked_until"])
        ended_sessions = SessionRepository.revoke_all(user_id=user.id)
        AuditService.log(
            action=ActivityLog.ACTION_PASSWORD_RESET,
            entity_type="user",
            entity_id=user.id,
            actor=actor,
            department_id=user.department_id,
            new_value={"sessions_ended": ended_sessions, "lock_removed": was_locked},
            ip=ip,
        )
        return user

    # ------------------------------------------------------------------ UC-16
    @staticmethod
    def set_status(*, actor, user_id, status, reason="", ip=None):
        """Deactivate (reason required, never one's own account) or reactivate an account.

        Deactivation keeps all data and ends the account's sessions. Returning its
        unfinished requests to the department queue joins this method in Sprint 4.
        """
        if status == ACCOUNT_DISABLED:
            if user_id == actor.id:
                raise PermissionDeniedDomain("You cannot deactivate your own account.", code="self_action_forbidden")
            if not reason.strip():
                raise ValidationFailed(details={"reason": ["The reason for deactivation is required."]})
        user = UserService.get_managed_user(actor=actor, user_id=user_id, operation="set_status", ip=ip)
        if user.status == status:
            raise InvalidStateTransition("The account is already in this status.")
        if status == ACCOUNT_ACTIVE and user.is_staff_member and user.department_id is None:
            raise BusinessRuleViolation(
                "The account has no department. Transfer it to a department first.", code="department_required"
            )
        return UserService._apply_status(actor=actor, user=user, status=status, reason=reason, ip=ip)

    @staticmethod
    @transaction.atomic
    def _apply_status(*, actor, user, status, reason, ip):
        old_status = user.status
        UserRepository.save(user, status=status)
        if status == ACCOUNT_DISABLED:
            SessionRepository.revoke_all(user_id=user.id)
        new_value = {"status": status, "reason": reason} if status == ACCOUNT_DISABLED else {"status": status}
        AuditService.log(
            action=ActivityLog.ACTION_ACCOUNT_DEACTIVATED
            if status == ACCOUNT_DISABLED
            else ActivityLog.ACTION_ACCOUNT_ACTIVATED,
            entity_type="user",
            entity_id=user.id,
            actor=actor,
            department_id=user.department_id,
            old_value={"status": old_status},
            new_value=new_value,
            ip=ip,
        )
        return user

    # ------------------------------------------------------------------ UC-17
    @staticmethod
    def transfer(*, actor, user_id, department_id, ip=None):
        """Move an employee or manager to another active department.

        The history stays attributed to the old department (the log entry carries it), and
        the account's scope moves immediately since every query reads `department_id`.
        """
        user = UserService.get_managed_user(actor=actor, user_id=user_id, operation="transfer", ip=ip)
        if not DepartmentRepository.other_active_exists(exclude_id=user.department_id):
            raise BusinessRuleViolation(
                "There is no other active department to transfer to.", code="no_other_active_department"
            )
        if department_id == user.department_id:
            raise ValidationFailed(details={"department_id": ["The account already belongs to this department."]})
        department = UserService._active_department(department_id)
        return UserService._apply_transfer(actor=actor, user=user, department=department, ip=ip)

    @staticmethod
    @transaction.atomic
    def _apply_transfer(*, actor, user, department, ip):
        old_department_id = user.department_id
        UserRepository.save(user, department=department)
        AuditService.log(
            action=ActivityLog.ACTION_ACCOUNT_TRANSFERRED,
            entity_type="user",
            entity_id=user.id,
            actor=actor,
            department_id=old_department_id,
            old_value={"department_id": old_department_id},
            new_value={"department_id": department.id},
            ip=ip,
        )
        return user
