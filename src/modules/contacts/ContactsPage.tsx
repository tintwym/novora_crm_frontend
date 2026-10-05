import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { createContactSchema, Permission } from '@/shared';
import { contactsApi, type Contact, type ContactTag, type DuplicateContact } from './contactsApi';
import { BulkBar } from './BulkBar';
import { usersApi } from '../users/usersApi';
import { usePermission } from '../../hooks/usePermission';
import { useAuthStore } from '../../store/authStore';
import { companiesApi, type Account } from '../companies/companiesApi';
import { ApiClientError } from '../../utils/api';
import { apiFieldErrors, validateForm, type FieldErrors } from '../../utils/formErrors';
import { initials } from '../../utils/format';
import {
  Button,
  DataTable,
  ErrorAlert,
  ExportButton,
  Field,
  PageHeader,
  Panel,
  SearchInput,
} from '../../components/ui';
import { IconContacts } from '../../components/icons/Icons';
import { csvDate, parseCsv, type CsvColumn } from '../../utils/csv';
import { LEAD_SOURCES, SOURCE_LABEL, sourceLabel } from '../../utils/labels';

const CONTACT_CSV: CsvColumn<Contact>[] = [
  { header: 'Name', value: (c) => c.name },
  { header: 'Email', value: (c) => c.email },
  { header: 'Phone', value: (c) => c.phone },
  { header: 'Title', value: (c) => c.title },
  { header: 'Company', value: (c) => c.account?.name },
  { header: 'Source', value: (c) => sourceLabel(c.source) },
  { header: 'Owner', value: (c) => c.owner?.name },
  { header: 'Tags', value: (c) => c.tags.map((t) => t.name).join('; ') },
  { header: 'Created', value: (c) => csvDate(c.createdAt) },
];

function contactsFromCsv(text: string) {
  return parseCsv(text)
    .map((row) => ({
      name: row.name || row.fullname || row['full name'] || '',
      email: row.email || '',
      phone: row.phone || '',
      title: row.title || '',
      accountName: row.account || row.company || row.accountname || '',
      source: row.source || '',
      tags: row.tags || '',
    }))
    .filter((r) => r.name);
}

export function ContactsPage() {
  const [searchParams] = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState(() => searchParams.get('q') ?? '');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const canManage = usePermission(Permission.MANAGE_CONTACTS);
  const canImport = usePermission(Permission.IMPORT_CONTACTS);
  const canListUsers = usePermission(Permission.VIEW_USERS);
  const me = useAuthStore((s) => s.user);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tags, setTags] = useState<ContactTag[]>([]);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [possibleDupes, setPossibleDupes] = useState<DuplicateContact[]>([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    accountId: '',
    source: '',
    tags: '',
    customKey: '',
    customValue: '',
  });

  async function load(q?: string) {
    setLoading(true);
    setError(null);
    try {
      const [c, a, t] = await Promise.all([
        contactsApi.list({ search: q }),
        companiesApi.list(),
        contactsApi.listTags().catch(() => [] as ContactTag[]),
      ]);
      setContacts(c);
      setAccounts(a);
      setTags(t);
      const ids = new Set(c.map((x) => x.id));
      setSelected((prev) => new Set([...prev].filter((id) => ids.has(id))));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    setSearch(q);
    void load(q || undefined);
  }, [searchParams]);

  useEffect(() => {
    if (!canManage) return;
    if (!canListUsers) {
      setOwners(me ? [{ id: me.id, name: `${me.name} (me)` }] : []);
      return;
    }
    usersApi
      .list()
      .then((users) => setOwners(users.map((u) => ({ id: u.id, name: u.name }))))
      .catch(() => setOwners(me ? [{ id: me.id, name: me.name }] : []));
  }, [canManage, canListUsers, me]);

  useEffect(() => {
    if (!showForm) {
      setPossibleDupes([]);
      return;
    }
    const email = form.email.trim();
    const phone = form.phone.trim();
    const name = form.name.trim();
    if (!email && phone.replace(/\D/g, '').length < 7 && name.length < 3) {
      setPossibleDupes([]);
      return;
    }
    const timer = setTimeout(() => {
      contactsApi
        .checkDuplicates({ email, phone, name })
        .then(setPossibleDupes)
        .catch(() => setPossibleDupes([]));
    }, 400);
    return () => clearTimeout(timer);
  }, [showForm, form.email, form.phone, form.name]);

  const allSelected = contacts.length > 0 && contacts.every((c) => selected.has(c.id));
  const selectedIds = useMemo(() => [...selected], [selected]);

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setField<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = validateForm(createContactSchema, form);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    try {
      const customFields =
        parsed.data.customKey && parsed.data.customValue
          ? { [parsed.data.customKey]: parsed.data.customValue }
          : undefined;
      await contactsApi.create({
        name: parsed.data.name,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        title: parsed.data.title || null,
        accountId: parsed.data.accountId || null,
        source: parsed.data.source || null,
        tags: (parsed.data.tags ?? '')
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        customFields,
      });
      setShowForm(false);
      setForm({
        name: '',
        email: '',
        phone: '',
        title: '',
        accountId: '',
        source: '',
        tags: '',
        customKey: '',
        customValue: '',
      });
      await load(search);
    } catch (err) {
      const fromApi = apiFieldErrors(err);
      if (Object.keys(fromApi).length) setFieldErrors(fromApi);
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const rows = contactsFromCsv(text);
      setNotice(null);
      if (!rows.length) {
        setError('CSV needs a header row and at least one contact with a name');
        return;
      }
      const result = await contactsApi.import(rows);
      const plural = (n: number) => `${n} contact${n === 1 ? '' : 's'}`;
      const skippedNote = result.skipped.length
        ? ` Skipped ${plural(result.skipped.length)} that already exist${result.skipped.length === 1 ? 's' : ''}.`
        : '';
      if (result.errors.length) {
        const details = result.errors
          .slice(0, 3)
          .map((e) => `row ${e.row}: ${e.message}`)
          .join('; ');
        setError(
          `Imported ${plural(result.imported)}.${skippedNote} ${result.errors.length} row(s) failed — ${details}${
            result.errors.length > 3 ? '…' : ''
          }`,
        );
      } else {
        setError(null);
        setNotice(`Imported ${plural(result.imported)}.${skippedNote}`);
      }
      await load(search);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Import failed');
    }
  }

  function toggleForm() {
    setShowForm((v) => !v);
    setFieldErrors({});
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contacts"
        description="People linked to companies, deals, and activities"
        actions={
          <>
            <Link to="/contacts/duplicates" className="btn-secondary">
              Find duplicates
            </Link>
            {canImport && (
            <label className="btn-secondary cursor-pointer">
              Import CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void onImportFile(file);
                  e.target.value = '';
                }}
              />
            </label>
            )}
            <ExportButton name="contacts" rows={contacts} columns={CONTACT_CSV} />
            {canManage && <Button onClick={toggleForm}>{showForm ? 'Cancel' : 'Add contact'}</Button>}
          </>
        }
      />

      {showForm && (
        <Panel title="New contact" description="Only the name is required.">
          <form onSubmit={onCreate} noValidate className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <Field label="Name" htmlFor="contact-name" error={fieldErrors.name}>
              <Field.Input
                id="contact-name"
                value={form.name}
                invalid={Boolean(fieldErrors.name)}
                onChange={(e) => setField('name', e.target.value)}
              />
            </Field>
            <Field label="Email" htmlFor="contact-email" error={fieldErrors.email}>
              <Field.Input
                id="contact-email"
                type="email"
                value={form.email}
                invalid={Boolean(fieldErrors.email)}
                onChange={(e) => setField('email', e.target.value)}
              />
            </Field>
            <Field label="Phone" htmlFor="contact-phone" error={fieldErrors.phone}>
              <Field.Input
                id="contact-phone"
                value={form.phone}
                invalid={Boolean(fieldErrors.phone)}
                onChange={(e) => setField('phone', e.target.value)}
              />
            </Field>
            <Field label="Title" htmlFor="contact-title" error={fieldErrors.title}>
              <Field.Input
                id="contact-title"
                value={form.title}
                invalid={Boolean(fieldErrors.title)}
                onChange={(e) => setField('title', e.target.value)}
              />
            </Field>
            <Field label="Company" htmlFor="contact-account" error={fieldErrors.accountId}>
              <Field.Select
                id="contact-account"
                value={form.accountId}
                invalid={Boolean(fieldErrors.accountId)}
                onChange={(e) => setField('accountId', e.target.value)}
              >
                <option value="">No company</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <Field label="Source" htmlFor="contact-source" error={fieldErrors.source}>
              <Field.Select
                id="contact-source"
                value={form.source}
                invalid={Boolean(fieldErrors.source)}
                onChange={(e) => setField('source', e.target.value)}
              >
                <option value="">Unknown</option>
                {LEAD_SOURCES.map((src) => (
                  <option key={src} value={src}>
                    {SOURCE_LABEL[src]}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <Field label="Tags (comma-separated)" htmlFor="contact-tags" error={fieldErrors.tags}>
              <Field.Input
                id="contact-tags"
                value={form.tags}
                invalid={Boolean(fieldErrors.tags)}
                onChange={(e) => setField('tags', e.target.value)}
              />
            </Field>
            <Field label="Custom field key" htmlFor="contact-ckey" error={fieldErrors.customKey}>
              <Field.Input
                id="contact-ckey"
                value={form.customKey}
                invalid={Boolean(fieldErrors.customKey)}
                onChange={(e) => setField('customKey', e.target.value)}
                placeholder="e.g. nrc"
              />
            </Field>
            <Field label="Custom field value" htmlFor="contact-cval" error={fieldErrors.customValue}>
              <Field.Input
                id="contact-cval"
                value={form.customValue}
                invalid={Boolean(fieldErrors.customValue)}
                onChange={(e) => setField('customValue', e.target.value)}
              />
            </Field>
            {possibleDupes.length > 0 && (
              <div
                role="status"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200 sm:col-span-2"
              >
                <p className="font-medium">This might already be in your contacts:</p>
                <ul className="mt-1 space-y-0.5">
                  {possibleDupes.map((d) => (
                    <li key={d.id}>
                      <Link to={`/contacts/${d.id}`} className="underline underline-offset-2">
                        {d.name}
                      </Link>
                      <span className="text-amber-700 dark:text-amber-300">
                        {' '}
                        — same {(d.matchedOn ?? []).join(' and ')}
                        {d.email ? ` · ${d.email}` : d.phone ? ` · ${d.phone}` : ''}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">You can still save if this is a different person.</p>
              </div>
            )}
            <div className="flex gap-2 pt-2 sm:col-span-2">
              <Button type="submit">Save contact</Button>
              <Button variant="secondary" onClick={toggleForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {error && <ErrorAlert message={error} />}
      {notice && (
        <div
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200"
        >
          {notice}
        </div>
      )}

      {canManage && selected.size > 0 && (
        <BulkBar
          selectedIds={selectedIds}
          owners={owners}
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          tags={tags}
          onClear={() => setSelected(new Set())}
          onError={(m) => {
            setNotice(null);
            setError(m);
          }}
          onDone={async (m) => {
            setError(null);
            setNotice(m);
            await load(search || undefined);
          }}
        />
      )}

      <DataTable
        loading={loading}
        rows={contacts}
        rowKey={(c) => c.id}
        emptyIcon={IconContacts}
        emptyTitle={search ? 'No matching contacts' : 'No contacts yet'}
        emptyMessage={
          search
            ? 'Try a different name, email or phone number.'
            : 'Add your first contact or import a CSV to get started.'
        }
        emptyAction={
          !search && !showForm ? <Button onClick={toggleForm}>Add contact</Button> : undefined
        }
        toolbar={
          <>
            {canManage && contacts.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-slate-500">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(contacts.map((c) => c.id)))}
                  aria-label="Select all contacts"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                />
                All
              </label>
            )}
            <SearchInput
              value={search}
              onChange={setSearch}
              onSubmit={(q) => void load(q || undefined)}
              placeholder="Search contacts…"
            />
            <span className="text-xs text-slate-400">
              {loading ? '' : `${contacts.length} contact${contacts.length === 1 ? '' : 's'}`}
            </span>
          </>
        }
        columns={[
          ...(canManage
            ? [
                {
                  key: 'select',
                  header: '',
                  className: 'w-10',
                  cell: (c: Contact) => (
                    <input
                      type="checkbox"
                      checked={selected.has(c.id)}
                      onChange={() => toggleOne(c.id)}
                      aria-label={`Select ${c.name}`}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                    />
                  ),
                },
              ]
            : []),
          {
            key: 'name',
            header: 'Name',
            cell: (c) => (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                  {initials(c.name)}
                </div>
                <div className="min-w-0">
                  <Link to={`/contacts/${c.id}`} className="link-brand">
                    {c.name}
                  </Link>
                  <p className="truncate text-xs text-slate-500">{c.email ?? c.phone ?? '—'}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'company',
            header: 'Company',
            cell: (c) => <span className="text-slate-600 dark:text-slate-300">{c.account?.name ?? '—'}</span>,
          },
          {
            key: 'source',
            header: 'Source',
            cell: (c) =>
              c.source ? (
                <span className="text-slate-600 dark:text-slate-300">{sourceLabel(c.source)}</span>
              ) : (
                <span className="text-slate-400">—</span>
              ),
          },
          {
            key: 'tags',
            header: 'Tags',
            cell: (c) =>
              c.tags.length ? (
                <div className="flex flex-wrap gap-1">
                  {c.tags.map((t) => (
                    <span
                      key={t.id}
                      className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
                      style={{ backgroundColor: t.color }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-400">—</span>
              ),
          },
          {
            key: 'owner',
            header: 'Owner',
            cell: (c) => <span className="text-slate-600 dark:text-slate-300">{c.owner?.name ?? '—'}</span>,
          },
        ]}
      />

      {canImport && (
        <p className="text-xs text-slate-500">
          CSV headers: <span className="font-mono">name, email, phone, title, company, source, tags</span>
        </p>
      )}
    </div>
  );
}
