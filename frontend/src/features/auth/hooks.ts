import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import type {
  ChangePasswordRequest,
  LoginRequest,
  ProfileUpdateRequest,
  RegisterRequest,
} from "@/api/contracts";
import { ApiError } from "@/api/errors";

import { changePassword, login, logout, register, updateProfile } from "./api";
import { homeFor } from "./roles";
import { useAuthStore } from "./store";

export function useCurrentUser() {
  return useAuthStore((state) => state.user);
}

/**
 * UC-02: on success the session's user is stored and the user goes back to the page that
 * asked for a login, or to their role's interface (step 4).
 */
export function useLogin(redirectTo?: string | null) {
  const setUser = useAuthStore((state) => state.setUser);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: LoginRequest) => login(input),
    onSuccess: (user) => {
      queryClient.clear();
      setUser(user);
      navigate(redirectTo || homeFor(user), { replace: true });
    },
  });
}

/** UC-01: the account is created without a session; the user then logs in. */
export function useRegister() {
  return useMutation({ mutationFn: (input: RegisterRequest) => register(input) });
}

/** UC-06: an already-ended session (2a) also lands on the login page, with its message. */
export function useLogout() {
  const clearSession = useAuthStore((state) => state.clearSession);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: logout,
    onSettled: (_data, error) => {
      const expired = error instanceof ApiError && error.status === 401;
      queryClient.clear();
      clearSession(expired ? "expired" : "logged_out");
      navigate("/login", { replace: true });
    },
  });
}

/** UC-08: email and phone only; the stored user is refreshed from the answer. */
export function useUpdateProfile() {
  const setUser = useAuthStore((state) => state.setUser);
  return useMutation({
    mutationFn: (input: ProfileUpdateRequest) => updateProfile(input),
    onSuccess: (user) => setUser(user),
  });
}

/** UC-07 */
export function useChangePassword() {
  return useMutation({ mutationFn: (input: ChangePasswordRequest) => changePassword(input) });
}
