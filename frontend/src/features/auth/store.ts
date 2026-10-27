import { create } from "zustand";

import type { CurrentUser } from "@/api/contracts";
import { ApiError } from "@/api/errors";

import { fetchCsrfToken, fetchMe } from "./api";

export type SessionStatus = "idle" | "loading" | "authenticated" | "anonymous" | "error";
export type SessionNotice = "expired" | "logged_out" | null;

interface AuthState {
  user: CurrentUser | null;
  status: SessionStatus;
  /** Why the user landed on the login page (UC-06 2a: "the session has ended"). */
  notice: SessionNotice;
  bootstrap: () => Promise<void>;
  setUser: (user: CurrentUser) => void;
  clearSession: (notice?: SessionNotice) => void;
  consumeNotice: () => void;
}

/** Zustand holds only the current user; server data lives in TanStack Query. */
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  status: "idle",
  notice: null,

  // Start-up: get the CSRF cookie, then ask the server who is logged in (cookie session).
  bootstrap: async () => {
    if (get().status === "loading") return;
    set({ status: "loading" });
    try {
      await fetchCsrfToken();
      const user = await fetchMe();
      set({ user, status: "authenticated" });
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        set({ user: null, status: "anonymous" });
      } else {
        set({ user: null, status: "error" });
      }
    }
  },

  setUser: (user) => set({ user, status: "authenticated", notice: null }),

  clearSession: (notice = null) => set({ user: null, status: "anonymous", notice }),

  consumeNotice: () => set({ notice: null }),
}));
