import { api } from '../../utils/api';
import type { Role } from '@/shared';

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InviteResult {
  emailed: boolean;
  /** Only returned when email isn't configured, so the admin can share it by hand. */
  link: string | null;
}

export const usersApi = {
  list: () => api.get<TeamUser[]>('/users'),
  create: (data: { name: string; email: string; password?: string; role: Role; sendInvite?: boolean }) =>
    api.post<TeamUser & { invite?: InviteResult }>('/users', data),
  resendInvite: (id: string) => api.post<InviteResult>(`/users/${id}/invite`, {}),
  update: (
    id: string,
    data: Partial<{ name: string; role: Role; isActive: boolean; password: string }>,
  ) => api.patch<TeamUser>(`/users/${id}`, data),
};
