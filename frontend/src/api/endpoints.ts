import type { IdentitySide } from "./contracts";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api/v1";
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

/** Paths relative to API_BASE_URL, one per operation of openapi.yaml. */
export const ENDPOINTS = {
  csrf: "/auth/csrf/",
  register: "/auth/register/",
  login: "/auth/login/",
  logout: "/auth/logout/",
  me: "/auth/me/",
  mePassword: "/auth/me/password/",
  users: "/auth/users/",
  user: (id: number) => `/auth/users/${id}/`,
  userResetPassword: (id: number) => `/auth/users/${id}/reset-password/`,
  userStatus: (id: number) => `/auth/users/${id}/status/`,
  userTransfer: (id: number) => `/auth/users/${id}/transfer/`,
  identityDocument: (id: number, side: IdentitySide) =>
    `/auth/users/${id}/identity-documents/${side.toLowerCase()}/`,
  departments: "/departments/",
  department: (id: number) => `/departments/${id}/`,
  departmentStatus: (id: number) => `/departments/${id}/status/`,
  departmentArchive: (id: number) => `/departments/${id}/archive/`,
  departmentRemoveManager: (id: number, userId: number) => `/departments/${id}/managers/${userId}/remove/`,
  centerSettings: "/center-settings/",
} as const;
