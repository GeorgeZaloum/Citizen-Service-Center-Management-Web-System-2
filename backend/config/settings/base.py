import os
from pathlib import Path

from corsheaders.defaults import default_headers

BASE_DIR = Path(__file__).resolve().parent.parent.parent
REPOSITORY_DIR = BASE_DIR.parent


def _load_env_file() -> None:
    """Read `.env` from the repository root (values already in the environment win)."""
    env_path = REPOSITORY_DIR / ".env"
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key and key not in os.environ:
            os.environ[key] = value


_load_env_file()

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "unsafe-dev-secret-key")
DEBUG = os.environ.get("DJANGO_DEBUG", "True").lower() == "true"
ALLOWED_HOSTS = [h for h in os.environ.get("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    "apps.departments.apps.DepartmentsConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.audit.apps.AuditConfig",
    "apps.center_settings.apps.CenterSettingsConfig",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("DB_NAME", "citizen_service_center"),
        "USER": os.environ.get("DB_USER", "postgres"),
        "PASSWORD": os.environ.get("DB_PASSWORD", ""),
        "HOST": os.environ.get("DB_HOST", "localhost"),
        "PORT": os.environ.get("DB_PORT", "5432"),
    }
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Asia/Damascus"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
# Private uploads (citizen ID card images). There is no MEDIA_URL route on purpose:
# files are downloaded only through permission-checked endpoints.
MEDIA_ROOT = BASE_DIR / "media"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"
AUTHENTICATION_BACKENDS = ["django.contrib.auth.backends.ModelBackend"]

# Django sessions in the ERD table `sessions`, linked to their user so they can be revoked.
SESSION_ENGINE = "apps.accounts.repositories.session_store"
SESSION_COOKIE_AGE = int(os.environ.get("SESSION_AGE_HOURS", "8")) * 60 * 60
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_HTTPONLY = False  # The front end reads the token and sends it as X-CSRFToken.
CSRF_COOKIE_SAMESITE = "Lax"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("shared.permissions.authentication.CsrfSessionAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_RENDERER_CLASSES": ("rest_framework.renderers.JSONRenderer",),
    "EXCEPTION_HANDLER": "shared.exceptions.handlers.custom_exception_handler",
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Citizen Service Center Management Web System API",
    "DESCRIPTION": (
        "Session authentication with CSRF: call GET /api/v1/auth/csrf/ first and send the token "
        "in the X-CSRFToken header on every POST, PUT, PATCH and DELETE. Success bodies are "
        "{success, message, data, meta}; error bodies are {success: false, error: {type, code, details}}."
    ),
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "COMPONENT_SPLIT_REQUEST": True,
    "ENUM_NAME_OVERRIDES": {
        "RoleEnum": "shared.constants.roles.ROLE_CHOICES",
        "StaffRoleEnum": "shared.constants.roles.STAFF_ROLE_CHOICES",
        "AccountStatusEnum": "shared.constants.statuses.ACCOUNT_STATUS_CHOICES",
        "DepartmentStatusEnum": "apps.departments.models.department.Department.STATUS_CHOICES",
        "DepartmentStatusChangeEnum": "apps.departments.models.department.Department.SUSPEND_ACTIVATE_CHOICES",
    },
}

CORS_ALLOWED_ORIGINS = [u for u in os.environ.get("CORS_ALLOWED_ORIGINS", "http://localhost:5173").split(",") if u]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["x-csrftoken"]
CSRF_TRUSTED_ORIGINS = CORS_ALLOWED_ORIGINS

# Business rules configured per installation
LOGIN_MAX_FAILED_ATTEMPTS = int(os.environ.get("LOGIN_MAX_FAILED_ATTEMPTS", "5"))
LOGIN_LOCK_MINUTES = int(os.environ.get("LOGIN_LOCK_MINUTES", "15"))
ID_IMAGE_MAX_BYTES = int(os.environ.get("ID_IMAGE_MAX_MB", "5")) * 1024 * 1024

SEED_ADMIN = {
    "email": os.environ.get("SEED_ADMIN_EMAIL", "admin@csc.local"),
    "password": os.environ.get("SEED_ADMIN_PASSWORD", ""),
    "full_name": os.environ.get("SEED_ADMIN_FULL_NAME", "System Administrator"),
    "phone": os.environ.get("SEED_ADMIN_PHONE", "0900000000"),
}
