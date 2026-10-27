from datetime import time

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.repositories import UserRepository
from apps.audit.models import ActivityLog
from apps.audit.services import AuditService
from apps.center_settings.repositories import CenterSettingsRepository
from apps.center_settings.services import CenterSettingsService
from apps.departments.repositories import DepartmentRepository
from apps.departments.services import DepartmentService
from shared.constants import ROLE_SYSTEM_ADMIN
from shared.validators import password_problems

BASIC_DEPARTMENTS = [
    ("Municipality", "Municipality", "Rental contracts, building permits and local services."),
    ("Traffic", "Traffic Directorate", "Vehicle registration and driving licences."),
    ("Civil Registry", "Civil Registry Directorate", "Civil status records and extracts."),
]


class Command(BaseCommand):
    help = "Installation data: basic departments, default center information, first System Administrator."

    @transaction.atomic
    def handle(self, *args, **options):
        self._seed_departments()
        self._seed_center_settings()
        self._seed_system_admin(settings.SEED_ADMIN)

    def _seed_departments(self):
        """FR-DEP-01: the basic departments, editable later."""
        for name, authority, description in BASIC_DEPARTMENTS:
            if DepartmentRepository.find_by_name(name):
                self.stdout.write(f"exists   department {name}")
                continue
            DepartmentService.create_department(actor=None, name=name, authority=authority, description=description)
            self.stdout.write(self.style.SUCCESS(f"created  department {name}"))

    def _seed_center_settings(self):
        if CenterSettingsRepository.get():
            self.stdout.write("exists   center settings")
            return
        CenterSettingsService.update(
            actor=None,
            attrs={
                "name": "Citizen Service Center",
                "address": "To be configured by the System Administrator",
                "contact_phones": "To be configured",
                "work_start": time(8, 0),
                "work_end": time(15, 0),
            },
        )
        self.stdout.write(self.style.SUCCESS("created  center settings"))

    def _seed_system_admin(self, admin):
        """The only way to create a System Administrator (no endpoint creates this role)."""
        if UserRepository.get_by_email(admin["email"]):
            self.stdout.write(f"exists   System Administrator {admin['email']}")
            return
        if problems := password_problems(admin["password"]):
            raise CommandError("SEED_ADMIN_PASSWORD in .env is not strong enough: " + " ".join(problems))
        user = UserRepository.create_user(
            email=admin["email"],
            password=admin["password"],
            full_name=admin["full_name"],
            phone=admin["phone"],
            role=ROLE_SYSTEM_ADMIN,
        )
        AuditService.log(
            action=ActivityLog.ACTION_STAFF_ACCOUNT_CREATED,
            entity_type="user",
            entity_id=user.id,
            new_value={"email": user.email, "role": user.role},
        )
        self.stdout.write(self.style.SUCCESS(f"created  System Administrator {user.email}"))
