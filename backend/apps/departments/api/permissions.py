from shared.permissions import IsSystemAdmin


class CanManageDepartments(IsSystemAdmin):
    """Every department operation belongs to the System Administrator (FR-DEP-02 – FR-DEP-07)."""
