import type { Role } from "@/api/contracts";

import { db, type MockUser } from "../db";
import {
  EMAIL_PATTERN,
  FieldErrors,
  PHONE_MESSAGE,
  checkNewPassword,
  ensureContactAvailable,
  errors,
  findDepartment,
  ok,
  paginate,
  rejectFixedFields,
  requireRole,
  str,
  toUser,
  toUserDetail,
  type MockRequest,
  type MockResponse,
} from "../core";
import type { Route } from "../router";

type Operation = "view" | "edit" | "reset_password" | "set_status" | "transfer";

const STAFF: Role[] = ["EMPLOYEE", "DEPT_MANAGER"];
const ALL: Role[] = ["CITIZEN", "EMPLOYEE", "DEPT_MANAGER", "SYSTEM_ADMIN"];
// UserService.SYSTEM_ADMIN_TARGETS
const SYSTEM_ADMIN_TARGETS: Record<Operation, Role[]> = {
  view: ALL,
  edit: STAFF,
  reset_password: ["DEPT_MANAGER", "CITIZEN"],
  set_status: ALL,
  transfer: STAFF,
};

/** user_selectors.users_visible_to: department isolation. */
function visibleUsers(actor: MockUser): MockUser[] {
  const sorted = [...db.state.users].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  if (actor.role === "SYSTEM_ADMIN") return sorted;
  if (actor.role === "DEPT_MANAGER" && actor.department_id) {
    return sorted.filter((user) => user.role === "EMPLOYEE" && user.department_id === actor.department_id);
  }
  return [];
}

/** UserService.get_managed_user: outside the scope it is "not found". */
function managedUser(actor: MockUser, id: number, operation: Operation): MockUser {
  const target = visibleUsers(actor).find((user) => user.id === id);
  if (!target) errors.notFound("User not found.");
  const allowed =
    actor.role === "SYSTEM_ADMIN"
      ? SYSTEM_ADMIN_TARGETS[operation].includes(target.role)
      : operation !== "transfer";
  if (!allowed) errors.forbidden(`Your role cannot run '${operation}' on this account.`);
  return target;
}

function activeDepartmentOrError(departmentId: number) {
  const department = findDepartment(departmentId);
  if (!department) errors.validation({ department_id: ["The department does not exist."] });
  if (department.status !== "ACTIVE")
    errors.conflict("department_not_active", "The department is not active.");
  return department;
}

/** UC-18 */
function list({ query }: MockRequest): MockResponse {
  const actor = requireRole("DEPT_MANAGER", "SYSTEM_ADMIN");
  const search = (query.get("search") ?? "").trim().toLowerCase();
  const role = query.get("role");
  const status = query.get("status");
  const departmentId = Number(query.get("department_id")) || null;
  const filtered = visibleUsers(actor).filter(
    (user) =>
      (!search || user.full_name.toLowerCase().includes(search) || user.email.includes(search)) &&
      (!role || user.role === role) &&
      (!status || user.status === status) &&
      (!departmentId || user.department_id === departmentId),
  );
  const { page, pagination } = paginate(filtered, query);
  return ok({ users: page.map(toUser) }, "Users list", 200, { pagination });
}

/** UC-04 and UC-05 */
function create({ body }: MockRequest): MockResponse {
  const actor = requireRole("DEPT_MANAGER", "SYSTEM_ADMIN");
  const fieldErrors = new FieldErrors()
    .required(body, "role", "full_name", "email", "phone", "password", "password_confirmation")
    .maxLength(body, "full_name", 150)
    .maxLength(body, "job_title", 100)
    .pattern(body, "email", EMAIL_PATTERN, "Enter a valid email address.")
    .pattern(body, "phone", /^09\d{8}$/, PHONE_MESSAGE);
  if (!fieldErrors.has("password") && str(body, "password") !== str(body, "password_confirmation")) {
    fieldErrors.add("password_confirmation", "The passwords do not match.");
  }
  fieldErrors.throwIfAny();

  const role = str(body, "role") as Role;
  const creatable: Partial<Record<Role, Role>> = { SYSTEM_ADMIN: "DEPT_MANAGER", DEPT_MANAGER: "EMPLOYEE" };
  if (creatable[actor.role] !== role) errors.forbidden("Your role cannot create this type of account.");

  let departmentId = Number(body.department_id) || null;
  if (actor.role === "DEPT_MANAGER") {
    if (departmentId && departmentId !== actor.department_id) {
      errors.forbidden("Employees are created in your own department only.", "scope_violation");
    }
    departmentId = actor.department_id;
  } else if (!db.state.departments.some((department) => department.status === "ACTIVE")) {
    errors.conflict("no_active_department", "There are no active departments. Create a department first.");
  }
  if (!departmentId) errors.validation({ department_id: ["The department is required."] });
  activeDepartmentOrError(departmentId);

  const password = checkNewPassword(body, "password", "password_confirmation");
  const email = str(body, "email").toLowerCase();
  const existing = db.state.users.find((user) => user.email === email);
  if (existing && existing.role === "DEPT_MANAGER" && role === "DEPT_MANAGER") {
    errors.conflict(
      "email_taken",
      "The email belongs to another Department Manager: transfer that manager instead.",
      {
        email: ["The email is used by another account."],
        existing_manager_id: existing.id,
      },
    );
  }
  ensureContactAvailable(email, str(body, "phone"));

  const user: MockUser = {
    id: db.state.nextUserId++,
    full_name: str(body, "full_name"),
    email,
    phone: str(body, "phone"),
    role,
    status: "ACTIVE",
    job_title: str(body, "job_title") || null,
    department_id: departmentId,
    national_id: null,
    password,
    failed_attempts: 0,
    locked_until: null,
    created_at: new Date().toISOString(),
  };
  db.state.users.push(user);
  return ok({ user: toUser(user) }, "Account created", 201);
}

function detail(_request: MockRequest, params: string[]): MockResponse {
  const actor = requireRole("DEPT_MANAGER", "SYSTEM_ADMIN");
  return ok({ user: toUserDetail(managedUser(actor, Number(params[0]), "view")) }, "User detail");
}

/** UC-15 */
function update({ body }: MockRequest, params: string[]): MockResponse {
  const actor = requireRole("DEPT_MANAGER", "SYSTEM_ADMIN");
  rejectFixedFields(body, ["full_name", "email", "phone", "job_title"]);
  const user = managedUser(actor, Number(params[0]), "edit");
  const fieldErrors = new FieldErrors()
    .maxLength(body, "full_name", 150)
    .maxLength(body, "job_title", 100)
    .pattern(body, "email", EMAIL_PATTERN, "Enter a valid email address.")
    .pattern(body, "phone", /^09\d{8}$/, PHONE_MESSAGE);
  for (const field of ["full_name", "email", "phone"]) {
    if (field in body && !str(body, field)) fieldErrors.add(field, "This field may not be blank.");
  }
  fieldErrors.throwIfAny();
  const email = str(body, "email").toLowerCase() || null;
  const phone = str(body, "phone") || null;
  ensureContactAvailable(email, phone, user.id);
  if (str(body, "full_name")) user.full_name = str(body, "full_name");
  if (email) user.email = email;
  if (phone) user.phone = phone;
  if ("job_title" in body) user.job_title = str(body, "job_title") || null;
  return ok({ user: toUserDetail(user) }, "User updated");
}

/** UC-03: also removes the temporary lock. */
function resetPassword({ body }: MockRequest, params: string[]): MockResponse {
  const actor = requireRole("DEPT_MANAGER", "SYSTEM_ADMIN");
  const user = managedUser(actor, Number(params[0]), "reset_password");
  user.password = checkNewPassword(body, "new_password", "new_password_confirmation");
  user.failed_attempts = 0;
  user.locked_until = null;
  return ok(null, "Password reset");
}

/** UC-16 */
function setStatus({ body }: MockRequest, params: string[]): MockResponse {
  const actor = requireRole("DEPT_MANAGER", "SYSTEM_ADMIN");
  const status = str(body, "status");
  if (!["ACTIVE", "DISABLED"].includes(status)) {
    errors.validation({
      status: [status ? `"${status}" is not a valid choice.` : "This field is required."],
    });
  }
  const userId = Number(params[0]);
  if (status === "DISABLED") {
    if (userId === actor.id)
      errors.forbidden("You cannot deactivate your own account.", "self_action_forbidden");
    if (!str(body, "reason")) errors.validation({ reason: ["The reason for deactivation is required."] });
  }
  const user = managedUser(actor, userId, "set_status");
  if (user.status === status) errors.invalidTransition("The account is already in this status.");
  if (status === "ACTIVE" && STAFF.includes(user.role) && user.department_id === null) {
    errors.conflict(
      "department_required",
      "The account has no department. Transfer it to a department first.",
    );
  }
  user.status = status as MockUser["status"];
  if (db.state.sessionUserId === user.id && status === "DISABLED") db.state.sessionUserId = null;
  return ok({ user: toUserDetail(user) }, "User status updated");
}

/** UC-17 */
function transfer({ body }: MockRequest, params: string[]): MockResponse {
  const actor = requireRole("SYSTEM_ADMIN");
  new FieldErrors().required(body, "department_id").throwIfAny();
  const user = managedUser(actor, Number(params[0]), "transfer");
  const departmentId = Number(body.department_id);
  const others = db.state.departments.filter((d) => d.status === "ACTIVE" && d.id !== user.department_id);
  if (!others.length) {
    errors.conflict("no_other_active_department", "There is no other active department to transfer to.");
  }
  if (departmentId === user.department_id) {
    errors.validation({ department_id: ["The account already belongs to this department."] });
  }
  activeDepartmentOrError(departmentId);
  user.department_id = departmentId;
  return ok({ user: toUserDetail(user) }, "User transferred");
}

export { managedUser };

export const userRoutes: Route[] = [
  ["GET", /^\/auth\/users\/$/, list],
  ["POST", /^\/auth\/users\/$/, create],
  ["GET", /^\/auth\/users\/(\d+)\/$/, detail],
  ["PATCH", /^\/auth\/users\/(\d+)\/$/, update],
  ["POST", /^\/auth\/users\/(\d+)\/reset-password\/$/, resetPassword],
  ["PATCH", /^\/auth\/users\/(\d+)\/status\/$/, setStatus],
  ["POST", /^\/auth\/users\/(\d+)\/transfer\/$/, transfer],
];
