import AdminPanelSettingsRounded from "@mui/icons-material/AdminPanelSettingsRounded";
import ApartmentRounded from "@mui/icons-material/ApartmentRounded";
import BadgeRounded from "@mui/icons-material/BadgeRounded";
import GroupsRounded from "@mui/icons-material/GroupsRounded";
import HomeRounded from "@mui/icons-material/HomeRounded";
import PersonRounded from "@mui/icons-material/PersonRounded";
import SettingsRounded from "@mui/icons-material/SettingsRounded";
import type { SvgIconComponent } from "@mui/icons-material";

import type { Role } from "@/api/contracts";

export interface NavItem {
  /** i18n key under `nav.` */
  labelKey: string;
  to: string;
  icon: SvgIconComponent;
  /** Match only this exact path (home links). */
  end?: boolean;
}

const PROFILE: NavItem = { labelKey: "nav.profile", to: "/account/profile", icon: PersonRounded };

/** Each role's menu (the permission matrix, section 5 of the project file). */
export const NAVIGATION: Record<Role, NavItem[]> = {
  CITIZEN: [{ labelKey: "nav.home", to: "/citizen", icon: HomeRounded, end: true }, PROFILE],
  EMPLOYEE: [{ labelKey: "nav.home", to: "/employee", icon: HomeRounded, end: true }, PROFILE],
  DEPT_MANAGER: [
    { labelKey: "nav.home", to: "/manager", icon: HomeRounded, end: true },
    { labelKey: "nav.employees", to: "/manager/employees", icon: BadgeRounded },
    PROFILE,
  ],
  SYSTEM_ADMIN: [
    { labelKey: "nav.home", to: "/admin", icon: AdminPanelSettingsRounded, end: true },
    { labelKey: "nav.departments", to: "/admin/departments", icon: ApartmentRounded },
    { labelKey: "nav.users", to: "/admin/users", icon: GroupsRounded },
    { labelKey: "nav.settings", to: "/admin/settings", icon: SettingsRounded },
    PROFILE,
  ],
};
