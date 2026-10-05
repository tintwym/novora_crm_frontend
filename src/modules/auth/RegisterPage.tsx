import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerSchema } from '@/shared';
import { authApi } from './authApi';
import { useAuthStore } from '../../store/authStore';
import { ApiClientError } from '../../utils/api';
import { apiFieldErrors, validateForm, type FieldErrors } from '../../utils/formErrors';
import { ErrorAlert, Field } from '../../components/ui';
import { AuthShell } from '../../components/layout/AuthShell';

export function RegisterPage() {
  const navigate = useNavigate();
  const setSession = useAuthStore((s) => s.setSession);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    industry: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      setFieldErrors((prev) => ({ ...prev, [field]: '' }));
    };
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = validateForm(registerSchema, form);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    setLoading(true);
    try {
      const result = await authApi.register({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        companyName: parsed.data.companyName,
        industry: parsed.data.industry,
      });
      setSession(result.user, result.tokens);
      navigate('/dashboard');
    } catch (err) {
      const fromApi = apiFieldErrors(err);
      if (Object.keys(fromApi).length) setFieldErrors(fromApi);
      setError(err instanceof ApiClientError ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Set up Novora for your company in under a minute."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="link-brand">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Company name" htmlFor="register-company" error={fieldErrors.companyName}>
            <Field.Input
              id="register-company"
              value={form.companyName}
              invalid={Boolean(fieldErrors.companyName)}
              onChange={update('companyName')}
            />
          </Field>
        </div>
        <Field label="Your name" htmlFor="register-name" error={fieldErrors.name}>
          <Field.Input
            id="register-name"
            value={form.name}
            invalid={Boolean(fieldErrors.name)}
            onChange={update('name')}
          />
        </Field>
        <Field label="Industry (optional)" htmlFor="register-industry" error={fieldErrors.industry}>
          <Field.Input
            id="register-industry"
            value={form.industry}
            invalid={Boolean(fieldErrors.industry)}
            onChange={update('industry')}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Work email" htmlFor="register-email" error={fieldErrors.email}>
            <Field.Input
              id="register-email"
              type="email"
              value={form.email}
              invalid={Boolean(fieldErrors.email)}
              onChange={update('email')}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field
            label="Password"
            htmlFor="register-password"
            error={fieldErrors.password}
            hint="At least 8 characters"
          >
            <Field.Input
              id="register-password"
              type="password"
              value={form.password}
              invalid={Boolean(fieldErrors.password)}
              onChange={update('password')}
            />
          </Field>
        </div>

        {error && (
          <div className="sm:col-span-2 mb-2">
            <ErrorAlert message={error} />
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary sm:col-span-2 mt-2 w-full">
          {loading ? 'Creating…' : 'Create workspace'}
        </button>
      </form>
    </AuthShell>
  );
}
