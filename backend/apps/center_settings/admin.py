from django.contrib import admin

from .models import CenterSettings


@admin.register(CenterSettings)
class CenterSettingsAdmin(admin.ModelAdmin):
    """Read-only view for inspection during development; changes go through UC-19."""

    list_display = ("name", "address", "contact_phones", "work_start", "work_end")

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
