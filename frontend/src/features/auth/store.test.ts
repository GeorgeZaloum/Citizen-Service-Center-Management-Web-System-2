import { http } from "@/api/http-client";
import { mockAdapter, setMockLatency } from "@/mocks/adapter";
import { DEMO_PASSWORD, resetMockDb } from "@/mocks/db";

import { fetchCsrfToken, login } from "./api";
import { useAuthStore } from "./store";

beforeEach(() => {
  resetMockDb();
  setMockLatency(0);
  http.defaults.adapter = mockAdapter;
  useAuthStore.setState({ user: null, status: "idle", notice: null });
});

describe("auth store bootstrap", () => {
  it("ends anonymous when there is no session", async () => {
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", user: null });
  });

  it("restores the session's user from GET /auth/me/", async () => {
    await fetchCsrfToken();
    await login({ email: "manager.traffic@demo.csc", password: DEMO_PASSWORD });
    await useAuthStore.getState().bootstrap();
    const { status, user } = useAuthStore.getState();
    expect(status).toBe("authenticated");
    expect(user?.role).toBe("DEPT_MANAGER");
    expect(user?.department?.name).toBe("المرور");
  });

  it("reports a server that cannot be reached as an error, not as a logout", async () => {
    http.defaults.adapter = async () => {
      throw new Error("offline");
    };
    await useAuthStore.getState().bootstrap();
    expect(useAuthStore.getState().status).toBe("error");
  });

  it("clears the user and keeps the reason when the session expires", () => {
    useAuthStore.setState({ status: "authenticated" });
    useAuthStore.getState().clearSession("expired");
    expect(useAuthStore.getState()).toMatchObject({ status: "anonymous", notice: "expired", user: null });
  });
});
