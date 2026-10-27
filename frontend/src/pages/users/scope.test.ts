import type { Role, UserDetail } from "@/api/contracts";
import { makeUser } from "@/test/render";

import { allowedUserActions } from "./scope";

function target(role: Role, id = 50): UserDetail {
  return { ...makeUser(role), id, locked_until: null };
}

describe("account actions per role (permission matrix)", () => {
  const admin = makeUser("SYSTEM_ADMIN", { id: 1 });
  const manager = makeUser("DEPT_MANAGER", { id: 2 });

  it("System Administrator: edit and transfer staff only", () => {
    expect(allowedUserActions(admin, target("EMPLOYEE"))).toMatchObject({ edit: true, transfer: true });
    expect(allowedUserActions(admin, target("DEPT_MANAGER"))).toMatchObject({ edit: true, transfer: true });
    expect(allowedUserActions(admin, target("CITIZEN"))).toMatchObject({ edit: false, transfer: false });
  });

  it("System Administrator: resets passwords of managers and citizens, not employees (UC-03)", () => {
    expect(allowedUserActions(admin, target("DEPT_MANAGER")).resetPassword).toBe(true);
    expect(allowedUserActions(admin, target("CITIZEN")).resetPassword).toBe(true);
    expect(allowedUserActions(admin, target("EMPLOYEE")).resetPassword).toBe(false);
  });

  it("System Administrator: sees the ID card images of citizens only", () => {
    expect(allowedUserActions(admin, target("CITIZEN")).identityDocuments).toBe(true);
    expect(allowedUserActions(admin, target("EMPLOYEE")).identityDocuments).toBe(false);
  });

  it("Department Manager: edit, reset and status on their employees, never transfer", () => {
    expect(allowedUserActions(manager, target("EMPLOYEE"))).toEqual({
      edit: true,
      resetPassword: true,
      setStatus: true,
      transfer: false,
      identityDocuments: false,
    });
  });

  it("no action on your own account (UC-16 4a)", () => {
    const self = allowedUserActions(admin, target("SYSTEM_ADMIN", admin.id));
    expect(self).toMatchObject({ edit: false, resetPassword: false, setStatus: false, transfer: false });
  });
});
