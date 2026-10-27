import tempfile
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.test import SimpleTestCase


class OpenApiContractTests(SimpleTestCase):
    """docs/openapi.yaml is the contract the front end builds on: it must match the code.

    If this test fails, regenerate it: python manage.py spectacular --file docs/openapi.yaml
    """

    def test_exported_contract_is_up_to_date(self):
        with tempfile.TemporaryDirectory() as folder:
            current = Path(folder) / "openapi.yaml"
            call_command("spectacular", "--file", str(current), "--validate", "--fail-on-warn")
            exported = (Path(settings.BASE_DIR) / "docs" / "openapi.yaml").read_text(encoding="utf-8")
            self.assertEqual(exported, current.read_text(encoding="utf-8"))
