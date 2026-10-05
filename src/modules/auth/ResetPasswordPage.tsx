import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi, type ResetLinkStatus } from './authApi';
import { ApiClientError } from '../../utils/api';
import { ErrorAlert, Field, LoadingState } from '../../components/ui';
import { AuthShell } from '../../components/layout/AuthShell';
import { useAuthStore } from '../../store/authStore';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const navigate = useNavigate();
  const signedIn = useAuthStore((s) => Boolean(s.user));
  const clearSession = useAuthStore((s) => s.clearSession);
  const [status, setStatus] = useState<ResetLinkStatus | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus({ valid: false });
      return;
    }
    let cancelled = false;
    authApi
      .checkResetLink(token)
      .then((s) => !cancelled && setStatus(s))
      .catch(() => !cancelled && setStatus({ valid: false }));
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const next: typeof errors = {};
    if (password.length < 8) next.password = 'Password must be at least 8 characters';
    else if (password.length > 128) next.password = 'Password is too long';
    if (confirm !== password) next.confirm = "Passwords don't match";
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      const res = await authApi.resetPassword(token, password);
      if (signedIn) clearSession();
      navigate('/login', { replace: true, state: { passwordSet: res.email } });
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const invite = status?.valid && status.purpose === 'INVITE';

  if (!status) {
    return (
      <AuthShell title="Checking your link…" subtitle="">
        <LoadingState />
      </AuthShell>
    );
  }

  if (!status.valid) {
    return (
      <AuthShell
        title="This link doesn't work"
        subtitle="It may have expired or already been used."
        footer={
          <Link to="/login" className="link-brand">
            Back to sign in
          </Link>
        }
      >
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-300">
          Reset links work for 1 hour and invite links for 7 days. Each link can only be used once.
        </p>
        <Link to="/forgot-password" className="btn-primary inline-flex w-full justify-center">
          Send a new reset link
        </Link>
        <p className="mt-3 text-xs text-slate-500">Invited by a teammate? Ask them to resend your invite.</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title={invite ? `Welcome, ${status.name.split(' ')[0]}` : 'Choose a new password'}
      subtitle={invite ? `Set a password to finish joining. You'll sign in as ${status.email}.` : `For ${status.email}`}
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1">
        <Field label="New password" htmlFor="reset-password" error={errors.password}>
          <Field.Input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            autoFocus
            value={password}
            invalid={Boolean(errors.password)}
            onChange={(e) => {
              setPassword(e.target.value);
              setErrors((p) => ({ ...p, password: undefined }));
            }}
          />
        </Field>
        <Field label="Confirm password" htmlFor="reset-confirm" error={errors.confirm}>
          <Field.Input
            id="reset-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            invalid={Boolean(errors.confirm)}
            onChange={(e) => {
              setConfirm(e.target.value);
              setErrors((p) => ({ ...p, confirm: undefined }));
            }}
          />
        </Field>
        <p className="mb-2 text-xs text-slate-500">At least 8 characters.</p>
        {error && (
          <div className="mb-2">
            <ErrorAlert message={error} />
          </div>
        )}
        <button type="submit" disabled={saving} className="btn-primary mt-2 w-full">
          {saving ? 'Saving…' : invite ? 'Set password' : 'Save new password'}
        </button>
      </form>
    </AuthShell>
  );
}
