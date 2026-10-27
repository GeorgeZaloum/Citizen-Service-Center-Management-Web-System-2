import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  DepartmentCreateRequest,
  DepartmentListParams,
  DepartmentStatusChange,
  DepartmentUpdateRequest,
  RemoveManagerRequest,
} from "@/api/contracts";

import {
  archiveDepartment,
  createDepartment,
  deleteDepartment,
  getDepartment,
  listDepartments,
  removeManager,
  setDepartmentStatus,
  updateDepartment,
} from "./api";

export const departmentKeys = {
  all: ["departments"] as const,
  list: (params: DepartmentListParams) => ["departments", "list", params] as const,
  detail: (id: number) => ["departments", "detail", id] as const,
};

export function useDepartments(params: DepartmentListParams, enabled = true) {
  return useQuery({
    queryKey: departmentKeys.list(params),
    queryFn: () => listDepartments(params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Active departments for the selects of UC-04 and UC-17 (one page of up to 100). */
export function useActiveDepartments(enabled = true) {
  return useDepartments({ status: "ACTIVE", page_size: 100 }, enabled);
}

export function useDepartment(id: number) {
  return useQuery({
    queryKey: departmentKeys.detail(id),
    queryFn: () => getDepartment(id),
    enabled: Number.isFinite(id),
  });
}

function useInvalidateDepartments() {
  const client = useQueryClient();
  return () => {
    void client.invalidateQueries({ queryKey: departmentKeys.all });
    void client.invalidateQueries({ queryKey: ["users"] });
  };
}

export function useCreateDepartment() {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (input: DepartmentCreateRequest) => createDepartment(input),
    onSuccess: invalidate,
  });
}

export function useUpdateDepartment(id: number) {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (input: DepartmentUpdateRequest) => updateDepartment(id, input),
    onSuccess: invalidate,
  });
}

export function useSetDepartmentStatus(id: number) {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: (status: DepartmentStatusChange) => setDepartmentStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteDepartment(id: number) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (confirmName: string) => deleteDepartment(id, confirmName),
    onSuccess: () => {
      client.removeQueries({ queryKey: departmentKeys.detail(id) });
      void client.invalidateQueries({ queryKey: departmentKeys.all });
      void client.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useArchiveDepartment(id: number) {
  const invalidate = useInvalidateDepartments();
  return useMutation({ mutationFn: () => archiveDepartment(id), onSuccess: invalidate });
}

export function useRemoveManager(departmentId: number) {
  const invalidate = useInvalidateDepartments();
  return useMutation({
    mutationFn: ({ userId, input }: { userId: number; input: RemoveManagerRequest }) =>
      removeManager(departmentId, userId, input),
    onSuccess: invalidate,
  });
}
