from drf_spectacular.utils import extend_schema
from rest_framework.views import APIView

from apps.center_settings.selectors import current_center_settings
from apps.center_settings.services import CenterSettingsService
from shared.responses import envelope, success_response
from shared.utils import client_ip

from .permissions import CenterSettingsPermission
from .serializers import CenterSettingsSerializer

RESPONSE = envelope("CenterSettingsResponse", {"center_settings": CenterSettingsSerializer()})


class CenterSettingsView(APIView):
    permission_classes = [CenterSettingsPermission]

    @extend_schema(
        tags=["center-settings"],
        summary="Center information: name, address, contact numbers, working hours (public)",
        responses={200: RESPONSE},
    )
    def get(self, request):
        data = {"center_settings": CenterSettingsSerializer(current_center_settings()).data}
        return success_response(data=data, message="Center settings")

    @extend_schema(
        tags=["center-settings"],
        summary="UC-19 Configure the center information",
        request=CenterSettingsSerializer,
        responses={200: RESPONSE},
    )
    def put(self, request):
        serializer = CenterSettingsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        settings_row = CenterSettingsService.update(
            actor=request.user, attrs=serializer.validated_data, ip=client_ip(request)
        )
        return success_response(
            data={"center_settings": CenterSettingsSerializer(settings_row).data}, message="Center settings updated"
        )
