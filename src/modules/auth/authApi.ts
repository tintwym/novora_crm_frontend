import type { AuthTokens, AuthUser, LoginInput, RegisterInput } from '@/shared';
import { api } from '../../utils/api';

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
  company?: { id: string; name: string };
}

export interface Workspace {
  id: string;
  name: string;
  industry: string | null;
  size: string | null;
  portalSlug: string | null;
}

export type ResetLinkStatus =
  | { valid: false }
  | { valid: true; purpose: 'RESET' | 'INVITE'; email: string; name: string };

type MeResponse = AuthUser & {
  company: { id: string; name: string; industry: string | null; size: string | null };
};

export const authApi = {
  register: (data: RegisterInput) => api.post<AuthResult>('/auth/register', data),
  login: (data: LoginInput) => api.post<AuthResult>('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post<AuthResult>('/auth/refresh', { refreshToken }),
  logout: (refreshToken: string) => api.post<null>('/auth/logout', { refreshToken }),
  me: () => api.get<MeResponse>('/auth/me'),
  updateMe: (data: { name?: string; email?: string }) => api.patch<MeResponse>('/auth/me', data),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<null>('/auth/change-password', data),
  forgotPassword: (email: string) => api.post<{ message: string }>('/auth/forgot-password', { email }),
  checkResetLink: (token: string) =>
    api.get<ResetLinkStatus>(`/auth/reset-password?token=${encodeURIComponent(token)}`),
  resetPassword: (token: string, password: string) =>
    api.post<{ email: string }>('/auth/reset-password', { token, password }),
  emailStatus: () => api.get<{ enabled: boolean; from: string | null }>('/auth/email-status'),
  sendTestEmail: () => api.post<{ sentTo: string }>('/auth/email-test', {}),
  company: () => api.get<Workspace>('/auth/company'),
  updateCompany: (data: { name?: string; industry?: string | null; size?: string | null }) =>
    api.patch<Workspace>('/auth/company', data),
};
