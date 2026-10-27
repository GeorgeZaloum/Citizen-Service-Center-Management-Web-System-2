from django.core.validators import RegexValidator

phone_validator = RegexValidator(r"^09\d{8}$", "Enter a Syrian mobile number in the form 09XXXXXXXX.")
national_id_validator = RegexValidator(r"^\d{11}$", "The national ID number must contain exactly 11 digits.")
