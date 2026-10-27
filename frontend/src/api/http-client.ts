import axios, { type AxiosRequestConfig } from "axios";

import type { ApiSuccess, Paginated } from "./contracts";
import { CSRF_HEADER, getCsrfToken, isUnsafeMethod } from "./csrf";
import { API_BASE_URL } from "./endpoints";
import { toApiError } from "./errors";

declare module "axios" {
  interface AxiosRequestConfig {
    /** Do not treat a 401 of this call as "the session ended" (login, session probe). */
    skipSessionExpiry?: boolean;
  }
}

/** One Axios instance for the whole app. The mock adapter replaces only its transport. */
export const http = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { Accept: "application/json" },
});

http.interceptors.request.use((config) => {
  if (isUnsafeMethod(config.method)) {
    const token = getCsrfToken();
    if (token) config.headers.set(CSRF_HEADER, token);
  }
  return config;
});

type SessionExpiredHandler = () => void;
let onSessionExpired: SessionExpiredHandler | null = null;

/** Registered by the auth store: a 401 `not_authenticated` sends the user to the login page. */
export function setSessionExpiredHandler(handler: SessionExpiredHandler | null): void {
  onSessionExpired = handler;
}

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const apiError = toApiError(error);
    const config = (error as { config?: AxiosRequestConfig }).config;
    if (apiError.status === 401 && apiError.code === "not_authenticated" && !config?.skipSessionExpiry) {
      onSessionExpired?.();
    }
    return Promise.reject(apiError);
  },
);

// ---------------------------------------------------------------------- helpers
async function call<T>(config: AxiosRequestConfig): Promise<ApiSuccess<T>> {
  const response = await http.request<ApiSuccess<T>>(config);
  return response.data;
}

export const api = {
  get: <T>(url: string, params?: object, config?: AxiosRequestConfig) =>
    call<T>({ ...config, method: "get", url, params }),
  post: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    call<T>({ ...config, method: "post", url, data }),
  put: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    call<T>({ ...config, method: "put", url, data }),
  patch: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    call<T>({ ...config, method: "patch", url, data }),
  delete: <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    call<T>({ ...config, method: "delete", url, data }),
  /** Binary responses (ID card images): downloaded with the session cookie. */
  blob: async (url: string): Promise<Blob> => {
    const response = await http.get<Blob>(url, { responseType: "blob" });
    return response.data;
  },
};

/** A list envelope `{data: {<key>: [...]}, meta: {pagination}}` as items + pagination. */
export function toPaginated<T>(envelope: ApiSuccess<Record<string, T[]>>, key: string): Paginated<T> {
  const items = envelope.data[key] ?? [];
  const pagination = envelope.meta?.pagination ?? {
    page: 1,
    page_size: items.length,
    total_items: items.length,
    total_pages: items.length ? 1 : 0,
  };
  return { items, pagination };
}

/** Drop empty filter values so they never reach the query string. */
export function cleanParams<T extends object>(params: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== ""),
  ) as Partial<T>;
}
