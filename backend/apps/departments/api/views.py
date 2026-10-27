from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.views import APIView

from apps.departments.selectors import departments_queryset
from apps.departments.services import DepartmentService
from shared.pagination import paginate
from shared.responses import envelope, success_response
from shared.utils import client_ip

from .permissions import CanManageDepartments
from .serializers import (
    DepartmentCreateSerializer,
    DepartmentDeleteSerializer,
    DepartmentDetailSerializer,
    DepartmentListQuerySerializer,
    DepartmentSerializer,
    DepartmentStatusSerializer,
    DepartmentUpdateSerializer,
    RemoveManagerSerializer,
)

DETAIL_RESPONSE = envelope("DepartmentResponse", {"department": DepartmentDetailSerializer()})


def _detail_data(department_id):
    """Fresh department page after a change (counts and actions are recomputed)."""
    return {"department": DepartmentDetailSerializer(DepartmentService.get_or_404(department_id)).data}


class DepartmentListCreateView(APIView):
    permission_classes = [CanManageDepartments]

    @extend_schema(
        tags=["departments"],
        operation_id="departments_list",
        summary="UC-14 Browse departments (archived ones only with ?status=ARCHIVED)",
        parameters=[DepartmentListQuerySerializer],
        responses={
            200: envelope("DepartmentListResponse", {"departments": DepartmentSerializer(many=True)}, paginated=True)
        },
    )
    def get(self, request):
        query = DepartmentListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        departments, meta = paginate(request, departments_queryset(**query.validated_data))
        return success_response(
            data={"departments": DepartmentSerializer(departments, many=True).data},
            message="Departments list",
            meta=meta,
        )

    @extend_schema(
        tags=["departments"],
        summary="UC-09 Create a department (active, without managers: add one with UC-04)",
        request=DepartmentCreateSerializer,
        responses={201: DETAIL_RESPONSE},
    )
    def post(self, request):
        serializer = DepartmentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = DepartmentService.create_department(
            actor=request.user, **serializer.validated_data, ip=client_ip(request)
        )
        return success_response(
            data=_detail_data(department.id), message="Department created", status_code=status.HTTP_201_CREATED
        )


class DepartmentDetailView(APIView):
    permission_classes = [CanManageDepartments]

    @extend_schema(
        tags=["departments"],
        summary="UC-14 Department page: managers, employees, counts and available actions",
        responses={200: DETAIL_RESPONSE},
    )
    def get(self, request, department_id: int):
        return success_response(data=_detail_data(department_id), message="Department detail")

    @extend_schema(
        tags=["departments"],
        summary="UC-10 Edit a department (not once archived)",
        request=DepartmentUpdateSerializer,
        responses={200: DETAIL_RESPONSE},
    )
    def patch(self, request, department_id: int):
        serializer = DepartmentUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        department = DepartmentService.get_or_404(department_id)
        DepartmentService.update_department(
            actor=request.user, department=department, attrs=serializer.validated_data, ip=client_ip(request)
        )
        return success_response(data=_detail_data(department_id), message="Department updated")

    @extend_schema(
        tags=["departments"],
        summary="UC-12 Delete a suspended department without accounts or requests",
        request=DepartmentDeleteSerializer,
        responses={200: envelope("DepartmentDeleteResponse")},
    )
    def delete(self, request, department_id: int):
        serializer = DepartmentDeleteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = DepartmentService.get_or_404(department_id)
        DepartmentService.delete_department(
            actor=request.user,
            department=department,
            confirm_name=serializer.validated_data["confirm_name"],
            ip=client_ip(request),
        )
        return success_response(message="Department deleted")


class DepartmentStatusView(APIView):
    permission_classes = [CanManageDepartments]

    @extend_schema(
        tags=["departments"],
        summary="UC-11 Suspend or activate a department",
        request=DepartmentStatusSerializer,
        responses={200: DETAIL_RESPONSE},
    )
    def patch(self, request, department_id: int):
        serializer = DepartmentStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = DepartmentService.get_or_404(department_id)
        DepartmentService.change_status(
            actor=request.user,
            department=department,
            to_status=serializer.validated_data["status"],
            ip=client_ip(request),
        )
        return success_response(data=_detail_data(department_id), message="Department status updated")


class DepartmentArchiveView(APIView):
    permission_classes = [CanManageDepartments]

    @extend_schema(
        tags=["departments"],
        summary="UC-12 2b Archive a suspended department linked to requests",
        request=None,
        responses={200: DETAIL_RESPONSE},
    )
    def post(self, request, department_id: int):
        department = DepartmentService.get_or_404(department_id)
        DepartmentService.archive_department(actor=request.user, department=department, ip=client_ip(request))
        return success_response(data=_detail_data(department_id), message="Department archived")


class RemoveManagerView(APIView):
    permission_classes = [CanManageDepartments]

    @extend_schema(
        tags=["departments"],
        summary="UC-13 Remove a manager: deactivate the account, or transfer it (UC-17)",
        request=RemoveManagerSerializer,
        responses={
            200: envelope(
                "RemoveManagerResponse",
                {
                    "left_without_manager": serializers.BooleanField(),
                    "department": DepartmentDetailSerializer(),
                },
            )
        },
    )
    def post(self, request, department_id: int, user_id: int):
        serializer = RemoveManagerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        department = DepartmentService.get_or_404(department_id)
        left_without_manager = DepartmentService.remove_manager(
            actor=request.user,
            department=department,
            user_id=user_id,
            **serializer.validated_data,
            ip=client_ip(request),
        )
        return success_response(
            data={"left_without_manager": left_without_manager, **_detail_data(department_id)},
            message="Manager removed",
        )
