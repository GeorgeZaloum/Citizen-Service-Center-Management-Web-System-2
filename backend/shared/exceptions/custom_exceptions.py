class DomainException(Exception):
    """Base of every expected business failure raised by the services.

    `code` is a stable value the front end maps to its own message; `details` carries
    extra data (for validation errors: {field: [messages]}).
    """

    default_code = "domain_error"
    default_detail = "Domain error."

    def __init__(self, detail=None, code=None, details=None):
        super().__init__(detail or self.default_detail)
        self.detail = detail or self.default_detail
        self.code = code or self.default_code
        self.details = details or {}


class ValidationFailed(DomainException):
    default_code = "validation_error"
    default_detail = "Some fields are invalid."


class AuthenticationFailedDomain(DomainException):
    default_code = "authentication_failed"
    default_detail = "Authentication failed."


class PermissionDeniedDomain(DomainException):
    default_code = "permission_denied"
    default_detail = "You do not have permission to perform this action."


class ResourceNotFound(DomainException):
    default_code = "not_found"
    default_detail = "Resource not found."


class BusinessRuleViolation(DomainException):
    default_code = "business_rule_violation"
    default_detail = "Business rule violated."


class InvalidStateTransition(BusinessRuleViolation):
    default_code = "invalid_state_transition"
    default_detail = "Invalid state transition requested."
