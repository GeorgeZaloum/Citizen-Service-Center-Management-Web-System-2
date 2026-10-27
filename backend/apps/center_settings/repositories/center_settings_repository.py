from apps.center_settings.models import SINGLETON_ID, CenterSettings


class CenterSettingsRepository:
    @staticmethod
    def get():
        """The single settings row, or None before it is first saved."""
        return CenterSettings.objects.filter(id=SINGLETON_ID).first()

    @staticmethod
    def save(settings_row: CenterSettings) -> CenterSettings:
        settings_row.save()
        return settings_row
