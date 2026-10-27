from django.contrib import admin

from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    """Read-only for everyone, the System Administrator included (FR-LOG-05)."""

    list_display = ("id", "created_at", "action", "entity_type", "entity_id", "user", "department_id")
    list_filter = ("action", "entity_type")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
