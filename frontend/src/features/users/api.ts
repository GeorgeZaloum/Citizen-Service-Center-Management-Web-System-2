import type {
  Paginated,
  ResetPasswordRequest,
  StaffCreateRequest,
  StaffUpdateRequest,
  User,
  UserDetail,
  UserListParams,
  UserStatusRequest,
} from "@/api/contracts";
import { ENDPOINTS } from "@/api/endpoints";
import { api, cleanParams, toPaginated } from "@/api/http-client";

/** UC-18: the server limits the list to the caller's scope. */
export async function listUsers(params: UserListParams = {}): Promise<Paginated<User>> {
  const envelope = await api.get<{ users: User[] }>(ENDPOINTS.users, cleanParams(params));
  return toPaginated(envelope, "users");
}

export async function getUser(id: number): Promise<UserDetail> {
  const envelope = await api.get<{ user: UserDetail }>(ENDPOINTS.user(id));
  return envelope.data.user;
}

/** UC-04 (System Administrator → Department Manager) and UC-05 (Department Manager → Employee). */
export async function createStaff(input: StaffCreateRequest): Promise<User> {
  const envelope = await api.post<{ user: User }>(ENDPOINTS.users, input);
  return envelope.data.user;
}

/** UC-15 */
export async function updateUser(id: number, input: StaffUpdateRequest): Promise<UserDetail> {
  const envelope = await api.patch<{ user: UserDetail }>(ENDPOINTS.user(id), input);
  return envelope.data.user;
}

/** UC-03 */
export async function resetUserPassword(id: number, input: ResetPasswordRequest): Promise<void> {
  await api.post<null>(ENDPOINTS.userResetPassword(id), input);
}

/** UC-16: a reason is required to deactivate. */
export async function setUserStatus(id: number, input: UserStatusRequest): Promise<UserDetail> {
  const envelope = await api.patch<{ user: UserDetail }>(ENDPOINTS.userStatus(id), input);
  return envelope.data.user;
}

/** UC-17 */
export async function transferUser(id: number, departmentId: number): Promise<UserDetail> {
  const envelope = await api.post<{ user: UserDetail }>(ENDPOINTS.userTransfer(id), {
    department_id: departmentId,
  });
  return envelope.data.user;
}
