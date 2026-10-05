import type { ZodError, ZodTypeAny } from 'zod';
import { ApiClientError } from './api';

export type FieldErrors = Record<string, string>;

export function zodFieldErrors(error: ZodError): FieldErrors {
  const map: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.map(String).join('.') || '_form';
    if (!map[key]) map[key] = issue.message;
  }
  return map;
}

/** Validate with Zod; returns field errors or null when valid. */
export function validateForm<T extends ZodTypeAny>(
  schema: T,
  data: unknown,
): { ok: true; data: T['_output'] } | { ok: false; fieldErrors: FieldErrors } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, fieldErrors: zodFieldErrors(result.error) };
}

/** Map API validation payload `{ field: message }` onto inputs. */
export function apiFieldErrors(err: unknown): FieldErrors {
  if (!(err instanceof ApiClientError) || err.errors == null) return {};
  if (typeof err.errors !== 'object' || Array.isArray(err.errors)) return {};
  const map: FieldErrors = {};
  for (const [key, value] of Object.entries(err.errors as Record<string, unknown>)) {
    if (typeof value === 'string' && value.trim()) map[key] = value;
    else if (Array.isArray(value) && typeof value[0] === 'string') map[key] = value[0];
  }
  return map;
}
