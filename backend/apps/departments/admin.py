from django.contrib import admin

from .models import Department


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Read-only view for inspection during development; changes go through the API."""

    list_display = ("id", "name", "authority", "status", "created_at")
    list_filter = ("status",)
    search_fields = ("name", "authority")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
