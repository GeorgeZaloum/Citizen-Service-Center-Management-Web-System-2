ROLE_CITIZEN = "CITIZEN"
ROLE_EMPLOYEE = "EMPLOYEE"
ROLE_DEPT_MANAGER = "DEPT_MANAGER"
ROLE_SYSTEM_ADMIN = "SYSTEM_ADMIN"

ROLE_CHOICES = [
    (ROLE_CITIZEN, "Citizen"),
    (ROLE_EMPLOYEE, "Employee"),
    (ROLE_DEPT_MANAGER, "Department Manager"),
    (ROLE_SYSTEM_ADMIN, "System Administrator"),
]

# The roles a manager can create through the API (UC-04, UC-05).
STAFF_ROLE_CHOICES = [
    (ROLE_EMPLOYEE, "Employee"),
    (ROLE_DEPT_MANAGER, "Department Manager"),
]

ALL_ROLES = {ROLE_CITIZEN, ROLE_EMPLOYEE, ROLE_DEPT_MANAGER, ROLE_SYSTEM_ADMIN}
# Roles that belong to a department.
STAFF_ROLES = {ROLE_EMPLOYEE, ROLE_DEPT_MANAGER}
