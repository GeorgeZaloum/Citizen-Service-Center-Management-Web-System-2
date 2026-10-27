// Axios adapter that answers from the mock server instead of the network. Only the
// transport changes: the interceptors (CSRF header, 401 handling, error normalization)
// run exactly as they do against the real backend.
import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

import { API_BASE_URL } from "@/api/endpoints";

import type { MockRequest } from "./core";
import { handleMockRequest } from "./router";

let latencyMs = 350;

/** Simulated network delay, so loading states are visible in the demo (0 in tests). */
export function setMockLatency(ms: number): void {
  latencyMs = ms;
}

function toMockRequest(config: InternalAxiosRequestConfig): MockRequest {
  const base = new URL(API_BASE_URL, "http://mock.local");
  const url = new URL(`${base.pathname.replace(/\/$/, "")}${config.url ?? ""}`, "http://mock.local");
  const query = new URLSearchParams(url.search);
  for (const [key, value] of Object.entries((config.params ?? {}) as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== "") query.set(key, String(value));
  }

  const body: Record<string, unknown> = {};
  const files: Record<string, File | Blob> = {};
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    config.data.forEach((value, key) => {
      if (typeof value === "string") body[key] = value;
      else files[key] = value;
    });
  } else if (typeof config.data === "string" && config.data) {
    Object.assign(body, JSON.parse(config.data) as Record<string, unknown>);
  } else if (config.data && typeof config.data === "object") {
    Object.assign(body, config.data as Record<string, unknown>);
  }

  const headers = Object.fromEntries(
    Object.entries(AxiosHeaders.from(config.headers).toJSON()).map(([key, value]) => [
      key.toLowerCase(),
      String(value),
    ]),
  );

  return {
    method: (config.method ?? "get").toUpperCase(),
    path: url.pathname.slice(base.pathname.replace(/\/$/, "").length) || "/",
    query,
    body,
    files,
    headers,
  };
}

export const mockAdapter: AxiosAdapter = async (config) => {
  const request = toMockRequest(config);
  if (latencyMs) await new Promise((resolve) => setTimeout(resolve, latencyMs));
  const result = handleMockRequest(request);

  const response: AxiosResponse = {
    data: result.body,
    status: result.status,
    statusText: String(result.status),
    headers: new AxiosHeaders({ "content-type": result.contentType ?? "application/json" }),
    config,
    request: { mock: true },
  };

  const validate = config.validateStatus ?? ((status: number) => status >= 200 && status < 300);
  if (!validate(response.status)) {
    throw new AxiosError(
      `Request failed with status code ${response.status}`,
      response.status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      response.request,
      response,
    );
  }
  return response;
};
