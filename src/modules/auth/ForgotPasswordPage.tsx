import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from './authApi';
import { ApiClientError } from '../../utils/api';
import { ErrorAlert, Field } from '../../components/ui';
import { AuthShell } from '../../components/layout/AuthShell';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setFieldError('Enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await authApi.forgotPassword(value);
      setSentTo(value);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter your work email and we'll send you a link to choose a new one."
      footer={
        <>
          Remembered it?{' '}
          <Link to="/login" className="link-brand">
            Back to sign in
          </Link>
        </>
      }
    >
      {sentTo ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-brand-200 bg-brand-50 p-4 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
            If <strong>{sentTo}</strong> has a Novora account, a reset link is on its way. It works for 1 hour.
          </div>
          <p className="text-sm text-slate-500">
            Didn't get it? Check your spam folder, or{' '}
            <button type="button" className="link-brand" onClick={() => setSentTo(null)}>
              try again
            </button>
            .
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-1">
          <Field label="Email" htmlFor="forgot-email" error={fieldError}>
            <Field.Input
              id="forgot-email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              invalid={Boolean(fieldError)}
              onChange={(e) => {
                setEmail(e.target.value);
                setFieldError('');
              }}
            />
          </Field>
          {error && (
            <div className="mb-2">
              <ErrorAlert message={error} />
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary mt-2 w-full">
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
