from django.contrib.auth.base_user import AbstractBaseUser, BaseUserManager
from django.db import models
from django.db.models import Q

from shared.constants import (
    ACCOUNT_ACTIVE,
    ACCOUNT_STATUS_CHOICES,
    ROLE_CHOICES,
    ROLE_CITIZEN,
    ROLE_DEPT_MANAGER,
    ROLE_EMPLOYEE,
    ROLE_SYSTEM_ADMIN,
    STAFF_ROLES,
)


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("Email is required.")
        user = self.model(email=email.strip().lower(), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password, **extra_fields):
        extra_fields.setdefault("role", ROLE_SYSTEM_ADMIN)
        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser):
    """One `users` table for every role (Single Table Inheritance with the `role` column).

    Role-specific columns: `national_id` for citizens; `department` and `job_title` for
    employees and department managers.
    """

    password = models.CharField(max_length=255, db_column="password_hash")
    last_login = None  # Not in the ERD: logins are recorded in the activity log.

    full_name = models.CharField(max_length=150)
    email = models.EmailField(max_length=150, unique=True)
    phone = models.CharField(max_length=20, unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    status = models.CharField(max_length=20, choices=ACCOUNT_STATUS_CHOICES, default=ACCOUNT_ACTIVE)
    national_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    job_title = models.CharField(max_length=100, null=True, blank=True)
    department = models.ForeignKey(
        "departments.Department", on_delete=models.PROTECT, null=True, blank=True, related_name="members"
    )
    failed_attempts = models.PositiveIntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["full_name", "phone"]

    objects = UserManager()

    class Meta:
        db_table = "users"
        ordering = ["-created_at"]
        constraints = [
            models.CheckConstraint(
                condition=Q(role=ROLE_CITIZEN, national_id__isnull=False)
                | (~Q(role=ROLE_CITIZEN) & Q(national_id__isnull=True)),
                name="users_national_id_only_for_citizens",
            ),
            models.CheckConstraint(
                condition=Q(role__in=[ROLE_EMPLOYEE, ROLE_DEPT_MANAGER]) | Q(department__isnull=True),
                name="users_department_only_for_staff",
            ),
        ]

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_active(self):
        return self.status == ACCOUNT_ACTIVE

    @property
    def is_staff(self):
        """Only the System Administrator may open the Django admin site."""
        return self.role == ROLE_SYSTEM_ADMIN

    @property
    def is_staff_member(self):
        """Employee or Department Manager."""
        return self.role in STAFF_ROLES

    def has_perm(self, perm, obj=None):
        return self.is_active and self.is_staff

    def has_module_perms(self, app_label):
        return self.is_active and self.is_staff
