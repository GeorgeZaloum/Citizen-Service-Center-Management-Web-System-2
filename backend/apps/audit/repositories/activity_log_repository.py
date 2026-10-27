from apps.audit.models import ActivityLog


class ActivityLogRepository:
    """Append only: there is no update or delete method on purpose."""

    @staticmethod
    def create(**kwargs):
        return ActivityLog.objects.create(**kwargs)
