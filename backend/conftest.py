import pytest


@pytest.fixture(autouse=True)
def _test_settings(settings, tmp_path):
    """Uploaded files go to a temporary folder, and password hashing is fast in tests."""
    settings.MEDIA_ROOT = tmp_path / "media"
    settings.PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
