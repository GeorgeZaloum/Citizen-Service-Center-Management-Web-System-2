from django.contrib.auth import SESSION_KEY
from django.contrib.sessions.backends.base import CreateError, UpdateError
from django.contrib.sessions.backends.db import SessionStore as DatabaseSessionStore
from django.core.exceptions import SuspiciousOperation
from django.db import DatabaseError, IntegrityError, router, transaction
from django.utils import timezone

from apps.accounts.models import UserSession


class SessionStore(DatabaseSessionStore):
    """Django's database session engine (`SESSION_ENGINE`), on the ERD table `sessions`.

    Differences: each row records its user, revoked rows are never valid, and a logout
    marks the row revoked instead of deleting it.
    """

    @classmethod
    def get_model_class(cls):
        return UserSession

    def _get_session_from_db(self):
        try:
            return self.model.objects.get(
                session_key=self.session_key, expire_date__gt=timezone.now(), revoked_at__isnull=True
            )
        except (self.model.DoesNotExist, SuspiciousOperation):
            self._session_key = None
            return None

    def create_model_instance(self, data):
        instance = super().create_model_instance(data)
        user_id = data.get(SESSION_KEY)
        instance.user_id = int(user_id) if user_id is not None else None
        return instance

    def save(self, must_create=False):
        """Like Django's engine, but an update never overwrites `created_at`."""
        if self.session_key is None:
            return self.create()
        instance = self.create_model_instance(self._get_session(no_load=must_create))
        using = router.db_for_write(self.model, instance=instance)
        try:
            with transaction.atomic(using=using):
                if must_create:
                    instance.save(force_insert=True, using=using)
                else:
                    instance.save(force_update=True, using=using, update_fields=["session_data", "expire_date", "user"])
        except IntegrityError as error:
            if must_create:
                raise CreateError from error
            raise
        except DatabaseError as error:
            if not must_create:
                raise UpdateError from error
            raise
        return None

    def delete(self, session_key=None):
        key = session_key or self.session_key
        if key is None:
            return
        self.model.objects.filter(session_key=key, revoked_at__isnull=True).update(revoked_at=timezone.now())
