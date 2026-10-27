from rest_framework import serializers

from apps.departments.models import Department
from apps.departments.selectors import count_open_requests, count_services, department_employees
from apps.departments.services import REMOVE_BY_DEACTIVATION, REMOVE_BY_TRANSFER, DepartmentService


class MemberSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    status = serializers.CharField()


# ---------------------------------------------------------------------- output
class DepartmentSerializer(serializers.ModelSerializer):
    """A row of the departments list (UC-14 step 2)."""

    managers = MemberSerializer(source="active_managers", many=True, read_only=True)
    has_managers = serializers.SerializerMethodField(help_text="False shows the 'no manager' alert.")
    employee_count = serializers.IntegerField(read_only=True)
    service_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = [
            "id",
            "name",
            "description",
            "authority",
            "status",
            "created_at",
            "managers",
            "has_managers",
            "employee_count",
            "service_count",
        ]

    def get_has_managers(self, obj) -> bool:
        return bool(obj.active_managers)

    def get_service_count(self, obj) -> int:
        return count_services(obj.id)


class DepartmentDetailSerializer(DepartmentSerializer):
    """The department page (UC-14 step 4), with the actions allowed for its status."""

    employees = serializers.SerializerMethodField()
    open_request_count = serializers.SerializerMethodField()
    actions = serializers.SerializerMethodField()

    class Meta(DepartmentSerializer.Meta):
        fields = [*DepartmentSerializer.Meta.fields, "employees", "open_request_count", "actions"]

    def get_employees(self, obj) -> list[dict]:
        return MemberSerializer(department_employees(obj.id), many=True).data

    def get_open_request_count(self, obj) -> int:
        return count_open_requests(obj.id)

    def get_actions(self, obj) -> list[str]:
        return DepartmentService.allowed_actions(obj)


# ---------------------------------------------------------------------- input
class DepartmentListQuerySerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Department.STATUS_CHOICES, required=False)
    search = serializers.CharField(required=False, max_length=150)


class DepartmentCreateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150)
    authority = serializers.CharField(max_length=150)
    description = serializers.CharField(required=False, allow_blank=True, default="")


class DepartmentUpdateSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=150, required=False)
    authority = serializers.CharField(max_length=150, required=False)
    description = serializers.CharField(required=False, allow_blank=True)


class DepartmentStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Department.SUSPEND_ACTIVATE_CHOICES)


class DepartmentDeleteSerializer(serializers.Serializer):
    confirm_name = serializers.CharField(max_length=150)


class RemoveManagerSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=[REMOVE_BY_DEACTIVATION, REMOVE_BY_TRANSFER])
    target_department_id = serializers.IntegerField(
        required=False, min_value=1, help_text="Required when mode is TRANSFER."
    )
