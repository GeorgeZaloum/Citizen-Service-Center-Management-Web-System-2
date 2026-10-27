import { db, uploadedImages, type MockUser } from "../db";
import {
  EMAIL_PATTERN,
  FieldErrors,
  PHONE_MESSAGE,
  checkNewPassword,
  ensureContactAvailable,
  errors,
  fail,
  ok,
  passwordProblems,
  rejectFixedFields,
  requireAuth,
  rotateCsrfToken,
  sessionUser,
  str,
  toCurrentUser,
  toUser,
  type MockRequest,
  type MockResponse,
} from "../core";
import type { Route } from "../router";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;
const ID_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

function csrf(): MockResponse {
  const token = db.state.csrfToken ?? rotateCsrfToken();
  document.cookie = `csrftoken=${token}; path=/; SameSite=Lax`;
  return ok({ csrf_token: token }, "CSRF token");
}

function imageProblem(file: File | Blob | undefined): string | null {
  if (!file) return "The image of this side is required.";
  if (file.size > ID_IMAGE_MAX_BYTES) return "The image must not exceed 5 MB.";
  if (!["image/jpeg", "image/png"].includes(file.type)) return "Only JPG and PNG images are accepted.";
  return null;
}

/** UC-01 */
function register(request: MockRequest): MockResponse {
  if (sessionUser()) errors.forbidden("You are already logged in.", "already_authenticated");
  const { body, files } = request;
  const fieldErrors = new FieldErrors()
    .required(body, "full_name", "national_id", "email", "phone", "password", "password_confirmation")
    .maxLength(body, "full_name", 150)
    .pattern(body, "national_id", /^\d{11}$/, "The national ID number must contain exactly 11 digits.")
    .pattern(body, "email", EMAIL_PATTERN, "Enter a valid email address.")
    .pattern(body, "phone", /^09\d{8}$/, PHONE_MESSAGE);
  for (const side of ["id_card_front", "id_card_back"]) {
    if (!files[side]) fieldErrors.add(side, "No file was submitted.");
  }
  if (!fieldErrors.has("password") && str(body, "password") !== str(body, "password_confirmation")) {
    fieldErrors.add("password_confirmation", "The passwords do not match.");
  }
  fieldErrors.throwIfAny();

  // AuthService.register_citizen: password strength and both images, all at once.
  const serviceErrors = new FieldErrors();
  passwordProblems(str(body, "password")).forEach((problem) => serviceErrors.add("password", problem));
  for (const side of ["id_card_front", "id_card_back"]) {
    const problem = imageProblem(files[side]);
    if (problem) serviceErrors.add(side, problem);
  }
  serviceErrors.throwIfAny();

  const email = str(body, "email").toLowerCase();
  const taken = [
    db.state.users.some((user) => user.email === email) && "email",
    db.state.users.some((user) => user.national_id === str(body, "national_id")) && "national_id",
    db.state.users.some((user) => user.phone === str(body, "phone")) && "phone",
  ].filter(Boolean);
  if (taken.length) {
    errors.conflict(
      "account_exists",
      "The data is linked to an existing account. Log in, or contact the center's management.",
      { fields: (taken as string[]).sort() },
    );
  }

  const user: MockUser = {
    id: db.state.nextUserId++,
    full_name: str(body, "full_name"),
    email,
    phone: str(body, "phone"),
    role: "CITIZEN",
    status: "ACTIVE",
    job_title: null,
    department_id: null,
    national_id: str(body, "national_id"),
    password: str(body, "password"),
    failed_attempts: 0,
    locked_until: null,
    created_at: new Date().toISOString(),
  };
  db.state.users.push(user);
  uploadedImages.set(`${user.id}:front`, files.id_card_front);
  uploadedImages.set(`${user.id}:back`, files.id_card_back);
  return ok({ user: toUser(user) }, "Registered", 201);
}

function accountLocked(user: MockUser, now: number): never {
  const lockedUntil = new Date(user.locked_until as string).getTime();
  return fail(
    401,
    "authentication_error",
    "account_locked",
    "The account is temporarily locked after repeated failed login attempts.",
    {
      locked_until: user.locked_until,
      retry_after_seconds: Math.max(Math.floor((lockedUntil - now) / 1000), 1),
    },
  );
}

function invalidCredentials(): never {
  return fail(401, "authentication_error", "invalid_credentials", "Incorrect email or password.");
}

/** UC-02 */
function login({ body }: MockRequest): MockResponse {
  new FieldErrors().required(body, "email", "password").throwIfAny();
  const user = db.state.users.find((candidate) => candidate.email === str(body, "email").toLowerCase());
  if (!user) invalidCredentials();

  const now = Date.now();
  if (user.locked_until && new Date(user.locked_until).getTime() > now) accountLocked(user, now);
  if (user.password !== String(body.password)) {
    user.failed_attempts += 1;
    if (user.failed_attempts < MAX_FAILED_ATTEMPTS) invalidCredentials();
    user.failed_attempts = 0;
    user.locked_until = new Date(now + LOCK_MINUTES * 60_000).toISOString();
    accountLocked(user, now);
  }
  if (user.status !== "ACTIVE") {
    fail(
      403,
      "permission_error",
      "account_disabled",
      "The account is deactivated. Please contact the center's management.",
    );
  }

  user.failed_attempts = 0;
  user.locked_until = null;
  db.state.sessionUserId = user.id;
  rotateCsrfToken();
  return ok({ user: toCurrentUser(user) }, "Logged in");
}

/** UC-06 */
function logout(): MockResponse {
  requireAuth();
  db.state.sessionUserId = null;
  rotateCsrfToken();
  return ok(null, "Logged out");
}

function me(): MockResponse {
  return ok({ user: toCurrentUser(requireAuth()) }, "Current user");
}

/** UC-08: email and phone only. */
function updateMe({ body }: MockRequest): MockResponse {
  const user = requireAuth();
  rejectFixedFields(body, ["email", "phone"]);
  const fieldErrors = new FieldErrors()
    .pattern(body, "email", EMAIL_PATTERN, "Enter a valid email address.")
    .pattern(body, "phone", /^09\d{8}$/, PHONE_MESSAGE);
  for (const field of ["email", "phone"]) {
    if (field in body && !str(body, field)) fieldErrors.add(field, "This field may not be blank.");
  }
  fieldErrors.throwIfAny();
  const email = "email" in body ? str(body, "email").toLowerCase() : null;
  const phone = "phone" in body ? str(body, "phone") : null;
  ensureContactAvailable(email, phone, user.id);
  if (email) user.email = email;
  if (phone) user.phone = phone;
  return ok({ user: toCurrentUser(user) }, "Profile updated");
}

/** UC-07 */
function changePassword({ body }: MockRequest): MockResponse {
  const user = requireAuth();
  new FieldErrors()
    .required(body, "current_password", "new_password", "new_password_confirmation")
    .throwIfAny();
  if (String(body.new_password) !== String(body.new_password_confirmation)) {
    errors.validation({ new_password_confirmation: ["The passwords do not match."] });
  }
  if (String(body.current_password) !== user.password) {
    errors.validation(
      { current_password: ["The current password is incorrect."] },
      "The current password is incorrect.",
      "incorrect_current_password",
    );
  }
  const password = checkNewPassword(body, "new_password", "new_password_confirmation");
  if (password === user.password) {
    errors.validation(
      { new_password: ["The new password must differ from the current one."] },
      "The new password must differ from the current one.",
      "password_same_as_current",
    );
  }
  user.password = password;
  return ok(null, "Password changed");
}

function placeholderCard(user: MockUser, side: string): Blob {
  const label = side === "front" ? "الوجه الأمامي" : "الوجه الخلفي";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400">
<rect width="640" height="400" rx="24" fill="#E3EDE6"/><rect x="16" y="16" width="608" height="368" rx="16" fill="none" stroke="#0B5D3B" stroke-width="3" stroke-dasharray="10 8"/>
<text x="320" y="170" font-family="sans-serif" font-size="30" text-anchor="middle" fill="#0B5D3B">صورة هوية تجريبية</text>
<text x="320" y="220" font-family="sans-serif" font-size="24" text-anchor="middle" fill="#4A7A60">${label}</text>
<text x="320" y="270" font-family="sans-serif" font-size="20" text-anchor="middle" fill="#5B635E">${user.national_id ?? ""}</text></svg>`;
  return new Blob([svg], { type: "image/svg+xml" });
}

/** The citizen (own images) or the System Administrator; anyone else gets "not found". */
function identityDocument(_request: MockRequest, params: string[]): MockResponse {
  const actor = requireAuth();
  const [userId, side] = [Number(params[0]), params[1]];
  const owner = db.state.users.find((user) => user.id === userId);
  if (!["front", "back"].includes(side) || !owner || owner.role !== "CITIZEN")
    errors.notFound("Document not found.");
  if (actor.role !== "SYSTEM_ADMIN" && actor.id !== owner.id) errors.notFound("Document not found.");
  const blob = uploadedImages.get(`${owner.id}:${side}`) ?? placeholderCard(owner, side);
  return { status: 200, body: blob, contentType: blob.type };
}

export const authRoutes: Route[] = [
  ["GET", /^\/auth\/csrf\/$/, csrf],
  ["POST", /^\/auth\/register\/$/, register],
  ["POST", /^\/auth\/login\/$/, login],
  ["POST", /^\/auth\/logout\/$/, logout],
  ["GET", /^\/auth\/me\/$/, me],
  ["PATCH", /^\/auth\/me\/$/, updateMe],
  ["POST", /^\/auth\/me\/password\/$/, changePassword],
  ["GET", /^\/auth\/users\/(\d+)\/identity-documents\/(\w+)\/$/, identityDocument],
];
