from apps.accounts.models import User
from shared.constants import ACCOUNT_DISABLED


class UserRepository:
    @staticmethod
    def create_user(**kwargs) -> User:
        password = kwargs.pop("password")
        return User.objects.create_user(password=password, **kwargs)

    @staticmethod
    def get_by_id(user_id: int) -> User | None:
        return User.objects.select_related("department").filter(id=user_id).first()

    @staticmethod
    def get_by_email(email: str) -> User | None:
        return User.objects.select_related("department").filter(email__iexact=email.strip()).first()

    @staticmethod
    def taken_fields(*, email=None, phone=None, national_id=None, exclude_id=None) -> set:
        """Which of the unique contact values already belong to another account."""
        others = User.objects.exclude(id=exclude_id) if exclude_id else User.objects.all()
        checks = {
            "email": ("email__iexact", email),
            "phone": ("phone", phone),
            "national_id": ("national_id", national_id),
        }
        taken = set()
        for field, (lookup, value) in checks.items():
            if value and others.filter(**{lookup: value}).exists():
                taken.add(field)
        return taken

    @staticmethod
    def detach_inactive_from_department(department_id: int) -> int:
        """Before a department is deleted, its deactivated accounts keep their data but lose the link."""
        return User.objects.filter(department_id=department_id, status=ACCOUNT_DISABLED).update(department=None)

    @staticmethod
    def save(user: User, **attrs) -> User:
        for key, value in attrs.items():
            setattr(user, key, value)
        user.save(update_fields=list(attrs.keys()))
        return user
