import type { ApiResponse, AuthTokens, AuthUser } from '@/shared';
import { useAuthStore } from '../store/authStore';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public status: number,
    public errors?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

type RequestOptions = RequestInit & { _retried?: boolean };

/** Single in-flight refresh so parallel 401s share one rotate */
let refreshPromise: Promise<boolean> | null = null;

function isAuthCredentialPath(path: string) {
  return (
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/logout') ||
    path.startsWith('/auth/forgot-password') ||
    path.startsWith('/auth/reset-password')
  );
}

async function refreshSession(): Promise<boolean> {
  const { tokens, setSession, clearSession } = useAuthStore.getState();
  if (!tokens?.refreshToken) {
    clearSession();
    return false;
  }

  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    const body = (await res.json()) as ApiResponse<{ user: AuthUser; tokens: AuthTokens }>;

    if (!res.ok || !body.success) {
      clearSession();
      return false;
    }

    setSession(body.data.user, body.data.tokens);
    return true;
  } catch {
    clearSession();
    return false;
  }
}

function ensureRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = refreshSession().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const tokens = useAuthStore.getState().tokens;
  const headers = new Headers(options.headers);

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (tokens?.accessToken) {
    headers.set('Authorization', `Bearer ${tokens.accessToken}`);
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  let body: ApiResponse<T>;
  try {
    body = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiClientError('Invalid server response', res.status);
  }

  if (!res.ok || !body.success) {
    const message = !body.success ? body.message : 'Request failed';
    const errors = !body.success ? body.errors : undefined;

    if (res.status === 401 && !options._retried && !isAuthCredentialPath(path)) {
      const refreshed = await ensureRefresh();
      if (refreshed) {
        return request<T>(path, { ...options, _retried: true });
      }
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    throw new ApiClientError(message, res.status, errors);
  }

  return body.data;
}

/** Fetches a protected file with the session token and saves it, or opens it in `target` when given. */
async function downloadFile(
  path: string,
  fileName: string,
  target?: Window | null,
  retried = false,
): Promise<void> {
  const tokens = useAuthStore.getState().tokens;
  const res = await fetch(`${API_URL}${path}`, {
    headers: tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {},
  });
  if (res.status === 401 && !retried && (await ensureRefresh())) {
    return downloadFile(path, fileName, target, true);
  }
  if (!res.ok) {
    let message = 'Download failed';
    try {
      const body = (await res.json()) as ApiResponse<unknown>;
      if (!body.success) message = body.message;
    } catch {
      // non-JSON error body
    }
    target?.close();
    throw new ApiClientError(message, res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  if (target) {
    target.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  upload: <T>(path: string, form: FormData) => request<T>(path, { method: 'POST', body: form }),
  download: downloadFile,
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(data ?? {}) }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data ?? {}) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};
