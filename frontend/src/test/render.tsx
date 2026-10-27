import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom";

import type { CurrentUser, Role } from "@/api/contracts";
import { createQueryClient } from "@/app/query-client";
import { ROUTER_FUTURE } from "@/app/router";
import { ColorModeProvider } from "@/app/theme/ColorModeProvider";
import { useAuthStore } from "@/features/auth/store";

/** Render a route tree in memory, with the app's providers. */
export function renderRoutes(routes: RouteObject[], initialPath: string) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath], future: ROUTER_FUTURE });
  const client = createQueryClient();
  const utils = render(
    <QueryClientProvider client={client}>
      <ColorModeProvider>
        <RouterProvider router={router} future={{ v7_startTransition: true }} />
      </ColorModeProvider>
    </QueryClientProvider>,
  );
  return { ...utils, router };
}

export function makeUser(role: Role, overrides: Partial<CurrentUser> = {}): CurrentUser {
  return {
    id: 1,
    full_name: "مستخدم تجريبي",
    email: "user@test.local",
    phone: "0911111111",
    role,
    status: "ACTIVE",
    job_title: null,
    department:
      role === "EMPLOYEE" || role === "DEPT_MANAGER" ? { id: 1, name: "البلدية", status: "ACTIVE" } : null,
    created_at: "2026-10-01T10:00:00Z",
    national_id: role === "CITIZEN" ? "01234567891" : null,
    capabilities: [],
    identity_documents: [],
    ...overrides,
  };
}

export function signIn(role: Role, overrides: Partial<CurrentUser> = {}) {
  useAuthStore.setState({ user: makeUser(role, overrides), status: "authenticated", notice: null });
}

export function signOut(status: "anonymous" | "loading" = "anonymous") {
  useAuthStore.setState({ user: null, status, notice: null });
}
