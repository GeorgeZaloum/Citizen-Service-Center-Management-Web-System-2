import type { Capability, CurrentUser, Role } from "@/api/contracts";

/** UC-02 step 4: each role lands on its own interface. */
export const ROLE_HOME: Record<Role, string> = {
  CITIZEN: "/citizen",
  EMPLOYEE: "/employee",
  DEPT_MANAGER: "/manager",
  SYSTEM_ADMIN: "/admin",
};

/** Managers get the collapsible sidebar; citizens and employees a top bar. */
export const MANAGER_ROLES: Role[] = ["DEPT_MANAGER", "SYSTEM_ADMIN"];

export function homeFor(user: Pick<CurrentUser, "role"> | null | undefined): string {
  return user ? ROLE_HOME[user.role] : "/login";
}

export function hasCapability(user: CurrentUser | null | undefined, capability: Capability): boolean {
  return !!user && (user.capabilities as string[]).includes(capability);
}

export function isManager(user: Pick<CurrentUser, "role"> | null | undefined): boolean {
  return !!user && MANAGER_ROLES.includes(user.role);
}
