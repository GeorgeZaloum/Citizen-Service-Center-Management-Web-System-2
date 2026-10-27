from django.db import models
from django.db.models.functions import Lower


class Department(models.Model):
    STATUS_ACTIVE = "ACTIVE"
    STATUS_SUSPENDED = "SUSPENDED"
    STATUS_ARCHIVED = "ARCHIVED"

    STATUS_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_SUSPENDED, "Suspended"),
        (STATUS_ARCHIVED, "Archived"),
    ]
    # UC-11 switches between these two; archiving is its own operation (UC-12).
    SUSPEND_ACTIVATE_CHOICES = [
        (STATUS_ACTIVE, "Active"),
        (STATUS_SUSPENDED, "Suspended"),
    ]

    name = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    authority = models.CharField(max_length=150)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_ACTIVE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "departments"
        ordering = ["name"]
        constraints = [models.UniqueConstraint(Lower("name"), name="departments_name_unique_ci")]

    def __str__(self):
        return self.name
