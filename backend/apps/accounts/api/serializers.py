from rest_framework import serializers
from rest_framework.reverse import reverse

from apps.accounts.models import IdentityDocument, User
from shared.constants import (
    ACCOUNT_STATUS_CHOICES,
    ROLE_CAPABILITIES,
    ROLE_CHOICES,
    ROLE_CITIZEN,
    STAFF_ROLE_CHOICES,
)
from shared.validators import national_id_validator, phone_validator


def _password_field():
    return serializers.CharField(max_length=128, write_only=True, trim_whitespace=False)


def _ensure_match(attrs, field, confirmation):
    if attrs.get(field) != attrs.get(confirmation):
        raise serializers.ValidationError({confirmation: ["The passwords do not match."]})


# ---------------------------------------------------------------------- output
class DepartmentRefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    status = serializers.CharField()


class UserSerializer(serializers.ModelSerializer):
    department = DepartmentRefSerializer(allow_null=True)

    class Meta:
        model = User
        fields = ["id", "full_name", "email", "phone", "role", "status", "job_title", "department", "created_at"]


class UserDetailSerializer(UserSerializer):
    class Meta(UserSerializer.Meta):
        fields = [*UserSerializer.Meta.fields, "national_id", "locked_until"]


class IdentityDocumentLinkSerializer(serializers.Serializer):
    side = serializers.CharField()
    url = serializers.CharField()


class CurrentUserSerializer(UserSerializer):
    """GET /auth/me/: the front end routes each role to its interface from this."""

    capabilities = serializers.SerializerMethodField()
    identity_documents = serializers.SerializerMethodField()

    class Meta(UserSerializer.Meta):
        fields = [*UserSerializer.Meta.fields, "national_id", "capabilities", "identity_documents"]

    def get_capabilities(self, obj) -> list[str]:
        return ROLE_CAPABILITIES.get(obj.role, [])

    def get_identity_documents(self, obj) -> list[dict]:
        if obj.role != ROLE_CITIZEN:
            return []
        request = self.context.get("request")
        return [
            {
                "side": side,
                "url": reverse(
                    "user-identity-document", kwargs={"user_id": obj.id, "side": side.lower()}, request=request
                ),
            }
            for side, _ in IdentityDocument.SIDE_CHOICES
        ]


# ---------------------------------------------------------------------- input: own account
class RegisterSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150)
    national_id = serializers.CharField(max_length=11, validators=[national_id_validator])
    email = serializers.EmailField(max_length=150)
    phone = serializers.CharField(max_length=10, validators=[phone_validator])
    password = _password_field()
    password_confirmation = _password_field()
    id_card_front = serializers.FileField(help_text="JPG or PNG image of the ID card front.")
    id_card_back = serializers.FileField(help_text="JPG or PNG image of the ID card back.")

    def validate(self, attrs):
        _ensure_match(attrs, "password", "password_confirmation")
        return attrs


class LoginSerializer(serializers.Serializer):
    email = serializers.CharField(max_length=150)
    password = _password_field()


class ChangePasswordSerializer(serializers.Serializer):
    current_password = _password_field()
    new_password = _password_field()
    new_password_confirmation = _password_field()

    def validate(self, attrs):
        _ensure_match(attrs, "new_password", "new_password_confirmation")
        return attrs


class ProfileUpdateSerializer(serializers.Serializer):
    """Email and phone only; any other submitted key is refused by AuthService (UC-08 4c)."""

    email = serializers.EmailField(max_length=150, required=False)
    phone = serializers.CharField(max_length=10, validators=[phone_validator], required=False)


# ---------------------------------------------------------------------- input: account management
class UserListQuerySerializer(serializers.Serializer):
    search = serializers.CharField(required=False, max_length=150)
    role = serializers.ChoiceField(choices=ROLE_CHOICES, required=False)
    status = serializers.ChoiceField(choices=ACCOUNT_STATUS_CHOICES, required=False)
    department_id = serializers.IntegerField(required=False, min_value=1)


class StaffCreateSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=STAFF_ROLE_CHOICES)
    full_name = serializers.CharField(max_length=150)
    email = serializers.EmailField(max_length=150)
    phone = serializers.CharField(max_length=10, validators=[phone_validator])
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)
    department_id = serializers.IntegerField(
        required=False, min_value=1, help_text="Required for a Department Manager; employees join their manager's."
    )
    password = _password_field()
    password_confirmation = _password_field()

    def validate(self, attrs):
        _ensure_match(attrs, "password", "password_confirmation")
        attrs.pop("password_confirmation")
        return attrs


class StaffUpdateSerializer(serializers.Serializer):
    full_name = serializers.CharField(max_length=150, required=False)
    email = serializers.EmailField(max_length=150, required=False)
    phone = serializers.CharField(max_length=10, validators=[phone_validator], required=False)
    job_title = serializers.CharField(max_length=100, required=False, allow_blank=True)


class ResetPasswordSerializer(serializers.Serializer):
    new_password = _password_field()
    new_password_confirmation = _password_field()

    def validate(self, attrs):
        _ensure_match(attrs, "new_password", "new_password_confirmation")
        return attrs


class UserStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=ACCOUNT_STATUS_CHOICES)
    reason = serializers.CharField(required=False, allow_blank=True, max_length=500, default="")


class TransferSerializer(serializers.Serializer):
    department_id = serializers.IntegerField(min_value=1)
