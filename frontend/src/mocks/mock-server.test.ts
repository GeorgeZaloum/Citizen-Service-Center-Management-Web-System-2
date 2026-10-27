// The mock server must answer like the backend, so the screens behave the same when
// VITE_USE_MOCKS switches to false. Every call here goes through the real API functions.
import { readCookie } from "@/api/csrf";
import { ApiError } from "@/api/errors";
import { http } from "@/api/http-client";
import { fetchCsrfToken, fetchMe, login, logout } from "@/features/auth/api";
import { getDepartment, listDepartments, setDepartmentStatus } from "@/features/departments/api";
import { createStaff, getUser, listUsers, setUserStatus } from "@/features/users/api";

import { mockAdapter, setMockLatency } from "./adapter";
import { DEMO_PASSWORD, resetMockDb } from "./db";

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  const error = await promise.catch((caught: unknown) => caught);
  expect(error).toBeInstanceOf(ApiError);
  return error as ApiError;
}

async function signInAs(email: string) {
  await fetchCsrfToken();
  return login({ email, password: DEMO_PASSWORD });
}

beforeEach(() => {
  document.cookie = "csrftoken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  resetMockDb();
  setMockLatency(0);
  http.defaults.adapter = mockAdapter;
});

describe("mock server: session and CSRF", () => {
  it("rejects an unsafe request without the CSRF token, like Django", async () => {
    const error = await failure(login({ email: "admin@csc.local", password: DEMO_PASSWORD }));
    expect(error.status).toBe(403);
    expect(error.code).toBe("csrf_failed");
  });

  it("rotates the token at login, and the client keeps working with the new one", async () => {
    await fetchCsrfToken();
    const before = readCookie("csrftoken");
    const user = await login({ email: "admin@csc.local", password: DEMO_PASSWORD });
    expect(user.role).toBe("SYSTEM_ADMIN");
    expect(user.capabilities).toContain("departments.manage");
    expect(readCookie("csrftoken")).not.toBe(before);
    await expect(logout()).resolves.toBeUndefined();
  });

  it("answers 401 not_authenticated after logout", async () => {
    await signInAs("citizen1@demo.csc");
    await logout();
    const error = await failure(fetchMe());
    expect(error.status).toBe(401);
    expect(error.code).toBe("not_authenticated");
  });

  it("returns the citizen's identity document links", async () => {
    const user = await signInAs("citizen1@demo.csc");
    expect(user.identity_documents.map((document) => document.side)).toEqual(["FRONT", "BACK"]);
  });
});

describe("mock server: UC-02 login rules", () => {
  it("uses one generic error for a wrong password", async () => {
    await fetchCsrfToken();
    const error = await failure(login({ email: "admin@csc.local", password: "Wrong-Pass1" }));
    expect(error.code).toBe("invalid_credentials");
  });

  it("locks the account after 5 failed attempts and gives retry_after_seconds", async () => {
    await fetchCsrfToken();
    for (let attempt = 1; attempt < 5; attempt += 1) {
      expect((await failure(login({ email: "citizen2@demo.csc", password: "x" }))).code).toBe(
        "invalid_credentials",
      );
    }
    const locked = await failure(login({ email: "citizen2@demo.csc", password: "x" }));
    expect(locked.code).toBe("account_locked");
    expect(locked.details.retry_after_seconds).toBe(900);
    // Even the right password is refused while locked.
    expect((await failure(login({ email: "citizen2@demo.csc", password: DEMO_PASSWORD }))).code).toBe(
      "account_locked",
    );
  });

  it("refuses a deactivated account with account_disabled", async () => {
    await fetchCsrfToken();
    const error = await failure(login({ email: "employee3.municipality@demo.csc", password: DEMO_PASSWORD }));
    expect(error.status).toBe(403);
    expect(error.code).toBe("account_disabled");
  });
});

describe("mock server: department isolation (FR-USR-08)", () => {
  it("shows a Department Manager only the employees of their department", async () => {
    await signInAs("manager.municipality@demo.csc");
    const { items, pagination } = await listUsers();
    expect(items.length).toBeGreaterThan(0);
    expect(items.every((user) => user.role === "EMPLOYEE" && user.department?.id === 1)).toBe(true);
    expect(pagination.total_items).toBe(items.length);
  });

  it("answers 404 for an account outside the manager's department", async () => {
    await signInAs("manager.municipality@demo.csc");
    const error = await failure(getUser(8)); // an employee of Traffic
    expect(error.status).toBe(404);
    expect(error.code).toBe("not_found");
  });

  it("refuses an employee in another department (UC-05 4c)", async () => {
    await signInAs("manager.municipality@demo.csc");
    const error = await failure(
      createStaff({
        role: "EMPLOYEE",
        full_name: "موظف جديد",
        email: "new@demo.csc",
        phone: "0955000000",
        password: "Strong-Pass1",
        password_confirmation: "Strong-Pass1",
        department_id: 2,
      }),
    );
    expect(error.code).toBe("scope_violation");
  });

  it("forbids deactivating your own account", async () => {
    const admin = await signInAs("admin@csc.local");
    const error = await failure(setUserStatus(admin.id, { status: "DISABLED", reason: "test" }));
    expect(error.code).toBe("self_action_forbidden");
  });

  it("suggests transferring an existing manager on email_taken (UC-04 4b)", async () => {
    await signInAs("admin@csc.local");
    const error = await failure(
      createStaff({
        role: "DEPT_MANAGER",
        full_name: "مدير",
        email: "manager.traffic@demo.csc",
        phone: "0955000001",
        password: "Strong-Pass1",
        password_confirmation: "Strong-Pass1",
        department_id: 1,
      }),
    );
    expect(error.code).toBe("email_taken");
    expect(error.details.existing_manager_id).toBe(3);
    expect(error.fieldErrors.email).toBeDefined();
  });
});

describe("mock server: departments (UC-11, UC-14)", () => {
  it("hides archived departments unless asked for", async () => {
    await signInAs("admin@csc.local");
    const { items } = await listDepartments();
    expect(items.some((department) => department.status === "ARCHIVED")).toBe(false);
    expect(items.find((department) => department.id === 6)?.has_managers).toBe(false);
  });

  it("offers only the actions allowed by the status", async () => {
    await signInAs("admin@csc.local");
    expect((await getDepartment(1)).actions).toEqual(["EDIT", "SUSPEND", "ADD_MANAGER", "REMOVE_MANAGER"]);
    expect((await getDepartment(4)).actions).toEqual(["EDIT", "ACTIVATE", "DELETE"]);
    expect((await getDepartment(5)).actions).toEqual(["EDIT", "ACTIVATE", "ARCHIVE"]);
    const suspended = await setDepartmentStatus(1, "SUSPENDED");
    expect(suspended.status).toBe("SUSPENDED");
    expect(suspended.actions).not.toContain("SUSPEND");
  });

  it("refuses the departments endpoints to a Department Manager", async () => {
    await signInAs("manager.traffic@demo.csc");
    const error = await failure(listDepartments());
    expect(error.status).toBe(403);
    expect(error.code).toBe("permission_denied");
  });
});
