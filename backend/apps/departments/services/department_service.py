from django.db import transaction

from apps.accounts.repositories import SessionRepository, UserRepository
from apps.accounts.services import UserService
from apps.audit.models import ActivityLog
from apps.audit.services import AuditService
from apps.departments.models import Department
from apps.departments.repositories import DepartmentRepository
from apps.departments.selectors import (
    active_department_accounts,
    count_requests,
    get_active_manager,
    get_department,
)
from shared.constants import ACCOUNT_DISABLED
from shared.exceptions import BusinessRuleViolation, InvalidStateTransition, ResourceNotFound, ValidationFailed
from shared.utils import changed_values, snapshot

DEPARTMENT_FIELDS = ["name", "description", "authority", "status"]
EDITABLE_FIELDS = ["name", "description", "authority"]

REMOVE_BY_DEACTIVATION = "DEACTIVATE"
REMOVE_BY_TRANSFER = "TRANSFER"


class DepartmentService:
    """Departments and their lifecycle (UC-09 – UC-14), all for the System Administrator.

    ACTIVE <-> SUSPENDED -> ARCHIVED (final);  SUSPENDED -> deleted (UC-12)
    """

    ALLOWED_TRANSITIONS = {
        Department.STATUS_ACTIVE: {Department.STATUS_SUSPENDED},
        Department.STATUS_SUSPENDED: {Department.STATUS_ACTIVE, Department.STATUS_ARCHIVED},
        Department.STATUS_ARCHIVED: set(),
    }

    @staticmethod
    def get_or_404(department_id: int):
        department = get_department(department_id)
        if not department:
            raise ResourceNotFound("Department not found.")
        return department

    @staticmethod
    def allowed_actions(department):
        """Actions the screen may offer now (UC-14): no "delete" for an active department,
        nothing for an archived one; archive instead of delete when it has requests."""
        if department.status == Department.STATUS_ARCHIVED:
            return []
        actions = ["EDIT"]
        if department.status == Department.STATUS_ACTIVE:
            actions += ["SUSPEND", "ADD_MANAGER"]
        else:
            actions += ["ACTIVATE", "ARCHIVE" if count_requests(department.id) else "DELETE"]
        if getattr(department, "active_managers", None):
            actions.append("REMOVE_MANAGER")
        return actions

    # ------------------------------------------------------------------ UC-09
    @staticmethod
    @transaction.atomic
    def create_department(*, actor, name, authority, description="", ip=None):
        """A new department is active, without managers or services; its manager is added with UC-04."""
        DepartmentService._ensure_name_available(name)
        department = DepartmentRepository.create(
            name=name.strip(), authority=authority.strip(), description=description.strip()
        )
        AuditService.log(
            action=ActivityLog.ACTION_DEPARTMENT_CREATED,
            entity_type="department",
            entity_id=department.id,
            actor=actor,
            department_id=department.id,
            new_value=snapshot(department, DEPARTMENT_FIELDS),
            ip=ip,
        )
        return department

    @staticmethod
    def _ensure_name_available(name, exclude_id=None):
        """Names are unique, archived departments included (UC-09 4b, UC-10 4b)."""
        existing = DepartmentRepository.find_by_name(name, exclude_id=exclude_id)
        if existing:
            raise BusinessRuleViolation(
                "A department with the same name already exists.",
                code="department_name_taken",
                details={
                    "name": ["A department with the same name already exists."],
                    "existing_status": existing.status,
                },
            )

    # ------------------------------------------------------------------ UC-10
    @staticmethod
    @transaction.atomic
    def update_department(*, actor, department, attrs, ip=None):
        DepartmentService._ensure_not_archived(department)
        if "name" in attrs:
            DepartmentService._ensure_name_available(attrs["name"], exclude_id=department.id)
        before = snapshot(department, EDITABLE_FIELDS)
        changes = {field: value.strip() for field, value in attrs.items() if field in EDITABLE_FIELDS}
        old_value, new_value = changed_values(before, {**before, **changes})
        if new_value:
            DepartmentRepository.save(department, **new_value)
            AuditService.log(
                action=ActivityLog.ACTION_DEPARTMENT_UPDATED,
                entity_type="department",
                entity_id=department.id,
                actor=actor,
                department_id=department.id,
                old_value=old_value,
                new_value=new_value,
                ip=ip,
            )
        return department

    # ------------------------------------------------------------------ UC-11
    @staticmethod
    @transaction.atomic
    def change_status(*, actor, department, to_status, ip=None):
        """Suspend (services leave the catalog, existing requests continue, employees can still
        log in) or reactivate a department."""
        DepartmentService._transition(actor=actor, department=department, to_status=to_status, ip=ip)
        return department

    @staticmethod
    def _transition(*, actor, department, to_status, ip):
        DepartmentService._ensure_not_archived(department)
        from_status = department.status
        if to_status not in DepartmentService.ALLOWED_TRANSITIONS[from_status]:
            raise InvalidStateTransition(
                f"Cannot move the department from {from_status} to {to_status}.",
                details={"from_status": from_status, "to_status": to_status},
            )
        DepartmentRepository.save(department, status=to_status)
        actions = {
            Department.STATUS_SUSPENDED: ActivityLog.ACTION_DEPARTMENT_SUSPENDED,
            Department.STATUS_ACTIVE: ActivityLog.ACTION_DEPARTMENT_ACTIVATED,
            Department.STATUS_ARCHIVED: ActivityLog.ACTION_DEPARTMENT_ARCHIVED,
        }
        AuditService.log(
            action=actions[to_status],
            entity_type="department",
            entity_id=department.id,
            actor=actor,
            department_id=department.id,
            old_value={"status": from_status},
            new_value={"status": to_status},
            ip=ip,
        )

    # ------------------------------------------------------------------ UC-12
    @staticmethod
    @transaction.atomic
    def delete_department(*, actor, department, confirm_name, ip=None):
        """Delete a suspended department without active accounts or requests, after its name
        is typed exactly (4a). Deactivated accounts keep their data and lose the link."""
        DepartmentService._ensure_removable(department)
        if count_requests(department.id):
            raise BusinessRuleViolation(
                "The department is linked to requests. Archive it instead of deleting it.",
                code="department_has_requests",
            )
        if confirm_name.strip() != department.name:
            raise ValidationFailed(
                "Type the department name exactly to confirm.",
                code="confirmation_mismatch",
                details={"confirm_name": ["Type the department name exactly to confirm."]},
            )
        AuditService.log(
            action=ActivityLog.ACTION_DEPARTMENT_DELETED,
            entity_type="department",
            entity_id=department.id,
            actor=actor,
            department_id=department.id,
            old_value=snapshot(department, DEPARTMENT_FIELDS),
            ip=ip,
        )
        UserRepository.detach_inactive_from_department(department.id)
        DepartmentRepository.delete(department)

    @staticmethod
    @transaction.atomic
    def archive_department(*, actor, department, ip=None):
        """UC-12 2b: a department linked to requests is archived instead of deleted."""
        DepartmentService._ensure_removable(department)
        if not count_requests(department.id):
            raise BusinessRuleViolation(
                "The department has no requests. Delete it instead of archiving it.",
                code="department_has_no_requests",
            )
        DepartmentService._transition(actor=actor, department=department, to_status=Department.STATUS_ARCHIVED, ip=ip)
        return department

    @staticmethod
    def _ensure_removable(department):
        """UC-12 precondition (suspended) and 2a (no active accounts)."""
        DepartmentService._ensure_not_archived(department)
        if department.status != Department.STATUS_SUSPENDED:
            raise BusinessRuleViolation("Suspend the department first.", code="department_not_suspended")
        accounts = active_department_accounts(department.id)
        if accounts.exists():
            raise BusinessRuleViolation(
                "Active accounts are linked to the department. Transfer or deactivate them first.",
                code="department_has_active_accounts",
                details={
                    "accounts": [
                        {"id": account.id, "full_name": account.full_name, "role": account.role} for account in accounts
                    ]
                },
            )

    # ------------------------------------------------------------------ UC-13
    @staticmethod
    def remove_manager(*, actor, department, user_id, mode, target_department_id=None, ip=None):
        """Remove a manager by deactivating the account (main flow) or by transferring it (3a,
        through UC-17). Returns True when the department is left without a manager."""
        DepartmentService._ensure_not_archived(department)
        manager = get_active_manager(department.id, user_id)
        if manager is None:
            raise ResourceNotFound("The account is not a manager of this department.")
        was_only_manager = len(department.active_managers) == 1

        if mode == REMOVE_BY_TRANSFER:
            if target_department_id is None:
                raise ValidationFailed(details={"target_department_id": ["Choose the department to transfer to."]})
            UserService.transfer(actor=actor, user_id=manager.id, department_id=target_department_id, ip=ip)
        else:
            DepartmentService._deactivate_manager(manager)

        AuditService.log(
            action=ActivityLog.ACTION_MANAGER_REMOVED,
            entity_type="department",
            entity_id=department.id,
            actor=actor,
            department_id=department.id,
            new_value={"manager_id": manager.id, "mode": mode, "target_department_id": target_department_id},
            ip=ip,
        )
        return was_only_manager

    @staticmethod
    @transaction.atomic
    def _deactivate_manager(manager):
        """The account loses its department and is deactivated; reactivating it requires a transfer."""
        UserRepository.save(manager, department=None, status=ACCOUNT_DISABLED)
        SessionRepository.revoke_all(user_id=manager.id)

    @staticmethod
    def _ensure_not_archived(department):
        if department.status == Department.STATUS_ARCHIVED:
            raise BusinessRuleViolation(
                "The department is archived and cannot be modified.", code="department_archived"
            )
