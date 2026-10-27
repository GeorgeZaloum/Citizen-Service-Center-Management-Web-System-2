import type {
  Department,
  DepartmentCreateRequest,
  DepartmentDetail,
  DepartmentListParams,
  DepartmentStatusChange,
  DepartmentUpdateRequest,
  Paginated,
  RemoveManagerRequest,
} from "@/api/contracts";
import { ENDPOINTS } from "@/api/endpoints";
import { api, cleanParams, toPaginated } from "@/api/http-client";

/** UC-14: archived departments appear only with status=ARCHIVED. */
export async function listDepartments(params: DepartmentListParams = {}): Promise<Paginated<Department>> {
  const envelope = await api.get<{ departments: Department[] }>(ENDPOINTS.departments, cleanParams(params));
  return toPaginated(envelope, "departments");
}

export async function getDepartment(id: number): Promise<DepartmentDetail> {
  const envelope = await api.get<{ department: DepartmentDetail }>(ENDPOINTS.department(id));
  return envelope.data.department;
}

/** UC-09 */
export async function createDepartment(input: DepartmentCreateRequest): Promise<DepartmentDetail> {
  const envelope = await api.post<{ department: DepartmentDetail }>(ENDPOINTS.departments, input);
  return envelope.data.department;
}

/** UC-10 */
export async function updateDepartment(
  id: number,
  input: DepartmentUpdateRequest,
): Promise<DepartmentDetail> {
  const envelope = await api.patch<{ department: DepartmentDetail }>(ENDPOINTS.department(id), input);
  return envelope.data.department;
}

/** UC-11 */
export async function setDepartmentStatus(
  id: number,
  status: DepartmentStatusChange,
): Promise<DepartmentDetail> {
  const envelope = await api.patch<{ department: DepartmentDetail }>(ENDPOINTS.departmentStatus(id), {
    status,
  });
  return envelope.data.department;
}

/** UC-12: the department name typed exactly. */
export async function deleteDepartment(id: number, confirmName: string): Promise<void> {
  await api.delete<null>(ENDPOINTS.department(id), { confirm_name: confirmName });
}

/** UC-12 2b */
export async function archiveDepartment(id: number): Promise<DepartmentDetail> {
  const envelope = await api.post<{ department: DepartmentDetail }>(ENDPOINTS.departmentArchive(id));
  return envelope.data.department;
}

/** UC-13 */
export async function removeManager(
  departmentId: number,
  userId: number,
  input: RemoveManagerRequest,
): Promise<{ left_without_manager: boolean; department: DepartmentDetail }> {
  const envelope = await api.post<{ left_without_manager: boolean; department: DepartmentDetail }>(
    ENDPOINTS.departmentRemoveManager(departmentId, userId),
    input,
  );
  return envelope.data;
}
