from django.urls import path

from .views import CenterSettingsView

urlpatterns = [
    path("", CenterSettingsView.as_view(), name="center-settings"),
]
