import type { ReactNode } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import type { Role } from "@/api/contracts";
import { FullPageLoader } from "@/components/common/FullPageLoader";
import { SessionErrorScreen } from "@/components/common/SessionErrorScreen";
import { homeFor, useAuthStore } from "@/features/auth";

/** Logged-in users only; anyone else (or a session that ended: 401) goes to the login page. */
export function RequireAuth({ children }: { children?: ReactNode }) {
  const status = useAuthStore((state) => state.status);
  const location = useLocation();
  if (status === "idle" || status === "loading") return <FullPageLoader />;
  if (status === "error") return <SessionErrorScreen />;
  if (status !== "authenticated") {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return children ? <>{children}</> : <Outlet />;
}

/** One interface per role (FR-USR-07): any other role is sent to its own home. */
export function RequireRole({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user)} replace />;
  return children ? <>{children}</> : <Outlet />;
}

/** Login and registration are for visitors (UC-01 and UC-02 preconditions). */
export function GuestOnly({ children }: { children?: ReactNode }) {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  if (status === "idle" || status === "loading") return <FullPageLoader />;
  if (status === "authenticated" && user) return <Navigate to={homeFor(user)} replace />;
  return children ? <>{children}</> : <Outlet />;
}

/** `/app`: the role's home, read from GET /auth/me/. */
export function RoleHomeRedirect() {
  const user = useAuthStore((state) => state.user);
  return <Navigate to={homeFor(user)} replace />;
}
