import { FormEvent, useEffect, useState } from 'react';
import { Permission } from '@/shared';
import { authApi, type Workspace } from '../auth/authApi';
import { useAuthStore } from '../../store/authStore';
import { usePermission } from '../../hooks/usePermission';
import { ApiClientError } from '../../utils/api';
import { formatRole } from '../../utils/format';
import { Button, Field, Modal, PageHeader, Panel } from '../../components/ui';
import { sampleDataApi, type SampleDataStatus } from './sampleDataApi';
import { hrmsApi, type HrmsStatus } from './hrmsApi';

const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+'];

type Status = { kind: 'ok' | 'error'; message: string } | null;

function StatusLine({ status }: { status: Status }) {
  if (!status) return null;
  return (
    <p
      role={status.kind === 'error' ? 'alert' : 'status'}
      className={`text-sm ${
        status.kind === 'error' ? 'text-red-600 dark:text-red-400' : 'text-brand-700 dark:text-brand-300'
      }`}
    >
      {status.message}
    </p>
  );
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof ApiClientError ? err.message : fallback;
}

function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const tokens = useAuthStore((s) => s.tokens);
  const setSession = useAuthStore((s) => s.setSession);
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const dirty = name.trim() !== (user?.name ?? '') || email.trim().toLowerCase() !== (user?.email ?? '');

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setStatus({ kind: 'error', message: 'Name is required' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const me = await authApi.updateMe({ name: name.trim(), email: email.trim() });
      if (user && tokens) {
        setSession({ ...user, name: me.name, email: me.email }, tokens);
      }
      setStatus({ kind: 'ok', message: 'Profile saved' });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err, 'Could not save profile') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Profile" description="How you appear to your team">
      <form onSubmit={onSubmit} noValidate className="grid gap-x-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="profile-name">
          <Field.Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" htmlFor="profile-email" hint="Used to sign in">
          <Field.Input
            id="profile-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Role" htmlFor="profile-role" hint="Ask an admin to change your role">
          <Field.Input id="profile-role" value={formatRole(user?.role)} disabled />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save profile'}
          </Button>
          <StatusLine status={status} />
        </div>
      </form>
    </Panel>
  );
}

function PasswordSection() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      setStatus({ kind: 'error', message: 'New password must be at least 8 characters' });
      return;
    }
    if (next !== confirm) {
      setStatus({ kind: 'error', message: 'New passwords do not match' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      await authApi.changePassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setStatus({ kind: 'ok', message: 'Password updated' });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err, 'Could not update password') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Panel title="Password" description="Use at least 8 characters">
      <form onSubmit={onSubmit} noValidate className="grid gap-x-4 sm:grid-cols-3">
        <Field label="Current password" htmlFor="pw-current">
          <Field.Input
            id="pw-current"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
        </Field>
        <Field label="New password" htmlFor="pw-new">
          <Field.Input
            id="pw-new"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm">
          <Field.Input
            id="pw-confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </Field>
        <div className="flex items-center gap-3 sm:col-span-3">
          <Button type="submit" disabled={saving || !current || !next || !confirm}>
            {saving ? 'Updating…' : 'Update password'}
          </Button>
          <StatusLine status={status} />
        </div>
      </form>
    </Panel>
  );
}

function WorkspaceSection() {
  const canManage = usePermission(Permission.MANAGE_USERS);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('');
  const [size, setSize] = useState('');
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    authApi
      .company()
      .then((w) => {
        setWorkspace(w);
        setName(w.name);
        setIndustry(w.industry ?? '');
        setSize(w.size ?? '');
      })
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err, 'Could not load workspace') }));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setStatus({ kind: 'error', message: 'Workspace name is required' });
      return;
    }
    setSaving(true);
    setStatus(null);
    try {
      const w = await authApi.updateCompany({
        name: name.trim(),
        industry: industry.trim() || null,
        size: size || null,
      });
      setWorkspace(w);
      setStatus({ kind: 'ok', message: 'Workspace saved' });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err, 'Could not save workspace') });
    } finally {
      setSaving(false);
    }
  }

  const portalUrl = workspace?.portalSlug
    ? `${window.location.origin}/portal/${workspace.portalSlug}`
    : null;

  return (
    <Panel
      title="Workspace"
      description={canManage ? 'Company details shared by your whole team' : 'Only admins can edit these details'}
    >
      <form onSubmit={onSubmit} noValidate className="grid gap-x-4 sm:grid-cols-3">
        <Field label="Workspace name" htmlFor="ws-name">
          <Field.Input
            id="ws-name"
            value={name}
            disabled={!canManage}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Industry" htmlFor="ws-industry">
          <Field.Input
            id="ws-industry"
            value={industry}
            disabled={!canManage}
            onChange={(e) => setIndustry(e.target.value)}
          />
        </Field>
        <Field label="Company size" htmlFor="ws-size">
          <Field.Select
            id="ws-size"
            value={size}
            disabled={!canManage}
            onChange={(e) => setSize(e.target.value)}
          >
            <option value="">Not set</option>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s} people
              </option>
            ))}
          </Field.Select>
        </Field>
        {canManage && (
          <div className="flex items-center gap-3 sm:col-span-3">
            <Button type="submit" disabled={saving || !workspace}>
              {saving ? 'Saving…' : 'Save workspace'}
            </Button>
            <StatusLine status={status} />
          </div>
        )}
        {!canManage && <StatusLine status={status} />}
      </form>

      {portalUrl && (
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Customer support portal</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Share this link so customers can submit and track tickets without an account.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <code className="flex-1 truncate rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {portalUrl}
            </code>
            <Button
              variant="secondary"
              onClick={() => void navigator.clipboard?.writeText(portalUrl)}
            >
              Copy link
            </Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

const SAMPLE_LABELS: Array<[string, string]> = [
  ['ACCOUNT', 'companies'],
  ['CONTACT', 'contacts'],
  ['DEAL', 'deals'],
  ['ACTIVITY', 'activities'],
  ['QUOTE', 'quotes'],
  ['PRODUCT', 'products'],
  ['TICKET', 'tickets'],
  ['AUTOMATION', 'automation rules'],
  ['USER', 'sample teammates'],
];

function SampleDataSection() {
  const [data, setData] = useState<SampleDataStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    sampleDataApi
      .status()
      .then(setData)
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err, 'Could not check sample data') }));
  }, []);

  async function load() {
    setBusy(true);
    setStatus(null);
    try {
      setData(await sampleDataApi.load());
      setStatus({ kind: 'ok', message: 'Sample data loaded. Open the Overview to explore it.' });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err, 'Could not load sample data') });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setStatus(null);
    try {
      setData(await sampleDataApi.remove());
      setConfirmOpen(false);
      setStatus({ kind: 'ok', message: 'Sample data removed. Your own records were not touched.' });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err, 'Could not remove sample data') });
    } finally {
      setBusy(false);
    }
  }

  const summary = data
    ? SAMPLE_LABELS.filter(([key]) => (data.counts[key] ?? 0) > 0)
        .map(([key, label]) => `${data.counts[key]} ${label}`)
        .join(', ')
    : '';

  return (
    <Panel
      title="Sample data"
      description="Fill the workspace with realistic demo records to explore Novora, then remove them in one click."
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm">
          {data === null ? (
            <p className="text-slate-500">Checking…</p>
          ) : data.loaded ? (
            <>
              <p className="font-medium text-slate-800 dark:text-slate-100">Sample data is loaded</p>
              <p className="mt-0.5 text-slate-500">{summary}</p>
            </>
          ) : (
            <p className="text-slate-500">
              Adds companies, contacts, deals across the last nine months, tasks, quotes and support tickets.
              Removing it only deletes these sample records.
            </p>
          )}
        </div>
        {data && (
          <div className="shrink-0">
            {data.loaded ? (
              <Button variant="secondary" disabled={busy} onClick={() => setConfirmOpen(true)}>
                Remove sample data
              </Button>
            ) : (
              <Button disabled={busy} onClick={() => void load()}>
                {busy ? 'Loading…' : 'Load sample data'}
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="mt-3">
        <StatusLine status={status} />
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (!busy) setConfirmOpen(false);
        }}
        title="Remove sample data?"
        description="This deletes the sample companies, contacts, deals, tasks, quotes, products, tickets and teammates. Records you created yourself stay as they are."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={busy} onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy} onClick={() => void remove()}>
            {busy ? 'Removing…' : 'Remove sample data'}
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}

function EmailSection() {
  const [data, setData] = useState<{ enabled: boolean; from: string | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  useEffect(() => {
    authApi
      .emailStatus()
      .then(setData)
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err, 'Could not check email setup') }));
  }, []);

  async function sendTest() {
    setBusy(true);
    setStatus(null);
    try {
      const { sentTo } = await authApi.sendTestEmail();
      setStatus({ kind: 'ok', message: `Test email sent to ${sentTo}. Check your inbox.` });
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err, 'Could not send the test email') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel title="Email" description="Used for password resets, teammate invites and sending quotes.">
      {data === null ? (
        <p className="text-sm text-slate-500">Checking…</p>
      ) : data.enabled ? (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm">
            <p className="font-medium text-slate-800 dark:text-slate-100">Email is set up</p>
            <p className="mt-0.5 text-slate-500">Sending from {data.from}</p>
          </div>
          <Button variant="secondary" disabled={busy} onClick={() => void sendTest()}>
            {busy ? 'Sending…' : 'Send test email'}
          </Button>
        </div>
      ) : (
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-800 dark:text-slate-100">Email isn't set up yet</p>
          <p>
            Until it is, invite links are shown on the Team page for you to share, password reset links only appear
            in the API log, and quotes can't be emailed.
          </p>
          <ol className="list-decimal space-y-1 pl-5">
            <li>
              In your Google Account, turn on 2-Step Verification, then create an App password (Security → App
              passwords).
            </li>
            <li>
              Add <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">GMAIL_USERNAME</code> and{' '}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">GMAIL_APP_PASSWORD</code> to{' '}
              <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">backend/.env</code>.
            </li>
            <li>Restart the API, then come back here and send a test email.</li>
          </ol>
        </div>
      )}
      <div className="mt-3">
        <StatusLine status={status} />
      </div>
    </Panel>
  );
}

function splitCodes(raw: string) {
  return raw
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

function when(iso?: string | null) {
  return iso ? new Date(iso).toLocaleString() : 'Never';
}

const SYNC_TONE: Record<string, string> = {
  OK: 'text-brand-700 dark:text-brand-300',
  PARTIAL: 'text-amber-700 dark:text-amber-300',
  FAILED: 'text-red-600 dark:text-red-400',
};

function HrmsSection() {
  const [data, setData] = useState<HrmsStatus | null>(null);
  const [code, setCode] = useState('');
  const [sales, setSales] = useState('');
  const [support, setSupport] = useState('');
  const [busy, setBusy] = useState<'connect' | 'save' | 'sync' | 'disconnect' | null>(null);
  const [justConnected, setJustConnected] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>(null);

  function apply(next: HrmsStatus) {
    setData(next);
    setSales((next.salesDepartmentCodes ?? []).join(', '));
    setSupport((next.supportDepartmentCodes ?? []).join(', '));
  }

  useEffect(() => {
    hrmsApi
      .status()
      .then(apply)
      .catch((err) => setStatus({ kind: 'error', message: errorMessage(err, 'Could not check the HRMS connection') }));
  }, []);

  async function run(kind: NonNullable<typeof busy>, action: () => Promise<HrmsStatus>, ok: (s: HrmsStatus) => string) {
    setBusy(kind);
    setStatus(null);
    try {
      const next = await action();
      apply(next);
      setStatus({ kind: next.summary?.status === 'FAILED' ? 'error' : 'ok', message: ok(next) });
      return next;
    } catch (err) {
      setStatus({ kind: 'error', message: errorMessage(err, 'Something went wrong. Please try again.') });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function connect(e: FormEvent) {
    e.preventDefault();
    const next = await run('connect', () => hrmsApi.connect(code.trim()), (s) =>
      `Connected to ${s.hrmsOrganizationName ?? 'Novora HRMS'}.`,
    );
    if (next) {
      setCode('');
      setJustConnected(true);
    }
  }

  async function saveCodes(e: FormEvent) {
    e.preventDefault();
    await run(
      'save',
      () => hrmsApi.updateSettings({ salesDepartmentCodes: splitCodes(sales), supportDepartmentCodes: splitCodes(support) }),
      () => 'Department mapping saved. Click Sync now to apply it to everyone.',
    );
  }

  async function sync() {
    const next = await run('sync', hrmsApi.sync, (s) => s.summary?.message ?? 'Sync finished.');
    setNotes(next?.summary?.notes ?? []);
    if (next) setJustConnected(false);
  }

  async function disconnect() {
    const next = await run('disconnect', hrmsApi.disconnect, () =>
      'Disconnected. Existing CRM accounts were not changed.',
    );
    if (next) {
      setConfirmOpen(false);
      setJustConnected(false);
      setNotes([]);
    }
  }

  return (
    <Panel
      title="Novora HRMS"
      description="Give your sales and support staff CRM accounts automatically, and remove access when they leave."
    >
      {data === null ? (
        <p className="text-sm text-slate-500">Checking…</p>
      ) : !data.available ? (
        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="font-medium text-slate-800 dark:text-slate-100">The HRMS connection isn't turned on for this server</p>
          <p>
            Your Novora administrator needs to set{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">HRMS_SYNC_ENABLED</code>,{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">HRMS_BASE_URL</code> and{' '}
            <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">HRMS_INTEGRATION_SECRET</code> on the API,
            then restart it.
          </p>
        </div>
      ) : !data.connected ? (
        <form onSubmit={connect} noValidate className="space-y-4">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
            <li>
              In Novora HRMS, an HR admin opens <span className="font-medium">Settings → Integrations</span> and creates a
              connection code.
            </li>
            <li>Enter the code here within 15 minutes. Each code works once.</li>
          </ol>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="sm:w-56">
              <Field label="Connection code" htmlFor="hrms-code">
                <Field.Input
                  id="hrms-code"
                  placeholder="ABCD-EFGH"
                  autoComplete="off"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                />
              </Field>
            </div>
            <div className="sm:mb-4">
              <Button type="submit" disabled={busy !== null || code.trim().length < 8}>
                {busy === 'connect' ? 'Connecting…' : 'Connect'}
              </Button>
            </div>
          </div>
          <StatusLine status={status} />
        </form>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500">Connected to</p>
              <p className="font-medium text-slate-800 dark:text-slate-100">
                {data.hrmsOrganizationName ?? 'Novora HRMS'}
              </p>
              <p className="text-xs text-slate-500">since {when(data.connectedAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Teammates linked to HRMS</p>
              <p className="font-medium text-slate-800 dark:text-slate-100">{data.linkedUsers ?? 0}</p>
              <p className="text-xs text-slate-500">Last change received {when(data.lastEventAt)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Last full sync</p>
              <p className="font-medium text-slate-800 dark:text-slate-100">{when(data.lastSyncAt)}</p>
              {data.lastSyncMessage && (
                <p className={`text-xs ${SYNC_TONE[data.lastSyncStatus ?? ''] ?? 'text-slate-500'}`}>
                  {data.lastSyncMessage}
                </p>
              )}
            </div>
          </div>

          {justConnected && (
            <p className="rounded-xl border border-brand-200 bg-brand-50 p-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
              Check the department codes below, then click <span className="font-medium">Sync now</span> to import your
              team. Everyone who gets a new account receives an email invite.
            </p>
          )}

          <form onSubmit={saveCodes} noValidate className="grid gap-x-4 sm:grid-cols-2">
            <Field
              label="Sales department codes"
              htmlFor="hrms-sales"
              hint="Managers and above become Sales managers; everyone else becomes a Sales rep"
            >
              <Field.Input id="hrms-sales" value={sales} onChange={(e) => setSales(e.target.value)} />
            </Field>
            <Field label="Support department codes" htmlFor="hrms-support" hint="Everyone here becomes a Support agent">
              <Field.Input id="hrms-support" value={support} onChange={(e) => setSupport(e.target.value)} />
            </Field>
            <p className="-mt-1 mb-4 text-xs text-slate-500 sm:col-span-2">
              Use the codes from Novora HRMS (Settings → Departments), separated by commas. People in other departments
              don't get a CRM account. Admins keep their role and are only deactivated when they leave the company.
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <Button type="submit" variant="secondary" disabled={busy !== null}>
                {busy === 'save' ? 'Saving…' : 'Save mapping'}
              </Button>
              <Button type="button" disabled={busy !== null || data.syncing} onClick={() => void sync()}>
                {busy === 'sync' || data.syncing ? 'Syncing…' : 'Sync now'}
              </Button>
              <Button type="button" variant="danger" disabled={busy !== null} onClick={() => setConfirmOpen(true)}>
                Disconnect
              </Button>
            </div>
          </form>

          {busy === 'sync' && (
            <p className="text-xs text-slate-500">This can take up to a minute if Novora HRMS is waking up.</p>
          )}
          <StatusLine status={status} />
          {notes.length > 0 && (
            <ul className="list-disc space-y-0.5 pl-5 text-xs text-slate-500">
              {notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal
        open={confirmOpen}
        onClose={() => {
          if (busy === null) setConfirmOpen(false);
        }}
        title="Disconnect Novora HRMS?"
        description="New hires and leavers in HRMS will stop updating the CRM. Existing accounts stay exactly as they are, and you can reconnect later with a new code."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={busy !== null} onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={busy !== null} onClick={() => void disconnect()}>
            {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}

export function SettingsPage() {
  const canManage = usePermission(Permission.MANAGE_USERS);
  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account and workspace" />
      <ProfileSection />
      <PasswordSection />
      <WorkspaceSection />
      {canManage && <EmailSection />}
      {canManage && <HrmsSection />}
      {canManage && <SampleDataSection />}
    </div>
  );
}
