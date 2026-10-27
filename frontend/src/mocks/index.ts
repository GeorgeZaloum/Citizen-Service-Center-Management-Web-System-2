import { http } from "@/api/http-client";

import { mockAdapter } from "./adapter";

export { setMockLatency } from "./adapter";
export { DEMO_PASSWORD, resetMockDb } from "./db";

/** Route every request of the shared Axios instance to the mock server. */
export function installMocks(): void {
  http.defaults.adapter = mockAdapter;
}
