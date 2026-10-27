import type { CurrentUser, Role, UserDetail } from "@/api/contracts";

/** The two interfaces that manage accounts: a Department Manager's or the System Administrator's. */
export type ManagerScope = "manager" | "admin";

export const USERS_BASE: Record<ManagerScope, string> = {
  manager: "/manager/employees",
  admin: "/admin/users",
};

const STAFF: Role[] = ["EMPLOYEE", "DEPT_MANAGER"];

/**
 * Actions offered on an account, mirroring UserService.SYSTEM_ADMIN_TARGETS and
 * DEPARTMENT_MANAGER_OPERATIONS. The server checks them again on every request.
 */
export function allowedUserActions(actor: CurrentUser, target: UserDetail) {
  const self = actor.id === target.id;
  if (actor.role === "DEPT_MANAGER") {
    return { edit: !self, resetPassword: !self, setStatus: !self, transfer: false, identityDocuments: false };
  }
  return {
    edit: !self && STAFF.includes(target.role),
    resetPassword: !self && (target.role === "DEPT_MANAGER" || target.role === "CITIZEN"),
    setStatus: !self,
    transfer: !self && STAFF.includes(target.role),
    identityDocuments: target.role === "CITIZEN",
  };
}
