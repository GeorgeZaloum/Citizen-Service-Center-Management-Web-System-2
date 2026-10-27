from pathlib import PurePath

from django.contrib.auth import login, logout, update_session_auth_hash
from django.http import FileResponse
from django.middleware.csrf import get_token
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import permissions, serializers, status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.views import APIView

from apps.accounts.selectors import filter_users, users_visible_to
from apps.accounts.services import AuthService, IdentityDocumentService, UserService
from shared.exceptions import ResourceNotFound
from shared.pagination import paginate
from shared.responses import envelope, success_response
from shared.utils import client_ip

from .permissions import CanManageUsers, CanRegister, CanTransferUsers
from .serializers import (
    ChangePasswordSerializer,
    CurrentUserSerializer,
    LoginSerializer,
    ProfileUpdateSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    StaffCreateSerializer,
    StaffUpdateSerializer,
    TransferSerializer,
    UserDetailSerializer,
    UserListQuerySerializer,
    UserSerializer,
    UserStatusSerializer,
)

SESSION_BACKEND = "django.contrib.auth.backends.ModelBackend"
IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg"}


def _current_user_data(request, user):
    return {"user": CurrentUserSerializer(user, context={"request": request}).data}


# ---------------------------------------------------------------------- authentication and own account
class CsrfTokenView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["auth"],
        summary="Get a CSRF token (also set as the csrftoken cookie)",
        responses={200: envelope("CsrfResponse", {"csrf_token": serializers.CharField()})},
    )
    def get(self, request):
        return success_response(data={"csrf_token": get_token(request)}, message="CSRF token")


class RegisterView(APIView):
    permission_classes = [CanRegister]
    parser_classes = [MultiPartParser, FormParser]

    @extend_schema(
        tags=["auth"],
        summary="UC-01 Register a citizen account (multipart, does not log in)",
        request=RegisterSerializer,
        responses={201: envelope("RegisterResponse", {"user": UserSerializer()})},
    )
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        data.pop("password_confirmation")
        user = AuthService.register_citizen(**data, ip=client_ip(request))
        return success_response(
            data={"user": UserSerializer(user).data}, message="Registered", status_code=status.HTTP_201_CREATED
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        tags=["auth"],
        summary="UC-02 Log in and open a session (the CSRF token rotates: read it again)",
        request=LoginSerializer,
        responses={200: envelope("LoginResponse", {"user": CurrentUserSerializer()})},
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = AuthService.login(**serializer.validated_data, ip=client_ip(request))
        login(request, user, backend=SESSION_BACKEND)
        return success_response(data=_current_user_data(request, user), message="Logged in")


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="UC-06 Log out and invalidate the session",
        request=None,
        responses={200: envelope("LogoutResponse")},
    )
    def post(self, request):
        AuthService.record_logout(user=request.user, ip=client_ip(request))
        logout(request)
        return success_response(message="Logged out")


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="Current user: role, department and capabilities",
        responses={200: envelope("MeResponse", {"user": CurrentUserSerializer()})},
    )
    def get(self, request):
        return success_response(data=_current_user_data(request, request.user), message="Current user")

    @extend_schema(
        tags=["auth"],
        summary="UC-08 Edit own profile (email and phone only)",
        request=ProfileUpdateSerializer,
        responses={200: envelope("ProfileUpdateResponse", {"user": CurrentUserSerializer()})},
    )
    def patch(self, request):
        serializer = ProfileUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = AuthService.update_profile(
            user=request.user, submitted_fields=request.data.keys(), **serializer.validated_data, ip=client_ip(request)
        )
        return success_response(data=_current_user_data(request, user), message="Profile updated")


class ChangePasswordView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["auth"],
        summary="UC-07 Change own password (other sessions end)",
        request=ChangePasswordSerializer,
        responses={200: envelope("ChangePasswordResponse")},
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = AuthService.change_password(
            user=request.user,
            current_password=serializer.validated_data["current_password"],
            new_password=serializer.validated_data["new_password"],
            current_session_key=request.session.session_key,
            ip=client_ip(request),
        )
        update_session_auth_hash(request, user)  # keeps the current session valid
        return success_response(message="Password changed")


# ---------------------------------------------------------------------- account management
class UserListCreateView(APIView):
    permission_classes = [CanManageUsers]

    @extend_schema(
        tags=["users"],
        operation_id="users_list",
        summary="UC-18 Browse users within the manager's scope",
        parameters=[UserListQuerySerializer],
        responses={200: envelope("UserListResponse", {"users": UserSerializer(many=True)}, paginated=True)},
    )
    def get(self, request):
        query = UserListQuerySerializer(data=request.query_params)
        query.is_valid(raise_exception=True)
        queryset = filter_users(users_visible_to(request.user), **query.validated_data)
        users, meta = paginate(request, queryset)
        return success_response(data={"users": UserSerializer(users, many=True).data}, message="Users list", meta=meta)

    @extend_schema(
        tags=["users"],
        summary="UC-04 / UC-05 Create a Department Manager or Employee account",
        request=StaffCreateSerializer,
        responses={201: envelope("StaffCreateResponse", {"user": UserSerializer()})},
    )
    def post(self, request):
        serializer = StaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = UserService.create_staff_account(actor=request.user, **serializer.validated_data, ip=client_ip(request))
        return success_response(
            data={"user": UserSerializer(user).data}, message="Account created", status_code=status.HTTP_201_CREATED
        )


class UserDetailView(APIView):
    permission_classes = [CanManageUsers]

    @extend_schema(
        tags=["users"],
        summary="Account details within the manager's scope",
        responses={200: envelope("UserDetailResponse", {"user": UserDetailSerializer()})},
    )
    def get(self, request, user_id: int):
        user = UserService.get_managed_user(actor=request.user, user_id=user_id)
        return success_response(data={"user": UserDetailSerializer(user).data}, message="User detail")

    @extend_schema(
        tags=["users"],
        summary="UC-15 Edit an employee's or manager's data",
        request=StaffUpdateSerializer,
        responses={200: envelope("UserUpdateResponse", {"user": UserDetailSerializer()})},
    )
    def patch(self, request, user_id: int):
        serializer = StaffUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        user = UserService.update_staff_account(
            actor=request.user,
            user_id=user_id,
            submitted_fields=request.data.keys(),
            **serializer.validated_data,
            ip=client_ip(request),
        )
        return success_response(data={"user": UserDetailSerializer(user).data}, message="User updated")


class ResetPasswordView(APIView):
    permission_classes = [CanManageUsers]

    @extend_schema(
        tags=["users"],
        summary="UC-03 Reset a user's password (ends their sessions, removes the lock)",
        request=ResetPasswordSerializer,
        responses={200: envelope("ResetPasswordResponse")},
    )
    def post(self, request, user_id: int):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        UserService.reset_password(
            actor=request.user,
            user_id=user_id,
            new_password=serializer.validated_data["new_password"],
            ip=client_ip(request),
        )
        return success_response(message="Password reset")


class UserStatusView(APIView):
    permission_classes = [CanManageUsers]

    @extend_schema(
        tags=["users"],
        summary="UC-16 Deactivate (reason required) or reactivate an account",
        request=UserStatusSerializer,
        responses={200: envelope("UserStatusResponse", {"user": UserDetailSerializer()})},
    )
    def patch(self, request, user_id: int):
        serializer = UserStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = UserService.set_status(
            actor=request.user, user_id=user_id, **serializer.validated_data, ip=client_ip(request)
        )
        return success_response(data={"user": UserDetailSerializer(user).data}, message="User status updated")


class UserTransferView(APIView):
    permission_classes = [CanTransferUsers]

    @extend_schema(
        tags=["users"],
        summary="UC-17 Transfer an employee or manager to another department",
        request=TransferSerializer,
        responses={200: envelope("UserTransferResponse", {"user": UserDetailSerializer()})},
    )
    def post(self, request, user_id: int):
        serializer = TransferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = UserService.transfer(
            actor=request.user,
            user_id=user_id,
            department_id=serializer.validated_data["department_id"],
            ip=client_ip(request),
        )
        return success_response(data={"user": UserDetailSerializer(user).data}, message="User transferred")


class IdentityDocumentView(APIView):
    """Returns the image itself (not the JSON envelope)."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        tags=["users"],
        summary="Download one side of a citizen's ID card (the citizen or the System Administrator)",
        responses={(200, "image/*"): OpenApiResponse(OpenApiTypes.BINARY)},
    )
    def get(self, request, user_id: int, side: str):
        if side.upper() not in {"FRONT", "BACK"}:
            raise ResourceNotFound("Document not found.")
        document = IdentityDocumentService.get_document(
            actor=request.user, user_id=user_id, side=side.upper(), ip=client_ip(request)
        )
        extension = PurePath(document.file_path.name).suffix.lower()
        response = FileResponse(
            document.file_path.open("rb"),
            content_type=IMAGE_TYPES.get(extension, "application/octet-stream"),
            filename=f"id-card-{side.lower()}{extension}",
        )
        response["Cache-Control"] = "private, no-store"
        return response
