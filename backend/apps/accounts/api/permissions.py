from shared.permissions import IsAccountManager, IsAnonymousOnly, IsSystemAdmin


class CanRegister(IsAnonymousOnly):
    """Self-registration is for visitors only, and only creates citizens (FR-USR-03)."""


class CanManageUsers(IsAccountManager):
    """Department Managers (own employees) and the System Administrator; the exact scope
    is checked again by UserService for every account."""


class CanTransferUsers(IsSystemAdmin):
    """UC-17 belongs to the System Administrator."""
