from .roles import ROLE_CITIZEN, ROLE_DEPT_MANAGER, ROLE_EMPLOYEE, ROLE_SYSTEM_ADMIN

# What each role may do in the user interface, returned by GET /api/v1/auth/me/ so the
# front end can route each role. The server checks every rule again on every request.
_OWN_ACCOUNT = ["profile.view", "profile.update", "password.change"]

ROLE_CAPABILITIES = {
    ROLE_CITIZEN: [*_OWN_ACCOUNT, "identity_documents.view_own"],
    ROLE_EMPLOYEE: [*_OWN_ACCOUNT],
    ROLE_DEPT_MANAGER: [
        *_OWN_ACCOUNT,
        "employees.create",
        "users.view",
        "users.update",
        "users.reset_password",
        "users.set_status",
    ],
    ROLE_SYSTEM_ADMIN: [
        *_OWN_ACCOUNT,
        "departments.manage",
        "department_managers.create",
        "users.view",
        "users.update",
        "users.reset_password",
        "users.set_status",
        "users.transfer",
        "identity_documents.view",
        "center_settings.manage",
    ],
}
