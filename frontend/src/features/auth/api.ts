import type {
  ChangePasswordRequest,
  CurrentUser,
  IdentitySide,
  LoginRequest,
  ProfileUpdateRequest,
  RegisterRequest,
  User,
} from "@/api/contracts";
import { rememberCsrfToken } from "@/api/csrf";
import { ENDPOINTS } from "@/api/endpoints";
import { api } from "@/api/http-client";

/** GET /auth/csrf/: sets the csrftoken cookie. Called on start-up and after login and logout. */
export async function fetchCsrfToken(): Promise<string> {
  const envelope = await api.get<{ csrf_token: string }>(ENDPOINTS.csrf);
  rememberCsrfToken(envelope.data.csrf_token);
  return envelope.data.csrf_token;
}

/** UC-01: multipart form; the account is created without opening a session. */
export async function register(input: RegisterRequest): Promise<User> {
  const form = new FormData();
  for (const [key, value] of Object.entries(input)) {
    form.append(key, value as string | Blob);
  }
  const envelope = await api.post<{ user: User }>(ENDPOINTS.register, form);
  return envelope.data.user;
}

/** UC-02: Django rotates the CSRF token on login, so it is fetched again right after. */
export async function login(input: LoginRequest): Promise<CurrentUser> {
  const envelope = await api.post<{ user: CurrentUser }>(ENDPOINTS.login, input, { skipSessionExpiry: true });
  await fetchCsrfToken();
  return envelope.data.user;
}

/** UC-06 */
export async function logout(): Promise<void> {
  await api.post<null>(ENDPOINTS.logout, undefined, { skipSessionExpiry: true });
}

/** UC-02 step 4: role, department and capabilities of the session's user. */
export async function fetchMe(): Promise<CurrentUser> {
  const envelope = await api.get<{ user: CurrentUser }>(ENDPOINTS.me, undefined, { skipSessionExpiry: true });
  return envelope.data.user;
}

/** UC-08: email and phone only. */
export async function updateProfile(input: ProfileUpdateRequest): Promise<CurrentUser> {
  const envelope = await api.patch<{ user: CurrentUser }>(ENDPOINTS.me, input);
  return envelope.data.user;
}

/** UC-07: the other sessions end; this one stays. */
export async function changePassword(input: ChangePasswordRequest): Promise<void> {
  await api.post<null>(ENDPOINTS.mePassword, input);
}

/** One side of a citizen's ID card, as a blob (the citizen or the System Administrator). */
export function fetchIdentityDocument(userId: number, side: IdentitySide): Promise<Blob> {
  return api.blob(ENDPOINTS.identityDocument(userId, side));
}
