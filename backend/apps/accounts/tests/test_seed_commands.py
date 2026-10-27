from io import StringIO

from django.core.management import CommandError, call_command
from django.test import TestCase, override_settings

from apps.accounts.models import IdentityDocument, User
from apps.center_settings.models import CenterSettings
from apps.departments.models import Department
from shared.constants import ROLE_CITIZEN, ROLE_DEPT_MANAGER, ROLE_EMPLOYEE, ROLE_SYSTEM_ADMIN

ADMIN = {"email": "admin@csc.test", "password": "Admin-Pass1", "full_name": "First Admin", "phone": "0900000099"}


def run(command):
    output = StringIO()
    call_command(command, stdout=output)
    return output.getvalue()


@override_settings(SEED_ADMIN=ADMIN)
class SeedCommandTests(TestCase):
    def test_seed_data_creates_the_installation_data_once(self):
        run("seed_data")
        self.assertEqual(
            sorted(Department.objects.values_list("name", flat=True)), ["Civil Registry", "Municipality", "Traffic"]
        )
        self.assertEqual(CenterSettings.objects.count(), 1)
        admin = User.objects.get(email="admin@csc.test")
        self.assertEqual(admin.role, ROLE_SYSTEM_ADMIN)
        self.assertTrue(admin.check_password("Admin-Pass1"))

        self.assertNotIn("created", run("seed_data"))
        self.assertEqual((Department.objects.count(), User.objects.count()), (3, 1))

    @override_settings(SEED_ADMIN={**ADMIN, "password": "weak"})
    def test_seed_data_refuses_a_weak_administrator_password(self):
        with self.assertRaisesMessage(CommandError, "not strong enough"):
            run("seed_data")

    def test_seed_local_data_creates_staff_per_department_and_citizens(self):
        run("seed_data")
        run("seed_local_data")
        self.assertEqual(User.objects.filter(role=ROLE_DEPT_MANAGER).count(), 3)
        self.assertEqual(User.objects.filter(role=ROLE_EMPLOYEE).count(), 6)
        self.assertEqual(User.objects.filter(role=ROLE_CITIZEN).count(), 2)
        self.assertEqual(IdentityDocument.objects.count(), 4)
        employee = User.objects.get(email="employee1.traffic@demo.csc")
        self.assertEqual(employee.department.name, "Traffic")
        self.assertTrue(employee.check_password("Demo-Pass1"))

        run("seed_local_data")
        self.assertEqual(User.objects.count(), 12)

    def test_seed_local_data_needs_seed_data_first(self):
        with self.assertRaisesMessage(CommandError, "seed_data"):
            run("seed_local_data")
