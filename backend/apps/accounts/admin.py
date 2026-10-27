from django.contrib import admin

from .models import User


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    """Read-only view for inspection during development; changes go through the API."""

    list_display = ("id", "full_name", "email", "role", "status", "department", "created_at")
    list_filter = ("role", "status", "department")
    search_fields = ("full_name", "email", "phone")
    exclude = ("password",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
