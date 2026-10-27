from drf_spectacular.extensions import OpenApiAuthenticationExtension
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import SAFE_METHODS


class CsrfSessionAuthentication(SessionAuthentication):
    """Session authentication that also checks CSRF on anonymous unsafe requests.

    DRF only checks CSRF for logged-in users; login and registration need it too.
    """

    def authenticate(self, request):
        result = super().authenticate(request)
        if result is None and request.method not in SAFE_METHODS:
            self.enforce_csrf(request)
        return result


class CsrfSessionAuthenticationScheme(OpenApiAuthenticationExtension):
    """Documents the session cookie in the OpenAPI contract."""

    target_class = "shared.permissions.authentication.CsrfSessionAuthentication"
    name = "sessionAuth"

    def get_security_definition(self, auto_schema):
        return {"type": "apiKey", "in": "cookie", "name": "sessionid"}
