from datetime import time

from django.db import models
from django.db.models import Q

SINGLETON_ID = 1


class CenterSettings(models.Model):
    """The center's public information (ERD `center_settings`, FR-SET-01): a single row."""

    name = models.CharField(max_length=150)
    address = models.CharField(max_length=255)
    contact_phones = models.CharField(max_length=100, help_text="Shown when a password is forgotten (UC-02 3a).")
    work_start = models.TimeField()
    work_end = models.TimeField()

    class Meta:
        db_table = "center_settings"
        verbose_name_plural = "center settings"
        constraints = [models.CheckConstraint(condition=Q(id=SINGLETON_ID), name="center_settings_single_row")]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        self.pk = SINGLETON_ID
        super().save(*args, **kwargs)

    @classmethod
    def defaults(cls):
        """Shown until the System Administrator saves the real information."""
        return cls(
            pk=SINGLETON_ID,
            name="Citizen Service Center",
            address="To be configured",
            contact_phones="To be configured",
            work_start=time(8, 0),
            work_end=time(15, 0),
        )
