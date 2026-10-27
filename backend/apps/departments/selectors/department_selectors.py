from django.db.models import Count, Prefetch, Q, QuerySet

from apps.accounts.models import User
from apps.departments.models import Department
from shared.constants import ACCOUNT_ACTIVE, ROLE_DEPT_MANAGER, ROLE_EMPLOYEE


def _with_members(queryset) -> QuerySet[Department]:
    """Adds `employee_count` and `active_managers` to each department."""
    return queryset.annotate(
        employee_count=Count("members", filter=Q(members__role=ROLE_EMPLOYEE, members__status=ACCOUNT_ACTIVE))
    ).prefetch_related(
        Prefetch(
            "members",
            queryset=User.objects.filter(role=ROLE_DEPT_MANAGER, status=ACCOUNT_ACTIVE).order_by("full_name"),
            to_attr="active_managers",
        )
    )


def departments_queryset(*, status=None, search=None) -> QuerySet[Department]:
    """UC-14 list: archived departments are hidden unless asked for explicitly (UC-12)."""
    queryset = _with_members(Department.objects.all())
    queryset = queryset.filter(status=status) if status else queryset.exclude(status=Department.STATUS_ARCHIVED)
    if search:
        queryset = queryset.filter(name__icontains=search)
    return queryset.order_by("name")


def get_department(department_id: int):
    return _with_members(Department.objects.filter(id=department_id)).first()


def department_employees(department_id: int) -> QuerySet[User]:
    return User.objects.filter(department_id=department_id, role=ROLE_EMPLOYEE).order_by("full_name")


def active_department_accounts(department_id: int) -> QuerySet[User]:
    return User.objects.filter(department_id=department_id, status=ACCOUNT_ACTIVE).order_by("full_name")


def get_active_manager(department_id: int, user_id: int):
    return User.objects.filter(
        id=user_id, department_id=department_id, role=ROLE_DEPT_MANAGER, status=ACCOUNT_ACTIVE
    ).first()


# Services and requests are built in Sprints 2 and 3; until then their counts are zero.
def count_services(department_id: int) -> int:
    return 0


def count_requests(department_id: int) -> int:
    return 0


def count_open_requests(department_id: int) -> int:
    return 0
