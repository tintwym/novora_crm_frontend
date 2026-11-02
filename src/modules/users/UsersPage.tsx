import { FormEvent, useEffect, useState } from 'react';
import { ASSIGNABLE_ROLES, Permission, Role, createUserSchema } from '@/shared';
import { usersApi, type InviteResult, type TeamUser } from './usersApi';
import { useAuthStore } from '../../store/authStore';
import { ApiClientError } from '../../utils/api';
import { apiFieldErrors, validateForm, type FieldErrors } from '../../utils/formErrors';
import { usePermission } from '../../hooks/usePermission';
import { formatRole, initials } from '../../utils/format';
import { IconTeam } from '../../components/icons/Icons';
import {
  Button,
  DataTable,
  ErrorAlert,
  Field,
  PageHeader,
  Panel,
} from '../../components/ui';

type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export function UsersPage() {
  const canManage = usePermission(Permission.MANAGE_USERS);
  const canView = usePermission(Permission.VIEW_USERS);
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showForm, setShowForm] = useState(false);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const [notice, setNotice] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<{ email: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'SALES_REP' as AssignableRole,
    sendInvite: true,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await usersApi.list());
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) void load();
    else setLoading(false);
  }, [canView]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  }

  function showInviteResult(email: string, invite: InviteResult) {
    setCopied(false);
    if (invite.emailed) {
      setShareLink(null);
      setNotice(`Invite emailed to ${email}. The link works for 7 days.`);
    } else if (invite.link) {
      setNotice(null);
      setShareLink({ email, link: invite.link });
    }
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setShareLink(null);
    const { sendInvite, ...fields } = form;
    const parsed = sendInvite
      ? validateForm(createUserSchema.omit({ password: true }), fields)
      : validateForm(createUserSchema, fields);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    try {
      const created = await usersApi.create({
        ...parsed.data,
        role: parsed.data.role as Role,
        sendInvite,
      });
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'SALES_REP', sendInvite: true });
      if (created.invite) showInviteResult(created.email, created.invite);
      else setNotice(`${created.name} can now sign in with the temporary password.`);
      await load();
    } catch (err) {
      const fromApi = apiFieldErrors(err);
      if (Object.keys(fromApi).length) setFieldErrors(fromApi);
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  async function toggleActive(user: TeamUser) {
    try {
      await usersApi.update(user.id, { isActive: !user.isActive });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  async function resendInvite(user: TeamUser) {
    setBusyId(user.id);
    setError(null);
    try {
      showInviteResult(user.email, await usersApi.resendInvite(user.id));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not send the invite');
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink() {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink.link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  async function changeRole(user: TeamUser, role: AssignableRole) {
    try {
      await usersApi.update(user.id, { role: role as Role });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Role update failed');
    }
  }

  function toggleForm() {
    setShowForm((v) => !v);
    setFieldErrors({});
  }

  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Team" description="Invite teammates and manage roles for this workspace" />
        <ErrorAlert message="You do not have permission to view team members." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description="Invite teammates and manage roles for this workspace"
        actions={
          canManage ? (
            <Button onClick={toggleForm}>{showForm ? 'Cancel' : 'Invite user'}</Button>
          ) : undefined
        }
      />

      {error && <ErrorAlert message={error} />}

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" className="text-brand-700/70 hover:text-brand-800" onClick={() => setNotice(null)}>
            ✕
          </button>
        </div>
      )}

      {shareLink && (
        <Panel
          title="Share this invite link"
          description={`Email isn't set up yet, so send this link to ${shareLink.email} yourself. It works for 7 days and can be used once.`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <input readOnly aria-label="Invite link" value={shareLink.link} onFocus={(e) => e.target.select()} className="field-input min-w-0 flex-1 font-mono text-xs" />
            <Button variant="secondary" onClick={() => void copyLink()}>
              {copied ? 'Copied' : 'Copy link'}
            </Button>
            <Button variant="ghost" onClick={() => setShareLink(null)}>
              Done
            </Button>
          </div>
        </Panel>
      )}

      {showForm && canManage && (
        <Panel
          title="Invite teammate"
          description={
            form.sendInvite
              ? 'We email them a link to set their own password.'
              : 'They sign in with the temporary password you set.'
          }
        >
          <form onSubmit={onCreate} noValidate className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <Field label="Name" htmlFor="user-name" error={fieldErrors.name}>
              <Field.Input
                id="user-name"
                value={form.name}
                invalid={Boolean(fieldErrors.name)}
                onChange={(e) => setField('name', e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="user-email" error={fieldErrors.email}>
              <Field.Input
                id="user-email"
                type="email"
                value={form.email}
                invalid={Boolean(fieldErrors.email)}
                onChange={(e) => setField('email', e.target.value)}
              />
            </Field>
            {!form.sendInvite && (
              <Field
                label="Temporary password"
                htmlFor="user-password"
                error={fieldErrors.password}
                hint="Min 8 characters"
              >
                <Field.Input
                  id="user-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  invalid={Boolean(fieldErrors.password)}
                  onChange={(e) => setField('password', e.target.value)}
                />
              </Field>
            )}
            <Field label="Role" htmlFor="user-role" error={fieldErrors.role}>
              <Field.Select
                id="user-role"
                value={form.role}
                invalid={Boolean(fieldErrors.role)}
                onChange={(e) => setField('role', e.target.value as AssignableRole)}
              >
                {ASSIGNABLE_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {formatRole(role)}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <label className="flex items-center gap-2 pt-1 text-sm text-slate-700 dark:text-slate-200 sm:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                checked={form.sendInvite}
                onChange={(e) => setField('sendInvite', e.target.checked)}
              />
              Email them an invite link to set their own password
            </label>
            <div className="flex gap-2 pt-2 sm:col-span-2">
              <Button type="submit">{form.sendInvite ? 'Send invite' : 'Create user'}</Button>
              <Button variant="secondary" onClick={toggleForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      <DataTable
        loading={loading}
        rows={users}
        rowKey={(u) => u.id}
        emptyIcon={IconTeam}
        emptyTitle="No team members yet"
        emptyMessage={
          canManage
            ? 'Invite teammates so you can assign contacts, deals and tickets.'
            : 'Team members will appear here once an admin invites them.'
        }
        toolbar={
          <>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Members</p>
            <span className="text-xs text-slate-400">
              {loading ? '' : `${users.length} member${users.length === 1 ? '' : 's'}`}
            </span>
          </>
        }
        columns={[
          {
            key: 'name',
            header: 'Name',
            cell: (u) => (
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                    u.isActive
                      ? 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  {initials(u.name)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">
                    {u.name}
                    {u.hrmsLinked && (
                      <span
                        title="Synced from Novora HRMS: changes to this person in HRMS update their account here"
                        className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 align-middle text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                      >
                        HRMS
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-500">{u.email}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'role',
            header: 'Role',
            cell: (u) =>
              canManage ? (
                <select
                  className="field-input max-w-[11rem] py-1.5"
                  aria-label={`Role for ${u.name}`}
                  value={u.role}
                  onChange={(e) => void changeRole(u, e.target.value as AssignableRole)}
                >
                  {ASSIGNABLE_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatRole(role)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-slate-600 dark:text-slate-300">{formatRole(u.role)}</span>
              ),
          },
          {
            key: 'status',
            header: 'Status',
            cell: (u) => (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  u.isActive
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${u.isActive ? 'bg-brand-500' : 'bg-slate-400'}`}
                />
                {u.isActive ? 'Active' : 'Inactive'}
              </span>
            ),
          },
          {
            key: 'actions',
            header: '',
            className: 'text-right',
            cell: (u) =>
              canManage && u.id !== currentUserId ? (
                <div className="flex justify-end gap-2">
                  {u.isActive && (
                    <Button variant="ghost" disabled={busyId === u.id} onClick={() => void resendInvite(u)}>
                      {busyId === u.id ? 'Sending…' : 'Resend invite'}
                    </Button>
                  )}
                  <Button variant="secondary" onClick={() => void toggleActive(u)}>
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </Button>
                </div>
              ) : null,
          },
        ]}
      />
    </div>
  );
}
