import { FormEvent, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { loginSchema } from '@/shared';
import { authApi } from './authApi';
import { useAuthStore } from '../../store/authStore';
import { ApiClientError } from '../../utils/api';
import { apiFieldErrors, validateForm, type FieldErrors } from '../../utils/formErrors';
import { ErrorAlert, Field } from '../../components/ui';
import { AuthShell } from '../../components/layout/AuthShell';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const passwordSet = (location.state as { passwordSet?: string } | null)?.passwordSet;
  const setSession = useAuthStore((s) => s.setSession);
  const [email, setEmail] = useState(passwordSet ?? '');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = validateForm(loginSchema, { email, password });
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await authApi.login(parsed.data);
      setSession(result.user, result.tokens);
      navigate('/dashboard');
    } catch (err) {
      const fromApi = apiFieldErrors(err);
      if (Object.keys(fromApi).length) setFieldErrors(fromApi);
      setError(err instanceof ApiClientError ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to your Novora CRM workspace."
      footer={
        <>
          New company?{' '}
          <Link to="/register" className="link-brand">
            Create a workspace
          </Link>
        </>
      }
    >
      {passwordSet && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
          Your password is set. Sign in with your new password.
        </div>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1">
        <Field label="Email" htmlFor="login-email" error={fieldErrors.email}>
          <Field.Input
            id="login-email"
            type="email"
            autoComplete="email"
            value={email}
            invalid={Boolean(fieldErrors.email)}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: '' }));
            }}
          />
        </Field>
        <div className="-mb-1 flex justify-end">
          <Link to="/forgot-password" className="link-brand text-xs">
            Forgot password?
          </Link>
        </div>
        <Field label="Password" htmlFor="login-password" error={fieldErrors.password}>
          <Field.Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            invalid={Boolean(fieldErrors.password)}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: '' }));
            }}
          />
        </Field>

        {error && (
          <div className="mb-2">
            <ErrorAlert message={error} />
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
