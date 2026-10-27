from rest_framework import permissions

from shared.permissions import IsSystemAdmin


class CenterSettingsPermission(permissions.BasePermission):
    """Everyone reads the center information (visitors included); only the System
    Administrator changes it."""

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return IsSystemAdmin().has_permission(request, view)
