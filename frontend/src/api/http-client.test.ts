import { AxiosError, AxiosHeaders, type AxiosAdapter, type InternalAxiosRequestConfig } from "axios";

import { ENDPOINTS } from "./endpoints";
import { ApiError } from "./errors";
import { api, http, setSessionExpiredHandler } from "./http-client";

type Reply = { status: number; data: unknown };

/** Capture every request the client sends, and answer with `reply`. */
function stubTransport(
  reply: (config: InternalAxiosRequestConfig) => Reply = () => ({
    status: 200,
    data: { success: true, message: "ok", data: null },
  }),
) {
  const sent: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    sent.push(config);
    const { status, data } = reply(config);
    const response = { data, status, statusText: "", headers: new AxiosHeaders(), config, request: {} };
    if (status >= 400) throw new AxiosError("failed", AxiosError.ERR_BAD_REQUEST, config, {}, response);
    return response;
  };
  http.defaults.adapter = adapter;
  return sent;
}

function setCookie(value: string) {
  document.cookie = `csrftoken=${value}; path=/`;
}

const header = (config: InternalAxiosRequestConfig) => AxiosHeaders.from(config.headers).get("X-CSRFToken");

describe("http client: session and CSRF (README 'Session and CSRF')", () => {
  afterEach(() => setSessionExpiredHandler(null));

  it("sends every request with credentials (the session cookie)", async () => {
    const sent = stubTransport();
    await api.get(ENDPOINTS.me);
    expect(http.defaults.withCredentials).toBe(true);
    expect(sent[0].withCredentials).toBe(true);
    expect(sent[0].baseURL).toBe("/api/v1");
  });

  it.each(["post", "put", "patch", "delete"] as const)(
    "adds X-CSRFToken from the cookie on %s",
    async (method) => {
      setCookie("token-1");
      const sent = stubTransport();
      await api[method]("/anything/", { a: 1 });
      expect(header(sent[0])).toBe("token-1");
    },
  );

  it("does not add the CSRF header on GET", async () => {
    setCookie("token-1");
    const sent = stubTransport();
    await api.get("/anything/");
    expect(header(sent[0])).toBeFalsy();
  });

  it("reads the cookie again on each request, so the token rotated at login is used", async () => {
    setCookie("before-login");
    const sent = stubTransport();
    await api.post(ENDPOINTS.login, { email: "a@b.c", password: "x" });
    setCookie("after-login");
    await api.post(ENDPOINTS.logout);
    expect(header(sent[0])).toBe("before-login");
    expect(header(sent[1])).toBe("after-login");
  });

  it("sends registration as FormData (multipart), with the CSRF header", async () => {
    setCookie("token-2");
    const sent = stubTransport();
    const form = new FormData();
    form.append("full_name", "x");
    await api.post(ENDPOINTS.register, form);
    expect(sent[0].data).toBeInstanceOf(FormData);
    expect(header(sent[0])).toBe("token-2");
  });
});

describe("http client: errors", () => {
  afterEach(() => setSessionExpiredHandler(null));

  it("turns the error envelope into an ApiError with field errors", async () => {
    stubTransport(() => ({
      status: 400,
      data: {
        success: false,
        error: {
          type: "validation_error",
          code: "weak_password",
          details: {
            detail: "The password is not strong enough.",
            password: ["The password must contain a digit."],
          },
        },
      },
    }));
    const error = await api.post("/auth/register/", {}).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe("weak_password");
    expect(apiError.fieldErrors).toEqual({ password: ["The password must contain a digit."] });
  });

  it("keeps extra details (account_locked: retry_after_seconds) out of the field errors", async () => {
    stubTransport(() => ({
      status: 401,
      data: {
        success: false,
        error: {
          type: "authentication_error",
          code: "account_locked",
          details: { detail: "locked", locked_until: "2026-10-27T10:15:00Z", retry_after_seconds: 900 },
        },
      },
    }));
    const error = (await api
      .post(ENDPOINTS.login, {}, { skipSessionExpiry: true })
      .catch((e: unknown) => e)) as ApiError;
    expect(error.details.retry_after_seconds).toBe(900);
    expect(error.hasFieldErrors).toBe(false);
  });

  it("reports an ended session (401 not_authenticated) to the session handler", async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    stubTransport(() => ({
      status: 401,
      data: {
        success: false,
        error: { type: "authentication_error", code: "not_authenticated", details: {} },
      },
    }));
    await api.get("/auth/users/").catch(() => undefined);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("does not treat a failed login (401 invalid_credentials) as an ended session", async () => {
    const handler = vi.fn();
    setSessionExpiredHandler(handler);
    stubTransport(() => ({
      status: 401,
      data: {
        success: false,
        error: { type: "authentication_error", code: "invalid_credentials", details: {} },
      },
    }));
    await api.post(ENDPOINTS.login, {}, { skipSessionExpiry: true }).catch(() => undefined);
    expect(handler).not.toHaveBeenCalled();
  });

  it("maps a network failure to network_error", async () => {
    http.defaults.adapter = async (config) => {
      throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config);
    };
    const error = (await api.get("/x/").catch((e: unknown) => e)) as ApiError;
    expect(error.code).toBe("network_error");
  });
});
