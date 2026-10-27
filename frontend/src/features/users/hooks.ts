import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ResetPasswordRequest,
  StaffCreateRequest,
  StaffUpdateRequest,
  UserListParams,
  UserStatusRequest,
} from "@/api/contracts";

import {
  createStaff,
  getUser,
  listUsers,
  resetUserPassword,
  setUserStatus,
  transferUser,
  updateUser,
} from "./api";

export const userKeys = {
  all: ["users"] as const,
  list: (params: UserListParams) => ["users", "list", params] as const,
  detail: (id: number) => ["users", "detail", id] as const,
};

export function useUsers(params: UserListParams, enabled = true) {
  return useQuery({
    queryKey: userKeys.list(params),
    queryFn: () => listUsers(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useUser(id: number) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => getUser(id),
    enabled: Number.isFinite(id),
  });
}

/** Account changes also change department pages (managers, employee counts). */
function useInvalidateAccounts() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: userKeys.all });
    void client.invalidateQueries({ queryKey: ["departments"] });
  };
}

export function useCreateStaff() {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (input: StaffCreateRequest) => createStaff(input),
    onSuccess: invalidate,
  });
}

export function useUpdateUser(id: number) {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (input: StaffUpdateRequest) => updateUser(id, input),
    onSuccess: invalidate,
  });
}

export function useResetUserPassword(id: number) {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (input: ResetPasswordRequest) => resetUserPassword(id, input),
    onSuccess: invalidate,
  });
}

export function useSetUserStatus(id: number) {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (input: UserStatusRequest) => setUserStatus(id, input),
    onSuccess: invalidate,
  });
}

export function useTransferUser(id: number) {
  const invalidate = useInvalidateAccounts();
  return useMutation({
    mutationFn: (departmentId: number) => transferUser(id, departmentId),
    onSuccess: invalidate,
  });
}
