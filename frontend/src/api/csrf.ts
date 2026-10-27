// CSRF handling (README "Session and CSRF"): the token lives in the `csrftoken` cookie and
// goes back in the X-CSRFToken header on every unsafe request. The cookie is read again on
// every request, so the token Django rotates at login is picked up without extra code.
export const CSRF_COOKIE = "csrftoken";
export const CSRF_HEADER = "X-CSRFToken";
export const UNSAFE_METHODS = new Set(["post", "put", "patch", "delete"]);

// Token from the body of GET /auth/csrf/, used only when the cookie cannot be read.
let fallbackToken: string | null = null;

export function readCookie(name: string): string | null {
  if (typeof document === "undefined" || !document.cookie) return null;
  const prefix = `${name}=`;
  const match = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  return match ? decodeURIComponent(match.slice(prefix.length)) : null;
}

export function getCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE) ?? fallbackToken;
}

export function rememberCsrfToken(token: string | null): void {
  fallbackToken = token;
}

export function isUnsafeMethod(method?: string): boolean {
  return UNSAFE_METHODS.has((method ?? "get").toLowerCase());
}
