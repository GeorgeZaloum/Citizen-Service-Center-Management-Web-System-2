import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import { lazy, Suspense, type ReactNode } from "react";
import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";

import { GuestOnly, RequireAuth, RequireRole, RoleHomeRedirect } from "@/components/guards/RouteGuards";
import { AppShell } from "@/components/layout/AppShell";
import { PublicLayout } from "@/components/layout/PublicLayout";

const LandingPage = lazy(() => import("@/pages/public/LandingPage"));
const NotFoundPage = lazy(() => import("@/pages/NotFoundPage"));
const DesignSystemPage = lazy(() => import("@/pages/DesignSystemPage"));
const ProfilePage = lazy(() => import("@/pages/account/ProfilePage"));
const ChangePasswordPage = lazy(() => import("@/pages/account/ChangePasswordPage"));
const MemberHomePage = lazy(() => import("@/pages/home/MemberHomePage"));
const ManagerHomePage = lazy(() => import("@/pages/home/ManagerHomePage"));
const AdminHomePage = lazy(() => import("@/pages/home/AdminHomePage"));
const UsersListPage = lazy(() => import("@/pages/users/UsersListPage"));
const StaffCreatePage = lazy(() => import("@/pages/users/StaffCreatePage"));
const UserDetailPage = lazy(() => import("@/pages/users/UserDetailPage"));
const DepartmentsListPage = lazy(() => import("@/pages/departments/DepartmentsListPage"));
const DepartmentCreatePage = lazy(() => import("@/pages/departments/DepartmentCreatePage"));
const DepartmentDetailPage = lazy(() => import("@/pages/departments/DepartmentDetailPage"));
const CenterSettingsPage = lazy(() => import("@/pages/settings/CenterSettingsPage"));

function page(element: ReactNode) {
  return (
    <Suspense
      fallback={
        <Box role="status" sx={{ py: 10, display: "grid", placeItems: "center" }}>
          <CircularProgress size={32} />
        </Box>
      }
    >
      {element}
    </Suspense>
  );
}

/** Route map of Sprint 1 (one interface per role, UC-02 step 4). */
export const routes: RouteObject[] = [
  {
    element: <PublicLayout />,
    children: [
      { index: true, element: page(<LandingPage />) },
      // Login and registration are dialogs over the landing page, each with its own URL.
      {
        element: <GuestOnly />,
        children: [
          { path: "login", element: page(<LandingPage authMode="login" />) },
          { path: "register", element: page(<LandingPage authMode="register" />) },
        ],
      },
      { path: "forgot-password", element: <Navigate to="/login" replace /> },
      ...(import.meta.env.DEV ? [{ path: "design", element: page(<DesignSystemPage />) }] : []),
      { path: "*", element: page(<NotFoundPage />) },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { path: "app", element: <RoleHomeRedirect /> },
          { path: "account/profile", element: page(<ProfilePage />) },
          { path: "account/password", element: page(<ChangePasswordPage />) },
          {
            element: <RequireRole roles={["CITIZEN"]} />,
            children: [{ path: "citizen", element: page(<MemberHomePage />) }],
          },
          {
            element: <RequireRole roles={["EMPLOYEE"]} />,
            children: [{ path: "employee", element: page(<MemberHomePage />) }],
          },
          {
            element: <RequireRole roles={["DEPT_MANAGER"]} />,
            children: [
              { path: "manager", element: page(<ManagerHomePage />) },
              { path: "manager/employees", element: page(<UsersListPage scope="manager" />) },
              { path: "manager/employees/new", element: page(<StaffCreatePage scope="manager" />) },
              { path: "manager/employees/:userId", element: page(<UserDetailPage scope="manager" />) },
            ],
          },
          {
            element: <RequireRole roles={["SYSTEM_ADMIN"]} />,
            children: [
              { path: "admin", element: page(<AdminHomePage />) },
              { path: "admin/departments", element: page(<DepartmentsListPage />) },
              { path: "admin/departments/new", element: page(<DepartmentCreatePage />) },
              { path: "admin/departments/:departmentId", element: page(<DepartmentDetailPage />) },
              { path: "admin/users", element: page(<UsersListPage scope="admin" />) },
              { path: "admin/users/new-manager", element: page(<StaffCreatePage scope="admin" />) },
              { path: "admin/users/:userId", element: page(<UserDetailPage scope="admin" />) },
              { path: "admin/settings", element: page(<CenterSettingsPage />) },
            ],
          },
        ],
      },
    ],
  },
];

export const ROUTER_FUTURE = {
  v7_relativeSplatPath: true,
  v7_fetcherPersist: true,
  v7_normalizeFormMethod: true,
  v7_partialHydration: true,
  v7_skipActionErrorRevalidation: true,
};

export function createAppRouter() {
  return createBrowserRouter(routes, { future: ROUTER_FUTURE });
}
