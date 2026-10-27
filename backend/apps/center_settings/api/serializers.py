from rest_framework import serializers

from apps.center_settings.models import CenterSettings


class CenterSettingsSerializer(serializers.ModelSerializer):
    work_start = serializers.TimeField(format="%H:%M")
    work_end = serializers.TimeField(format="%H:%M")

    class Meta:
        model = CenterSettings
        fields = ["name", "address", "contact_phones", "work_start", "work_end"]
