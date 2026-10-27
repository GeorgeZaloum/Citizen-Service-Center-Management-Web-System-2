// Building blocks of the mock server: the request and response shapes, the error envelope,
// serializers that return exactly the shapes of openapi.yaml, and the session/CSRF rules.
import type {
  CurrentUser,
  Department,
  DepartmentAction,
  DepartmentDetail,
  ErrorType,
  Member,
  Pagination,
  Role,
  User,
  UserDetail,
} from "@/api/contracts";

import { db, type MockDepartment, type MockUser } from "./db";

export interface MockRequest {
  method: string;
  path: string;
  query: URLSearchParams;
  body: Record<string, unknown>;
  files: Record<string, File | Blob>;
  headers: Record<string, string>;
}

export interface MockResponse {
  status: number;
  body: unknown;
  contentType?: string;
}

export class MockError extends Error {
  constructor(
    readonly status: number,
    readonly type: ErrorType,
    readonly code: string,
    readonly details: Record<string, unknown>,
  ) {
    super(code);
  }
}

export function ok(data: unknown, message: string, status = 200, meta?: object): MockResponse {
  return { status, body: { success: true, message, data, ...(meta ? { meta } : {}) } };
}

export function fail(
  status: number,
  type: ErrorType,
  code: string,
  detail: string,
  extra: object = {},
): never {
  throw new MockError(status, type, code, { detail, ...extra });
}

// Explicitly typed so TypeScript knows these calls never return (control-flow narrowing).
interface ErrorFactory {
  validation: (fields: Record<string, string[]>, detail?: string, code?: string) => never;
  notFound: (detail?: string) => never;
  forbidden: (detail?: string, code?: string) => never;
  conflict: (code: string, detail: string, extra?: object) => never;
  invalidTransition: (detail: string, extra?: object) => never;
}

export const errors: ErrorFactory = {
  validation: (
    fields: Record<string, string[]>,
    detail = "Invalid input.",
    code = "validation_error",
  ): never => fail(400, "validation_error", code, detail, fields),
  notFound: (detail = "Resource not found."): never => fail(404, "not_found", "not_found", detail),
  forbidden: (
    detail = "You do not have permission to perform this action.",
    code = "permission_denied",
  ): never => fail(403, "permission_error", code, detail),
  conflict: (code: string, detail: string, extra: object = {}): never =>
    fail(409, "business_rule_violation", code, detail, extra),
  invalidTransition: (detail: string, extra: object = {}): never =>
    fail(409, "business_rule_violation", "invalid_state_transition", detail, extra),
};

// ---------------------------------------------------------------------- session and CSRF
function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Like Django: a new token, written to the readable `csrftoken` cookie. */
export function rotateCsrfToken(): string {
  const token = randomToken();
  db.state.csrfToken = token;
  document.cookie = `csrftoken=${token}; path=/; SameSite=Lax`;
  return token;
}

/** Django's CsrfViewMiddleware: unsafe methods need X-CSRFToken equal to the cookie's token. */
export function checkCsrf(request: MockRequest): void {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) return;
  const header = request.headers["x-csrftoken"];
  if (!db.state.csrfToken || !header) {
    fail(403, "permission_error", "csrf_failed", "CSRF Failed: CSRF token missing.");
  }
  if (header !== db.state.csrfToken) {
    fail(403, "permission_error", "csrf_failed", "CSRF Failed: CSRF token incorrect.");
  }
}

export function sessionUser(): MockUser | null {
  const id = db.state.sessionUserId;
  const user = id ? db.state.users.find((candidate) => candidate.id === id) : undefined;
  return user && user.status === "ACTIVE" ? user : null;
}

export function requireAuth(): MockUser {
  const user = sessionUser();
  if (!user) {
    db.state.sessionUserId = null;
    fail(401, "authentication_error", "not_authenticated", "Authentication credentials were not provided.");
  }
  return user;
}

export function requireRole(...roles: Role[]): MockUser {
  const user = requireAuth();
  if (!roles.includes(user.role)) errors.forbidden();
  return user;
}

// ---------------------------------------------------------------------- lookups
export function findDepartment(id: number): MockDepartment | undefined {
  return db.state.departments.find((department) => department.id === id);
}

export function activeManagers(departmentId: number): MockUser[] {
  return db.state.users
    .filter(
      (user) =>
        user.role === "DEPT_MANAGER" && user.status === "ACTIVE" && user.department_id === departmentId,
    )
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
}

export function departmentEmployees(departmentId: number): MockUser[] {
  return db.state.users
    .filter((user) => user.role === "EMPLOYEE" && user.department_id === departmentId)
    .sort((a, b) => a.full_name.localeCompare(b.full_name, "ar"));
}

export function activeDepartmentAccounts(departmentId: number): MockUser[] {
  return db.state.users.filter(
    (user) => user.department_id === departmentId && user.status === "ACTIVE" && user.role !== "CITIZEN",
  );
}

// ---------------------------------------------------------------------- serializers
function departmentRef(id: number | null) {
  const department = id ? findDepartment(id) : undefined;
  return department ? { id: department.id, name: department.name, status: department.status } : null;
}

export function toUser(user: MockUser): User {
  return {
    id: user.id,
    full_name: user.full_name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    status: user.status,
    job_title: user.job_title,
    department: departmentRef(user.department_id),
    created_at: user.created_at,
  };
}

export function toUserDetail(user: MockUser): UserDetail {
  return { ...toUser(user), national_id: user.national_id, locked_until: user.locked_until };
}

const CAPABILITIES: Record<Role, string[]> = {
  CITIZEN: ["profile.view", "profile.update", "password.change", "identity_documents.view_own"],
  EMPLOYEE: ["profile.view", "profile.update", "password.change"],
  DEPT_MANAGER: [
    "profile.view",
    "profile.update",
    "password.change",
    "employees.create",
    "users.view",
    "users.update",
    "users.reset_password",
    "users.set_status",
  ],
  SYSTEM_ADMIN: [
    "profile.view",
    "profile.update",
    "password.change",
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
};

export function toCurrentUser(user: MockUser): CurrentUser {
  return {
    ...toUser(user),
    national_id: user.national_id,
    capabilities: CAPABILITIES[user.role],
    identity_documents:
      user.role === "CITIZEN"
        ? (["FRONT", "BACK"] as const).map((side) => ({
            side,
            url: `/api/v1/auth/users/${user.id}/identity-documents/${side.toLowerCase()}/`,
          }))
        : [],
  };
}

function toMember(user: MockUser): Member {
  return { id: user.id, full_name: user.full_name, email: user.email, status: user.status };
}

export function toDepartment(department: MockDepartment): Department {
  const managers = activeManagers(department.id);
  return {
    id: department.id,
    name: department.name,
    description: department.description,
    authority: department.authority,
    status: department.status,
    created_at: department.created_at,
    managers: managers.map(toMember),
    has_managers: managers.length > 0,
    employee_count: departmentEmployees(department.id).filter((user) => user.status === "ACTIVE").length,
    service_count: 0,
  };
}

/** DepartmentService.allowed_actions */
export function allowedActions(department: MockDepartment): DepartmentAction[] {
  if (department.status === "ARCHIVED") return [];
  const actions: DepartmentAction[] = ["EDIT"];
  if (department.status === "ACTIVE") actions.push("SUSPEND", "ADD_MANAGER");
  else actions.push("ACTIVATE", department.request_count ? "ARCHIVE" : "DELETE");
  if (activeManagers(department.id).length) actions.push("REMOVE_MANAGER");
  return actions;
}

export function toDepartmentDetail(department: MockDepartment): DepartmentDetail {
  return {
    ...toDepartment(department),
    employees: departmentEmployees(department.id).map(toMember),
    open_request_count: department.request_count,
    actions: allowedActions(department),
  };
}

// ---------------------------------------------------------------------- pagination
/** shared/pagination: ?page= and ?page_size= (default 20, at most 100). */
export function paginate<T>(items: T[], query: URLSearchParams): { page: T[]; pagination: Pagination } {
  const pageSize = Math.min(Math.max(Number(query.get("page_size")) || 20, 1), 100);
  const totalPages = Math.ceil(items.length / pageSize);
  const page = Math.max(Number(query.get("page")) || 1, 1);
  if (totalPages && page > totalPages) errors.notFound("Invalid page.");
  return {
    page: items.slice((page - 1) * pageSize, page * pageSize),
    pagination: { page, page_size: pageSize, total_items: items.length, total_pages: totalPages },
  };
}

// ---------------------------------------------------------------------- input
export function str(body: Record<string, unknown>, key: string): string {
  const value = body[key];
  return typeof value === "string"
    ? value.trim()
    : value === undefined || value === null
      ? ""
      : String(value);
}

/** DRF's required/blank/length/format checks, collected per field. */
export class FieldErrors {
  private readonly errors: Record<string, string[]> = {};

  add(field: string, message: string): this {
    (this.errors[field] ??= []).push(message);
    return this;
  }

  required(body: Record<string, unknown>, ...fields: string[]): this {
    for (const field of fields) {
      if (!(field in body)) this.add(field, "This field is required.");
      else if (!str(body, field)) this.add(field, "This field may not be blank.");
    }
    return this;
  }

  maxLength(body: Record<string, unknown>, field: string, max: number): this {
    if (str(body, field).length > max)
      this.add(field, `Ensure this field has no more than ${max} characters.`);
    return this;
  }

  pattern(body: Record<string, unknown>, field: string, pattern: RegExp, message: string): this {
    const value = str(body, field);
    if (value && !pattern.test(value)) this.add(field, message);
    return this;
  }

  has(field: string): boolean {
    return field in this.errors;
  }

  throwIfAny(): void {
    if (Object.keys(this.errors).length) errors.validation(this.errors);
  }
}

export const PHONE_MESSAGE = "Enter a Syrian mobile number in the form 09XXXXXXXX.";
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function passwordProblems(password: string): string[] {
  const problems: string[] = [];
  if (password.length < 8) problems.push("The password must contain at least 8 characters.");
  if (password.length > 128) problems.push("The password must contain at most 128 characters.");
  if (!/[A-Z]/.test(password)) problems.push("The password must contain an uppercase letter.");
  if (!/[a-z]/.test(password)) problems.push("The password must contain a lowercase letter.");
  if (!/\d/.test(password)) problems.push("The password must contain a digit.");
  return problems;
}

/** Serializer check of the two password fields, then the strength check of the service. */
export function checkNewPassword(body: Record<string, unknown>, field: string, confirmation: string): string {
  const fieldErrors = new FieldErrors().required(body, field, confirmation);
  fieldErrors.throwIfAny();
  const password = String(body[field]);
  if (password !== String(body[confirmation]))
    errors.validation({ [confirmation]: ["The passwords do not match."] });
  const problems = passwordProblems(password);
  if (problems.length) {
    errors.validation({ [field]: problems }, "The password is not strong enough.", "weak_password");
  }
  return password;
}

export function ensureContactAvailable(email: string | null, phone: string | null, excludeId?: number): void {
  const others = db.state.users.filter((user) => user.id !== excludeId);
  if (email && others.some((user) => user.email === email.toLowerCase())) {
    errors.conflict("email_taken", "The email is used by another account.", {
      email: ["The email is used by another account."],
    });
  }
  if (phone && others.some((user) => user.phone === phone)) {
    errors.conflict("phone_taken", "The phone number is used by another account.", {
      phone: ["The phone number is used by another account."],
    });
  }
}

export function rejectFixedFields(body: Record<string, unknown>, editable: string[]): void {
  const fixed = Object.keys(body).filter((key) => !editable.includes(key));
  if (fixed.length) {
    fail(403, "permission_error", "immutable_field", "Some of the submitted fields cannot be changed.", {
      fields: fixed,
    });
  }
}
