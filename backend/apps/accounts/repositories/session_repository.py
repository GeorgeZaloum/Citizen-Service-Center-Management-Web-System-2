from django.utils import timezone

from apps.accounts.models import UserSession


class SessionRepository:
    @staticmethod
    def revoke_all(*, user_id: int, except_key=None) -> int:
        """End the user's live sessions, optionally keeping the current one."""
        sessions = UserSession.objects.filter(user_id=user_id, revoked_at__isnull=True)
        if except_key:
            sessions = sessions.exclude(session_key=except_key)
        return sessions.update(revoked_at=timezone.now())
