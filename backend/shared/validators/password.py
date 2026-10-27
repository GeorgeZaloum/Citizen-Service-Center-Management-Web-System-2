from shared.exceptions import ValidationFailed

MIN_LENGTH = 8
MAX_LENGTH = 128


def password_problems(password):
    """Every broken rule of "the password is strong" (UC-01, UC-03 – UC-05, UC-07)."""
    problems = []
    if len(password) < MIN_LENGTH:
        problems.append(f"The password must contain at least {MIN_LENGTH} characters.")
    if len(password) > MAX_LENGTH:
        problems.append(f"The password must contain at most {MAX_LENGTH} characters.")
    if not any(char.isupper() for char in password):
        problems.append("The password must contain an uppercase letter.")
    if not any(char.islower() for char in password):
        problems.append("The password must contain a lowercase letter.")
    if not any(char.isdigit() for char in password):
        problems.append("The password must contain a digit.")
    return problems


def validate_password_strength(password, field="password"):
    problems = password_problems(password)
    if problems:
        raise ValidationFailed("The password is not strong enough.", code="weak_password", details={field: problems})
