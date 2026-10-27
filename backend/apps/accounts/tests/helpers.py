import io
import itertools

from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.departments.models import Department
from shared.constants import ROLE_CITIZEN

PASSWORD = "Strong-Pass1"
_numbers = itertools.count(1)


def make_department(name=None, status=Department.STATUS_ACTIVE):
    name = name or f"Department {next(_numbers)}"
    return Department.objects.create(name=name, authority=name, status=status)


def make_user(role, *, department=None, password=PASSWORD, **fields):
    number = next(_numbers)
    fields.setdefault("full_name", f"User {number}")
    fields.setdefault("email", f"user{number}@csc.test")
    fields.setdefault("phone", f"09{number:08d}")
    if role == ROLE_CITIZEN:
        fields.setdefault("national_id", f"{number:011d}")
    return User.objects.create_user(password=password, role=role, department=department, **fields)


def logged_in_client(user):
    client = APIClient()
    client.force_login(user)
    return client


def image_file(name="id.png", image_format="PNG"):
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "white").save(buffer, format=image_format)
    return SimpleUploadedFile(name, buffer.getvalue(), content_type=f"image/{image_format.lower()}")


def error_code(response):
    return response.json()["error"]["code"]
