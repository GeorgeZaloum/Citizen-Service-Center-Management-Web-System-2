import logging

from django.core.exceptions import PermissionDenied as DjangoPermissionDenied
from django.http import Http404
from rest_framework import status
from rest_framework.exceptions import (
    APIException,
    AuthenticationFailed,
    MethodNotAllowed,
    NotAuthenticated,
    NotFound,
    ParseError,
    PermissionDenied,
    UnsupportedMediaType,
    ValidationError,
)
from rest_framework.response import Response

from shared.responses import error_payload

from .custom_exceptions import (
    AuthenticationFailedDomain,
    BusinessRuleViolation,
    DomainException,
    PermissionDeniedDomain,
    ResourceNotFound,
    ValidationFailed,
)

logger = logging.getLogger(__name__)

# Domain exception class -> (error type, HTTP status). Order matters: first match wins.
DOMAIN_ERRORS = [
    (ValidationFailed, "validation_error", status.HTTP_400_BAD_REQUEST),
    (AuthenticationFailedDomain, "authentication_error", status.HTTP_401_UNAUTHORIZED),
    (PermissionDeniedDomain, "permission_error", status.HTTP_403_FORBIDDEN),
    (ResourceNotFound, "not_found", status.HTTP_404_NOT_FOUND),
    (BusinessRuleViolation, "business_rule_violation", status.HTTP_409_CONFLICT),
]


def custom_exception_handler(exc, context):
    """Every error leaves the API as {success: false, error: {type, code, details}}."""
    if isinstance(exc, DomainException):
        for exception_class, error_type, status_code in DOMAIN_ERRORS:
            if isinstance(exc, exception_class):
                return _response(error_type, exc.code, {"detail": exc.detail, **exc.details}, status_code)

    if isinstance(exc, ValidationError):
        return _response("validation_error", "validation_error", exc.detail, status.HTTP_400_BAD_REQUEST)
    if isinstance(exc, (NotAuthenticated, AuthenticationFailed)):
        return _response("authentication_error", "not_authenticated", {"detail": str(exc.detail)}, 401)
    if isinstance(exc, (PermissionDenied, DjangoPermissionDenied)):
        return _response("permission_error", _permission_code(exc), {"detail": str(exc)}, 403)
    if isinstance(exc, (NotFound, Http404)):
        return _response("not_found", "not_found", {"detail": "Resource not found."}, 404)
    if isinstance(exc, MethodNotAllowed):
        return _response("request_error", "method_not_allowed", {"detail": str(exc.detail)}, 405)
    if isinstance(exc, UnsupportedMediaType):
        return _response("request_error", "unsupported_media_type", {"detail": str(exc.detail)}, 415)
    if isinstance(exc, ParseError):
        return _response("request_error", "malformed_request", {"detail": str(exc.detail)}, 400)
    if isinstance(exc, APIException):
        return _response("request_error", exc.default_code, {"detail": str(exc.detail)}, exc.status_code)

    logger.exception("Unhandled error in %s", context.get("view"))
    return _response("server_error", "server_error", {"detail": "Unexpected server error."}, 500)


def _permission_code(exc):
    if str(exc).startswith("CSRF Failed"):
        return "csrf_failed"
    code = getattr(getattr(exc, "detail", None), "code", None)
    return code if code and code != "permission_denied" else "permission_denied"


def _response(error_type, code, details, status_code):
    return Response(error_payload(error_type, code, details), status=status_code)
