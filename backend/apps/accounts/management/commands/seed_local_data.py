import io

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from PIL import Image, ImageDraw

from apps.accounts.repositories import UserRepository
from apps.accounts.services import AuthService, UserService
from apps.departments.models import Department
from shared.constants import ROLE_DEPT_MANAGER, ROLE_EMPLOYEE

DEMO_PASSWORD = "Demo-Pass1"
DEMO_DOMAIN = "demo.csc"


class Command(BaseCommand):
    """Demo accounts for testing the front end (never in production). Run `seed_data` first.

    For every active department: one manager (created by the System Administrator, UC-04)
    and two employees (created by that manager, UC-05); plus two citizens with placeholder
    ID card images (UC-01). Every demo password is Demo-Pass1. Safe to run again.
    """

    help = "Create demo managers, employees and citizens (after seed_data)."

    @transaction.atomic
    def handle(self, *args, **options):
        admin = UserRepository.get_by_email(settings.SEED_ADMIN["email"])
        if admin is None:
            raise CommandError("Run `python manage.py seed_data` first: the System Administrator is missing.")
        self._next_phone = 1

        for department in Department.objects.filter(status=Department.STATUS_ACTIVE).order_by("id"):
            slug = department.name.lower().replace(" ", "-")
            manager = self._staff(admin, ROLE_DEPT_MANAGER, f"manager.{slug}", department.id)
            for number in (1, 2):
                self._staff(manager, ROLE_EMPLOYEE, f"employee{number}.{slug}", None)
        for number in (1, 2):
            self._citizen(number)
        self.stdout.write(f"Every demo account uses the password {DEMO_PASSWORD}")

    def _phone(self):
        phone = f"0990{self._next_phone:06d}"
        self._next_phone += 1
        return phone

    def _staff(self, actor, role, name, department_id):
        email = f"{name}@{DEMO_DOMAIN}"
        phone = self._phone()
        existing = UserRepository.get_by_email(email)
        if existing:
            self.stdout.write(f"exists   {role:<13} {email}")
            return existing
        user = UserService.create_staff_account(
            actor=actor,
            role=role,
            full_name=name.replace(".", " ").replace("-", " ").title(),
            email=email,
            phone=phone,
            password=DEMO_PASSWORD,
            job_title="Clerk",
            department_id=department_id,
        )
        self.stdout.write(self.style.SUCCESS(f"created  {role:<13} {email}"))
        return user

    def _citizen(self, number):
        email = f"citizen{number}@{DEMO_DOMAIN}"
        phone = self._phone()
        if UserRepository.get_by_email(email):
            self.stdout.write(f"exists   CITIZEN       {email}")
            return
        AuthService.register_citizen(
            full_name=f"Demo Citizen {number}",
            national_id=str(90000000000 + number),
            email=email,
            phone=phone,
            password=DEMO_PASSWORD,
            id_card_front=_placeholder_id_card(f"citizen{number}-front.png", "FRONT"),
            id_card_back=_placeholder_id_card(f"citizen{number}-back.png", "BACK"),
        )
        self.stdout.write(self.style.SUCCESS(f"created  CITIZEN       {email}"))


def _placeholder_id_card(name, label):
    """A placeholder picture, never a real document."""
    image = Image.new("RGB", (340, 210), "#e8eef7")
    ImageDraw.Draw(image).text((20, 90), f"DEMO ID CARD - {label}", fill="#1f3864")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    return SimpleUploadedFile(name, buffer.getvalue(), content_type="image/png")
