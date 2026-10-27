from django.urls import path

from .views import (
    DepartmentArchiveView,
    DepartmentDetailView,
    DepartmentListCreateView,
    DepartmentStatusView,
    RemoveManagerView,
)

urlpatterns = [
    path("", DepartmentListCreateView.as_view(), name="departments-list-create"),
    path("<int:department_id>/", DepartmentDetailView.as_view(), name="departments-detail"),
    path("<int:department_id>/status/", DepartmentStatusView.as_view(), name="departments-status"),
    path("<int:department_id>/archive/", DepartmentArchiveView.as_view(), name="departments-archive"),
    path(
        "<int:department_id>/managers/<int:user_id>/remove/",
        RemoveManagerView.as_view(),
        name="departments-remove-manager",
    ),
]
