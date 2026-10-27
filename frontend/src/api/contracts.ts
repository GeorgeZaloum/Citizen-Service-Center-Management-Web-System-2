// Types of the API contract. Every entity type comes from schema.d.ts, generated from
// backend/docs/openapi.yaml by `npm run gen:api`; only the envelope and the error codes
// (documented in README.md, not in the schema) are written by hand.
import type { components } from "./schema";

type Schemas = components["schemas"];

// ---------------------------------------------------------------------- entities
export type Role = Schemas["RoleEnum"];
export type StaffRole = Schemas["StaffRoleEnum"];
export type AccountStatus = Schemas["AccountStatusEnum"];
export type DepartmentStatus = Schemas["DepartmentStatusEnum"];
export type DepartmentStatusChange = Schemas["DepartmentStatusChangeEnum"];
export type RemoveManagerMode = Schemas["ModeEnum"];

export type DepartmentRef = Schemas["DepartmentRef"];
export type Member = Schemas["Member"];
export type User = Schemas["User"];
export type UserDetail = Schemas["UserDetail"];
export type CurrentUser = Omit<Schemas["CurrentUser"], "identity_documents"> & {
  identity_documents: IdentityDocumentLink[];
};
export type Department = Schemas["Department"];
export type DepartmentDetail = Omit<Schemas["DepartmentDetail"], "actions" | "employees"> & {
  actions: DepartmentAction[];
  employees: Member[];
};
export type CenterSettings = Schemas["CenterSettings"];

/** GET /auth/me/ `identity_documents` items (CurrentUserSerializer.get_identity_documents). */
export interface IdentityDocumentLink {
  side: IdentitySide;
  url: string;
}
export type IdentitySide = "FRONT" | "BACK";

/** DepartmentService.allowed_actions: the screen offers only these (UC-14). */
export type DepartmentAction =
  "EDIT" | "SUSPEND" | "ACTIVATE" | "ADD_MANAGER" | "REMOVE_MANAGER" | "DELETE" | "ARCHIVE";

/** Values of ROLE_CAPABILITIES (shared/constants/capabilities.py). */
export type Capability =
  | "profile.view"
  | "profile.update"
  | "password.change"
  | "identity_documents.view_own"
  | "employees.create"
  | "users.view"
  | "users.update"
  | "users.reset_password"
  | "users.set_status"
  | "users.transfer"
  | "departments.manage"
  | "department_managers.create"
  | "identity_documents.view"
  | "center_settings.manage";

// ---------------------------------------------------------------------- requests
export type LoginRequest = Schemas["LoginRequest"];
export type ChangePasswordRequest = Schemas["ChangePasswordRequest"];
export type ProfileUpdateRequest = Schemas["PatchedProfileUpdateRequest"];
export type StaffCreateRequest = Schemas["StaffCreateRequest"];
export type StaffUpdateRequest = Schemas["PatchedStaffUpdateRequest"];
export type ResetPasswordRequest = Schemas["ResetPasswordRequest"];
export type UserStatusRequest = Schemas["PatchedUserStatusRequest"];
export type TransferRequest = Schemas["TransferRequest"];
export type DepartmentCreateRequest = Schemas["DepartmentCreateRequest"];
export type DepartmentUpdateRequest = Schemas["PatchedDepartmentUpdateRequest"];
export type DepartmentStatusRequest = Schemas["PatchedDepartmentStatusRequest"];
export type RemoveManagerRequest = Schemas["RemoveManagerRequest"];
export type CenterSettingsRequest = Schemas["CenterSettingsRequest"];
/** RegisterRequest with the two images as browser files (sent as multipart/form-data). */
export type RegisterRequest = Omit<Schemas["RegisterRequest"], "id_card_front" | "id_card_back"> & {
  id_card_front: File;
  id_card_back: File;
};

export interface UserListParams {
  page?: number;
  page_size?: number;
  search?: string;
  role?: Role;
  status?: AccountStatus;
  department_id?: number;
}
export interface DepartmentListParams {
  page?: number;
  page_size?: number;
  search?: string;
  status?: DepartmentStatus;
}

// ---------------------------------------------------------------------- envelope
export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  meta?: { pagination?: Pagination } & Record<string, unknown>;
}

export interface Paginated<T> {
  items: T[];
  pagination: Pagination;
}

export type ErrorType =
  | "validation_error"
  | "request_error"
  | "authentication_error"
  | "permission_error"
  | "not_found"
  | "business_rule_violation"
  | "server_error";

/** Every `error.code` listed in README.md ("API Contract for the Front End"). */
export const ERROR_CODES = [
  "validation_error",
  "weak_password",
  "incorrect_current_password",
  "password_same_as_current",
  "confirmation_mismatch",
  "invalid_working_hours",
  "malformed_request",
  "not_authenticated",
  "invalid_credentials",
  "account_locked",
  "permission_denied",
  "csrf_failed",
  "already_authenticated",
  "account_disabled",
  "immutable_field",
  "scope_violation",
  "self_action_forbidden",
  "audit_log_immutable",
  "not_found",
  "method_not_allowed",
  "unsupported_media_type",
  "account_exists",
  "email_taken",
  "phone_taken",
  "invalid_state_transition",
  "department_required",
  "no_active_department",
  "no_other_active_department",
  "department_not_active",
  "department_name_taken",
  "department_not_suspended",
  "department_archived",
  "department_has_active_accounts",
  "department_has_requests",
  "department_has_no_requests",
  "server_error",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

/** `error.details`: `detail` always, a list of messages per invalid field, and extra keys per code. */
export type ErrorDetails = { detail?: string } & Record<string, unknown>;

export interface ApiErrorBody {
  success: false;
  error: { type: ErrorType | string; code: ErrorCode | string; details: ErrorDetails };
}
