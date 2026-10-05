import type { Role } from '../constants/roles';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  companyId: string;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: unknown;
}

export interface ApiSuccessBody<T> {
  success: true;
  data: T;
  message?: string;
}

export type ApiResponse<T> = ApiSuccessBody<T> | ApiErrorBody;
