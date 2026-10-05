import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Permission } from '@/shared';
import { usePermission } from '../../hooks/usePermission';
import { ApiClientError } from '../../utils/api';
import { formatCurrency, formatRole, initials } from '../../utils/format';
import { Button, Card, EmptyState, ErrorAlert, LoadingState, PageHeader, SearchInput } from '../../components/ui';
import { IconHistory } from '../../components/icons/Icons';
import { auditApi, type AuditEntityType, type AuditEntry, type AuditPage } from './auditApi';

const TYPE_LABEL: Record<AuditEntityType, string> = {
  CONTACT: 'contact',
  COMPANY: 'company',
  DEAL: 'deal',
  QUOTE: 'quote',
  TICKET: 'ticket',
  PRODUCT: 'product',
  USER: 'teammate',
  WORKSPACE: 'workspace settings',
  AUTOMATION: 'automation rule',
  ATTACHMENT: 'file',
  SAMPLE_DATA: 'sample data',
};

const TYPE_FILTERS: { value: AuditEntityType; label: string }[] = [
  { value: 'CONTACT', label: 'Contacts' },
  { value: 'COMPANY', label: 'Companies' },
  { value: 'DEAL', label: 'Deals' },
  { value: 'QUOTE', label: 'Quotes' },
  { value: 'TICKET', label: 'Tickets' },
  { value: 'PRODUCT', label: 'Products' },
  { value: 'AUTOMATION', label: 'Automations' },
  { value: 'ATTACHMENT', label: 'Files' },
  { value: 'USER', label: 'Team' },
  { value: 'WORKSPACE', label: 'Workspace' },
  { value: 'SAMPLE_DATA', label: 'Sample data' },
];

const ACTION_FILTERS = [
  { value: 'CREATE', label: 'Created' },
  { value: 'UPDATE', label: 'Changed' },
  { value: 'DELETE', label: 'Deleted' },
  { value: 'BULK_UPDATE', label: 'Bulk changes' },
  { value: 'BULK_DELETE', label: 'Bulk deletes' },
  { value: 'MERGE', label: 'Merges' },
  { value: 'IMPORT', label: 'Imports' },
  { value: 'EMAIL', label: 'Emails sent' },
  { value: 'INVITE', label: 'Invites' },
];

const VERB: Record<string, string> = {
  CREATE: 'created',
  UPDATE: 'changed',
  DELETE: 'deleted',
  ARCHIVE: 'archived',
  MERGE: 'merged duplicates into',
  IMPORT: 'imported',
  BULK_UPDATE: 'bulk-edited',
  BULK_DELETE: 'bulk-deleted',
  PASSWORD_CHANGE: 'changed the password of',
  LOAD: 'loaded',
  REMOVE: 'removed',
  EMAIL: 'emailed',
  INVITE: 'sent an invite to',
};

/** Actions the person did to their own account, phrased without repeating their name. */
const SELF_SENTENCE: Record<string, string> = {
  INVITE_ACCEPTED: 'accepted the invite and set a password',
  PASSWORD_RESET: 'reset their password with an email link',
};

const ACTION_TONE: Record<string, string> = {
  CREATE: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  DELETE: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  BULK_DELETE: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  REMOVE: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  EMAIL: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  INVITE: 'bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  INVITE_ACCEPTED: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
};

const BADGE_LABEL: Record<string, string> = {
  INVITE: 'Invite',
  INVITE_ACCEPTED: 'Joined',
};

const FIELD_LABEL: Record<string, string> = {
  name: 'Name',
  email: 'Email',
  phone: 'Phone',
  title: 'Title',
  source: 'Source',
  account: 'Company',
  owner: 'Owner',
  tags: 'Tags',
  value: 'Value',
  stage: 'Stage',
  probability: 'Probability',
  closeDate: 'Close date',
  contact: 'Contact',
  industry: 'Industry',
  size: 'Size',
  website: 'Website',
  status: 'Status',
  currency: 'Currency',
  taxRate: 'Tax rate',
  total: 'Total',
  notes: 'Notes',
  terms: 'Terms',
  validUntil: 'Valid until',
  lineItems: 'Line items',
  description: 'Description',
  priority: 'Priority',
  assignee: 'Assignee',
  sku: 'SKU',
  unitPrice: 'Unit price',
  isActive: 'Active',
  role: 'Role',
  password: 'Password',
  triggerStage: 'Trigger stage',
  taskType: 'Task type',
  taskSubject: 'Task title',
  taskNote: 'Task note',
  dueInDays: 'Due in (days)',
  assignTo: 'Assign to',
};

const MONEY_FIELDS = new Set(['value', 'total', 'unitPrice']);
const DATE_FIELDS = new Set(['closeDate', 'validUntil']);

function titleCase(v: string) {
  return v
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function formatValue(field: string, v: unknown): string {
  if (v === null || v === undefined || v === '') return 'empty';
  if (Array.isArray(v)) return v.length ? v.join(', ') : 'none';
  if (typeof v === 'boolean') {
    if (field === 'isActive') return v ? 'Yes' : 'No';
    return v ? 'Yes' : 'No';
  }
  if (typeof v === 'number') {
    if (MONEY_FIELDS.has(field)) return formatCurrency(v);
    if (field === 'probability' || field === 'taxRate') return `${v}%`;
    return String(v);
  }
  const s = String(v);
  if (DATE_FIELDS.has(field) && /^\d{4}-\d{2}-\d{2}T/.test(s)) {
    return new Date(s).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  if (field === 'role') return formatRole(s);
  if (field === 'triggerStage' && s === 'ANY') return 'Any stage';
  if (/^[A-Z][A-Z_]+$/.test(s)) return titleCase(s);
  return s;
}

function recordLink(e: AuditEntry): string | null {
  if (!e.entityId || e.action === 'DELETE' || e.action === 'BULK_DELETE') return null;
  switch (e.entityType) {
    case 'CONTACT':
      return e.action === 'IMPORT' || e.action === 'BULK_UPDATE' ? null : `/contacts/${e.entityId}`;
    case 'COMPANY':
      return `/companies/${e.entityId}`;
    case 'DEAL':
      return `/deals/${e.entityId}`;
    case 'QUOTE':
      return `/quotes/${e.entityId}`;
    case 'TICKET':
      return `/tickets/${e.entityId}`;
    case 'AUTOMATION':
      return '/automations';
    case 'PRODUCT':
      return '/products';
    case 'USER':
      return '/users';
    case 'WORKSPACE':
      return '/settings';
    case 'ATTACHMENT': {
      const dealId = e.details?.dealId;
      return typeof dealId === 'string' ? `/deals/${dealId}` : null;
    }
    default:
      return null;
  }
}

function dayLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

function detailLines(e: AuditEntry): string[] {
  const d = e.details;
  if (!d) return [];
  if (d.changes) {
    return Object.entries(d.changes).map(([field, c]) =>
      field === 'password'
        ? 'Password reset'
        : `${FIELD_LABEL[field] ?? field}: ${formatValue(field, c.from)} → ${formatValue(field, c.to)}`,
    );
  }
  const lines: string[] = [];
  if (typeof d.change === 'string') lines.push(d.change);
  if (Array.isArray(d.contacts) && d.contacts.length) {
    const count = typeof d.count === 'number' ? d.count : d.contacts.length;
    const more = count > d.contacts.length ? ` and ${count - d.contacts.length} more` : '';
    lines.push(`${d.contacts.join(', ')}${more}`);
  }
  if (Array.isArray(d.mergedContacts)) {
    lines.push(`Merged: ${d.mergedContacts.join(', ')}`);
    if (typeof d.movedRecords === 'number') lines.push(`${d.movedRecords} linked records moved`);
  }
  if (e.action === 'IMPORT') {
    const parts = [`${d.imported ?? 0} imported`];
    if (d.skipped) parts.push(`${d.skipped} skipped as duplicates`);
    if (d.failed) parts.push(`${d.failed} failed`);
    lines.push(parts.join(', '));
  }
  if (e.entityType === 'USER' && e.action === 'CREATE' && typeof d.role === 'string') {
    lines.push(`${String(d.email ?? '')} · ${formatRole(d.role)}${d.invited ? ' · invite sent' : ''}`);
  }
  if (e.action === 'EMAIL' && typeof d.to === 'string') lines.push(`To: ${d.to}`);
  if (e.action === 'INVITE' && typeof d.email === 'string') lines.push(`To: ${d.email}`);
  if (e.entityType === 'ATTACHMENT' && typeof d.deal === 'string') lines.push(`On deal ${d.deal}`);
  if (e.entityType === 'SAMPLE_DATA' && typeof d.records === 'number') lines.push(`${d.records} records`);
  return lines;
}

function Sentence({ entry }: { entry: AuditEntry }) {
  if (SELF_SENTENCE[entry.action]) {
    return (
      <p className="text-sm text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">{entry.userName ?? entry.entityLabel ?? 'Someone'}</span>{' '}
        {SELF_SENTENCE[entry.action]}
      </p>
    );
  }
  const verb = VERB[entry.action] ?? entry.action.toLowerCase().replaceAll('_', ' ');
  const type = TYPE_LABEL[entry.entityType] ?? entry.entityType.toLowerCase();
  const link = recordLink(entry);
  const who = entry.userName ?? 'Someone';
  const label = entry.entityLabel;
  const showType = !['IMPORT', 'BULK_UPDATE', 'BULK_DELETE'].includes(entry.action) && entry.entityType !== 'SAMPLE_DATA'
    && entry.entityType !== 'WORKSPACE';
  const labelNode = label ? (
    link ? (
      <Link to={link} className="font-semibold text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-300">
        {label}
      </Link>
    ) : (
      <span className="font-semibold text-slate-900 dark:text-white">{label}</span>
    )
  ) : null;
  return (
    <p className="text-sm text-slate-600 dark:text-slate-300">
      <span className="font-semibold text-slate-900 dark:text-white">{who}</span> {verb}{' '}
      {entry.entityType === 'WORKSPACE' ? 'workspace settings' : showType ? `${type} ` : ''}
      {entry.entityType === 'WORKSPACE' ? null : labelNode}
    </p>
  );
}

export function AuditLogPage() {
  const canView = usePermission(Permission.VIEW_AUDIT_LOG);
  if (!canView) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit log" />
        <Card>
          <EmptyState icon={IconHistory} title="Admins only" message="Ask a workspace admin if you need to see the change history." />
        </Card>
      </div>
    );
  }
  return <AuditLog />;
}

function AuditLog() {
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [userId, setUserId] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [data, setData] = useState<AuditPage | null>(null);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (page: number) => {
      const id = ++requestId.current;
      if (page === 1) setLoading(true);
      else setLoadingMore(true);
      try {
        const res = await auditApi.list({ entityType, action, userId, q, page });
        if (id !== requestId.current) return;
        setData(res);
        setItems((prev) => (page === 1 ? res.items : [...prev, ...res.items]));
        setError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(err instanceof ApiClientError ? err.message : 'Failed to load the audit log');
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    },
    [entityType, action, userId, q],
  );

  useEffect(() => {
    void load(1);
  }, [load]);

  const filtered = Boolean(entityType || action || userId || q);
  const groups: { day: string; entries: AuditEntry[] }[] = [];
  for (const entry of items) {
    const day = dayLabel(entry.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" description="Who changed what in this workspace, and when" />

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            onSubmit={setQ}
            placeholder="Search by record or person…"
            className="min-w-[220px] flex-1"
          />
          <select
            aria-label="Record type"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            className="field-input w-auto"
          >
            <option value="">All records</option>
            {TYPE_FILTERS.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select aria-label="Action" value={action} onChange={(e) => setAction(e.target.value)} className="field-input w-auto">
            <option value="">All actions</option>
            {ACTION_FILTERS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
          <select aria-label="Person" value={userId} onChange={(e) => setUserId(e.target.value)} className="field-input w-auto">
            <option value="">Everyone</option>
            {(data?.people ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {filtered && (
            <Button
              variant="ghost"
              onClick={() => {
                setEntityType('');
                setAction('');
                setUserId('');
                setSearch('');
                setQ('');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      </Card>

      {error && <ErrorAlert message={error} />}

      {loading ? (
        <Card>
          <LoadingState />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={IconHistory}
            title={filtered ? 'No matching changes' : 'No changes recorded yet'}
            message={
              filtered
                ? 'Try a different filter or search.'
                : 'When people create, edit or delete records, each change shows up here.'
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.day}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{g.day}</h2>
              <Card className="divide-y divide-slate-100 dark:divide-slate-800">
                {g.entries.map((entry) => {
                  const lines = detailLines(entry);
                  return (
                    <div key={entry.id} className="flex gap-3 px-4 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                        {initials(entry.userName ?? '?')}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                          <Sentence entry={entry} />
                          <div className="flex shrink-0 items-center gap-2">
                            {ACTION_TONE[entry.action] && (
                              <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${ACTION_TONE[entry.action]}`}>
                                {BADGE_LABEL[entry.action] ?? (VERB[entry.action] ? titleCase(VERB[entry.action].split(' ')[0]) : entry.action)}
                              </span>
                            )}
                            <time
                              dateTime={entry.createdAt}
                              title={new Date(entry.createdAt).toLocaleString()}
                              className="text-xs tabular-nums text-slate-400"
                            >
                              {new Date(entry.createdAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                            </time>
                          </div>
                        </div>
                        {lines.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5">
                            {lines.map((line, i) => (
                              <li key={i} className="break-words text-xs text-slate-500 dark:text-slate-400">
                                {line}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  );
                })}
              </Card>
            </section>
          ))}
          {data?.hasMore && (
            <div className="flex justify-center">
              <Button variant="secondary" disabled={loadingMore} onClick={() => void load((data?.page ?? 1) + 1)}>
                {loadingMore ? 'Loading…' : 'Load older changes'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
