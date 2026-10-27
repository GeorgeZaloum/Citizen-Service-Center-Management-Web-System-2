import { persist } from "./db";
import { MockError, checkCsrf, type MockRequest, type MockResponse } from "./core";
import { authRoutes } from "./handlers/auth";
import { centerSettingsRoutes } from "./handlers/center-settings";
import { departmentRoutes } from "./handlers/departments";
import { userRoutes } from "./handlers/users";

export type Route = [
  method: string,
  pattern: RegExp,
  handler: (request: MockRequest, params: string[]) => MockResponse,
];

const routes: Route[] = [...authRoutes, ...userRoutes, ...departmentRoutes, ...centerSettingsRoutes];

function errorResponse(
  status: number,
  type: string,
  code: string,
  details: Record<string, unknown>,
): MockResponse {
  return { status, body: { success: false, error: { type, code, details } } };
}

/** Dispatch one request the way Django does: URL → method → CSRF → view. */
export function handleMockRequest(request: MockRequest): MockResponse {
  const matches = routes.filter(([, pattern]) => pattern.test(request.path));
  if (!matches.length) return errorResponse(404, "not_found", "not_found", { detail: "Resource not found." });
  const route = matches.find(([method]) => method === request.method);
  if (!route) {
    return errorResponse(405, "request_error", "method_not_allowed", {
      detail: `Method "${request.method}" not allowed.`,
    });
  }
  try {
    checkCsrf(request);
    const params = (route[1].exec(request.path) ?? []).slice(1);
    return route[2](request, params);
  } catch (error) {
    if (error instanceof MockError) return errorResponse(error.status, error.type, error.code, error.details);
    console.error("[mock server]", error);
    return errorResponse(500, "server_error", "server_error", { detail: "Unexpected server error." });
  } finally {
    persist();
  }
}
