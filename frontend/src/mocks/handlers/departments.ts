import type { DepartmentStatus } from "@/api/contracts";

import { db, type MockDepartment } from "../db";
import {
  FieldErrors,
  activeDepartmentAccounts,
  activeManagers,
  errors,
  findDepartment,
  ok,
  paginate,
  requireRole,
  str,
  toDepartment,
  toDepartmentDetail,
  type MockRequest,
  type MockResponse,
} from "../core";
import type { Route } from "../router";

// DepartmentService.ALLOWED_TRANSITIONS
const ALLOWED_TRANSITIONS: Record<DepartmentStatus, DepartmentStatus[]> = {
  ACTIVE: ["SUSPENDED"],
  SUSPENDED: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
};

function departmentOr404(id: string): MockDepartment {
  const department = findDepartment(Number(id));
  if (!department) errors.notFound("Department not found.");
  return department;
}

function ensureNotArchived(department: MockDepartment): void {
  if (department.status === "ARCHIVED") {
    errors.conflict("department_archived", "The department is archived and cannot be modified.");
  }
}

/** Names are unique, archived departments included (UC-09 4b, UC-10 4b). */
function ensureNameAvailable(name: string, excludeId?: number): void {
  const existing = db.state.departments.find(
    (department) => department.id !== excludeId && department.name.toLowerCase() === name.toLowerCase(),
  );
  if (existing) {
    errors.conflict("department_name_taken", "A department with the same name already exists.", {
      name: ["A department with the same name already exists."],
      existing_status: existing.status,
    });
  }
}

/** UC-12 precondition (suspended) and 2a (no active accounts). */
function ensureRemovable(department: MockDepartment): void {
  ensureNotArchived(department);
  if (department.status !== "SUSPENDED") {
    errors.conflict("department_not_suspended", "Suspend the department first.");
  }
  const accounts = activeDepartmentAccounts(department.id);
  if (accounts.length) {
    errors.conflict(
      "department_has_active_accounts",
      "Active accounts are linked to the department. Transfer or deactivate them first.",
      { accounts: accounts.map(({ id, full_name, role }) => ({ id, full_name, role })) },
    );
  }
}

/** UC-14: archived departments only with ?status=ARCHIVED. */
function list({ query }: MockRequest): MockResponse {
  requireRole("SYSTEM_ADMIN");
  const status = query.get("status");
  const search = (query.get("search") ?? "").trim().toLowerCase();
  const filtered = db.state.departments
    .filter((department) => (status ? department.status === status : department.status !== "ARCHIVED"))
    .filter((department) => !search || department.name.toLowerCase().includes(search))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));
  const { page, pagination } = paginate(filtered, query);
  return ok({ departments: page.map(toDepartment) }, "Departments list", 200, { pagination });
}

/** UC-09 */
function create({ body }: MockRequest): MockResponse {
  requireRole("SYSTEM_ADMIN");
  new FieldErrors()
    .required(body, "name", "authority")
    .maxLength(body, "name", 150)
    .maxLength(body, "authority", 150)
    .throwIfAny();
  ensureNameAvailable(str(body, "name"));
  const department: MockDepartment = {
    id: db.state.nextDepartmentId++,
    name: str(body, "name"),
    authority: str(body, "authority"),
    description: str(body, "description"),
    status: "ACTIVE",
    created_at: new Date().toISOString(),
    request_count: 0,
  };
  db.state.departments.push(department);
  return ok({ department: toDepartmentDetail(department) }, "Department created", 201);
}

function detail(_request: MockRequest, params: string[]): MockResponse {
  requireRole("SYSTEM_ADMIN");
  return ok({ department: toDepartmentDetail(departmentOr404(params[0])) }, "Department detail");
}

/** UC-10 */
function update({ body }: MockRequest, params: string[]): MockResponse {
  requireRole("SYSTEM_ADMIN");
  const department = departmentOr404(params[0]);
  const fieldErrors = new FieldErrors().maxLength(body, "name", 150).maxLength(body, "authority", 150);
  for (const field of ["name", "authority"]) {
    if (field in body && !str(body, field)) fieldErrors.add(field, "This field may not be blank.");
  }
  fieldErrors.throwIfAny();
  ensureNotArchived(department);
  if ("name" in body) ensureNameAvailable(str(body, "name"), department.id);
  for (const field of ["name", "authority", "description"] as const) {
    if (field in body) department[field] = str(body, field);
  }
  return ok({ department: toDepartmentDetail(department) }, "Department updated");
}

/** UC-12: suspended, no active accounts, no requests, and the name typed exactly. */
function remove({ body }: MockRequest, params: string[]): MockResponse {
  requireRole("SYSTEM_ADMIN");
  const department = departmentOr404(params[0]);
  new FieldErrors().required(body, "confirm_name").throwIfAny();
  ensureRemovable(department);
  if (department.request_count) {
    errors.conflict(
      "department_has_requests",
      "The department is linked to requests. Archive it instead of deleting it.",
    );
  }
  if (str(body, "confirm_name") !== department.name) {
    errors.validation(
      { confirm_name: ["Type the department name exactly to confirm."] },
      "Type the department name exactly to confirm.",
      "confirmation_mismatch",
    );
  }
  for (const user of db.state.users) {
    if (user.department_id === department.id) user.department_id = null;
  }
  db.state.departments = db.state.departments.filter((candidate) => candidate.id !== department.id);
  return ok(null, "Department deleted");
}

/** UC-11 */
function setStatus({ body }: MockRequest, params: string[]): MockResponse {
  requireRole("SYSTEM_ADMIN");
  const department = departmentOr404(params[0]);
  const status = str(body, "status") as DepartmentStatus;
  if (!["ACTIVE", "SUSPENDED"].includes(status)) {
    errors.validation({
      status: [status ? `"${status}" is not a valid choice.` : "This field is required."],
    });
  }
  if (!ALLOWED_TRANSITIONS[department.status].includes(status)) {
    errors.invalidTransition(`Cannot move the department from ${department.status} to ${status}.`, {
      from_status: department.status,
      to_status: status,
    });
  }
  department.status = status;
  return ok({ department: toDepartmentDetail(department) }, "Department status updated");
}

/** UC-12 2b */
function archive(_request: MockRequest, params: string[]): MockResponse {
  requireRole("SYSTEM_ADMIN");
  const department = departmentOr404(params[0]);
  ensureRemovable(department);
  if (!department.request_count) {
    errors.conflict(
      "department_has_no_requests",
      "The department has no requests. Delete it instead of archiving it.",
    );
  }
  department.status = "ARCHIVED";
  return ok({ department: toDepartmentDetail(department) }, "Department archived");
}

/** UC-13: deactivate (the account loses its department) or transfer (UC-17). */
function removeManager({ body }: MockRequest, params: string[]): MockResponse {
  requireRole("SYSTEM_ADMIN");
  const department = departmentOr404(params[0]);
  const mode = str(body, "mode");
  if (!["DEACTIVATE", "TRANSFER"].includes(mode)) {
    errors.validation({ mode: [mode ? `"${mode}" is not a valid choice.` : "This field is required."] });
  }
  ensureNotArchived(department);
  const managers = activeManagers(department.id);
  const manager = managers.find((user) => user.id === Number(params[1]));
  if (!manager) errors.notFound("The account is not a manager of this department.");
  const wasOnlyManager = managers.length === 1;

  if (mode === "TRANSFER") {
    const targetId = Number(body.target_department_id) || null;
    if (!targetId) errors.validation({ target_department_id: ["Choose the department to transfer to."] });
    const others = db.state.departments.filter((d) => d.status === "ACTIVE" && d.id !== department.id);
    if (!others.length) {
      errors.conflict("no_other_active_department", "There is no other active department to transfer to.");
    }
    if (targetId === department.id) {
      errors.validation({ department_id: ["The account already belongs to this department."] });
    }
    const target = findDepartment(targetId);
    if (!target) errors.validation({ department_id: ["The department does not exist."] });
    if (target.status !== "ACTIVE") errors.conflict("department_not_active", "The department is not active.");
    manager.department_id = target.id;
  } else {
    manager.department_id = null;
    manager.status = "DISABLED";
  }
  return ok(
    { left_without_manager: wasOnlyManager, department: toDepartmentDetail(department) },
    "Manager removed",
  );
}

export const departmentRoutes: Route[] = [
  ["GET", /^\/departments\/$/, list],
  ["POST", /^\/departments\/$/, create],
  ["GET", /^\/departments\/(\d+)\/$/, detail],
  ["PATCH", /^\/departments\/(\d+)\/$/, update],
  ["DELETE", /^\/departments\/(\d+)\/$/, remove],
  ["PATCH", /^\/departments\/(\d+)\/status\/$/, setStatus],
  ["POST", /^\/departments\/(\d+)\/archive\/$/, archive],
  ["POST", /^\/departments\/(\d+)\/managers\/(\d+)\/remove\/$/, removeManager],
];
