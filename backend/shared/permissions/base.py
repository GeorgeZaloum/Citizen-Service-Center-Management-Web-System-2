from rest_framework.permissions import BasePermission

from shared.constants import ROLE_CITIZEN, ROLE_DEPT_MANAGER, ROLE_SYSTEM_ADMIN


class _HasRole(BasePermission):
    roles = set()

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in self.roles)


class IsSystemAdmin(_HasRole):
    roles = {ROLE_SYSTEM_ADMIN}


class IsDepartmentManager(_HasRole):
    roles = {ROLE_DEPT_MANAGER}


class IsAccountManager(_HasRole):
    """Department Manager or System Administrator: the roles that manage other accounts."""

    roles = {ROLE_DEPT_MANAGER, ROLE_SYSTEM_ADMIN}


class IsCitizen(_HasRole):
    roles = {ROLE_CITIZEN}


class IsAnonymousOnly(BasePermission):
    """Registration is for visitors who are not logged in (UC-01 precondition)."""

    message = "You are already logged in."
    code = "already_authenticated"

    def has_permission(self, request, view):
        return not (request.user and request.user.is_authenticated)
