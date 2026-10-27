from django.urls import path

from .views import (
    ChangePasswordView,
    CsrfTokenView,
    IdentityDocumentView,
    LoginView,
    LogoutView,
    MeView,
    RegisterView,
    ResetPasswordView,
    UserDetailView,
    UserListCreateView,
    UserStatusView,
    UserTransferView,
)

urlpatterns = [
    path("csrf/", CsrfTokenView.as_view(), name="auth-csrf"),
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("me/", MeView.as_view(), name="auth-me"),
    path("me/password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("users/", UserListCreateView.as_view(), name="users-list-create"),
    path("users/<int:user_id>/", UserDetailView.as_view(), name="user-detail"),
    path("users/<int:user_id>/reset-password/", ResetPasswordView.as_view(), name="user-reset-password"),
    path("users/<int:user_id>/status/", UserStatusView.as_view(), name="user-status"),
    path("users/<int:user_id>/transfer/", UserTransferView.as_view(), name="user-transfer"),
    path(
        "users/<int:user_id>/identity-documents/<str:side>/",
        IdentityDocumentView.as_view(),
        name="user-identity-document",
    ),
]
