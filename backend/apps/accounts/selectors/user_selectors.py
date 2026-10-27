from django.db.models import Q, QuerySet

from apps.accounts.models import User
from shared.constants import ROLE_DEPT_MANAGER, ROLE_EMPLOYEE, ROLE_SYSTEM_ADMIN


def users_queryset() -> QuerySet[User]:
    return User.objects.select_related("department").order_by("-created_at", "-id")


def users_visible_to(actor) -> QuerySet[User]:
    """The accounts a manager may see (FR-USR-08: department isolation on the server).

    System Administrator: every account. Department Manager: the employees of their own
    department only. Everyone else: nothing.
    """
    queryset = users_queryset()
    if actor.role == ROLE_SYSTEM_ADMIN:
        return queryset
    if actor.role == ROLE_DEPT_MANAGER and actor.department_id:
        return queryset.filter(role=ROLE_EMPLOYEE, department_id=actor.department_id)
    return queryset.none()


def get_visible_user(actor, user_id: int):
    return users_visible_to(actor).filter(id=user_id).first()


def filter_users(queryset, *, search=None, role=None, status=None, department_id=None) -> QuerySet[User]:
    """UC-18 search and filters, applied inside the caller's scope."""
    if search:
        queryset = queryset.filter(Q(full_name__icontains=search) | Q(email__icontains=search))
    if role:
        queryset = queryset.filter(role=role)
    if status:
        queryset = queryset.filter(status=status)
    if department_id:
        queryset = queryset.filter(department_id=department_id)
    return queryset
