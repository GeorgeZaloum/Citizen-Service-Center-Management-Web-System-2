from apps.departments.models import Department


class DepartmentRepository:
    @staticmethod
    def get_by_id(department_id: int) -> Department | None:
        return Department.objects.filter(id=department_id).first()

    @staticmethod
    def find_by_name(name: str, exclude_id=None) -> Department | None:
        """Names are unique ignoring case, archived departments included."""
        return Department.objects.filter(name__iexact=name.strip()).exclude(id=exclude_id).first()

    @staticmethod
    def any_active() -> bool:
        return Department.objects.filter(status=Department.STATUS_ACTIVE).exists()

    @staticmethod
    def other_active_exists(exclude_id=None) -> bool:
        return Department.objects.filter(status=Department.STATUS_ACTIVE).exclude(id=exclude_id).exists()

    @staticmethod
    def create(**kwargs) -> Department:
        return Department.objects.create(**kwargs)

    @staticmethod
    def save(department: Department, **attrs) -> Department:
        for key, value in attrs.items():
            setattr(department, key, value)
        department.save(update_fields=list(attrs.keys()))
        return department

    @staticmethod
    def delete(department: Department) -> None:
        department.delete()
