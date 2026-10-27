from apps.center_settings.models import CenterSettings
from apps.center_settings.repositories import CenterSettingsRepository


def current_center_settings() -> CenterSettings:
    """The saved information, or the defaults before the first configuration."""
    return CenterSettingsRepository.get() or CenterSettings.defaults()
