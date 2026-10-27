import { isAxiosError } from "axios";

import type { ApiErrorBody, ErrorCode, ErrorDetails } from "./contracts";

/** Every failed call becomes an ApiError carrying the contract's `{type, code, details}`. */
export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly code: ErrorCode | string;
  readonly details: ErrorDetails;

  constructor(status: number, type: string, code: string, details: ErrorDetails = {}) {
    super(typeof details.detail === "string" ? details.detail : code);
    this.name = "ApiError";
    this.status = status;
    this.type = type;
    this.code = code;
    this.details = details;
  }

  /** `details.<field>: [messages]`: the field errors, without `detail` and the extra keys. */
  get fieldErrors(): Record<string, string[]> {
    const fields: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(this.details)) {
      if (key === "detail") continue;
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) {
        fields[key] = value as string[];
      }
    }
    return fields;
  }

  get hasFieldErrors(): boolean {
    return Object.keys(this.fieldErrors).length > 0;
  }
}

function isErrorBody(value: unknown): value is ApiErrorBody {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<ApiErrorBody>;
  return body.success === false && !!body.error && typeof body.error.code === "string";
}

/** Normalize anything thrown by Axios (or the mock adapter) into an ApiError. */
export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (isAxiosError(error)) {
    const response = error.response;
    if (response && isErrorBody(response.data)) {
      const { type, code, details } = response.data.error;
      return new ApiError(response.status, type, code, details ?? {});
    }
    if (response) {
      return new ApiError(
        response.status,
        response.status >= 500 ? "server_error" : "request_error",
        response.status >= 500 ? "server_error" : "malformed_request",
      );
    }
    return new ApiError(0, "network_error", "network_error");
  }
  return new ApiError(0, "client_error", "unknown_error");
}
