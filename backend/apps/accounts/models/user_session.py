from django.contrib.sessions.base_session import AbstractBaseSession
from django.db import models


class UserSession(AbstractBaseSession):
    """Server-side session linked to its user (ERD table `sessions`).

    The link lets the system end all sessions of one user (password change or reset,
    deactivation). A logout marks the row revoked instead of deleting it.
    """

    session_key = models.CharField(max_length=64, primary_key=True, db_column="id")
    expire_date = models.DateTimeField(db_index=True, db_column="expires_at")
    user = models.ForeignKey("accounts.User", on_delete=models.CASCADE, null=True, blank=True, related_name="sessions")
    created_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "sessions"

    def __str__(self):
        return f"UserSession<{self.user_id}>"

    @classmethod
    def get_session_store_class(cls):
        from apps.accounts.repositories.session_store import SessionStore

        return SessionStore
