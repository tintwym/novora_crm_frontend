import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Permission, createCompanySchema } from '@/shared';
import { companiesApi, type Account } from './companiesApi';
import { usePermission } from '../../hooks/usePermission';
import { ApiClientError } from '../../utils/api';
import { apiFieldErrors, validateForm, type FieldErrors } from '../../utils/formErrors';
import {
  Button,
  DataTable,
  ErrorAlert,
  ExportButton,
  Field,
  ImportCsvButton,
  PageHeader,
  Panel,
  SearchInput,
} from '../../components/ui';
import { IconCompanies } from '../../components/icons/Icons';
import { parseCsv, type CsvColumn } from '../../utils/csv';

function companiesFromCsv(text: string) {
  return parseCsv(text)
    .map((row) => ({
      name: row.name || row.company || row.account || '',
      industry: row.industry || '',
      size: row.size || '',
      email: row.email || '',
      phone: row.phone || '',
      website: row.website || '',
    }))
    .filter((r) => r.name);
}

const COMPANY_CSV: CsvColumn<Account>[] = [
  { header: 'Name', value: (a) => a.name },
  { header: 'Industry', value: (a) => a.industry },
  { header: 'Size', value: (a) => a.size },
  { header: 'Email', value: (a) => a.email },
  { header: 'Phone', value: (a) => a.phone },
  { header: 'Website', value: (a) => a.website },
  { header: 'Owner', value: (a) => a.owner?.name },
  { header: 'Contacts', value: (a) => a._count?.contacts ?? 0 },
  { header: 'Deals', value: (a) => a._count?.deals ?? 0 },
];

const LABELS: Record<string, string> = {
  name: 'Name',
  industry: 'Industry',
  size: 'Size',
  email: 'Email',
  phone: 'Phone',
  website: 'Website',
};

export function CompaniesPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showForm, setShowForm] = useState(false);
  const canImport = usePermission(Permission.IMPORT_COMPANIES);
  const [form, setForm] = useState({
    name: '',
    industry: '',
    size: '',
    email: '',
    phone: '',
    website: '',
  });

  async function load(q?: string) {
    setLoading(true);
    setError(null);
    try {
      setAccounts(await companiesApi.list(q));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load companies');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = validateForm(createCompanySchema, form);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    try {
      await companiesApi.create({
        name: parsed.data.name,
        industry: parsed.data.industry || null,
        size: parsed.data.size || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        website: parsed.data.website || null,
      });
      setShowForm(false);
      setForm({ name: '', industry: '', size: '', email: '', phone: '', website: '' });
      await load(search);
    } catch (err) {
      const fromApi = apiFieldErrors(err);
      if (Object.keys(fromApi).length) setFieldErrors(fromApi);
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  function toggleForm() {
    setShowForm((v) => !v);
    setFieldErrors({});
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const rows = companiesFromCsv(text);
      setNotice(null);
      if (!rows.length) {
        setError('CSV needs a header row and at least one company with a name');
        return;
      }
      const result = await companiesApi.import(rows);
      const plural = (n: number) => `${n} compan${n === 1 ? 'y' : 'ies'}`;
      const skippedNote = result.skipped.length
        ? ` Skipped ${plural(result.skipped.length)} that already exist.`
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        description="CRM accounts linked to your contacts and deals"
        actions={
          <>
            {canImport && <ImportCsvButton onFile={onImportFile} />}
            <ExportButton name="companies" rows={accounts} columns={COMPANY_CSV} />
            <Button onClick={toggleForm}>{showForm ? 'Cancel' : 'Add company'}</Button>
          </>
        }
      />

      {notice && (
        <p role="status" className="text-sm text-brand-700 dark:text-brand-300">
          {notice}
        </p>
      )}

      {showForm && (
        <Panel title="New company" description="Only the name is required.">
          <form onSubmit={onCreate} noValidate className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            {(['name', 'industry', 'size', 'email', 'phone', 'website'] as const).map((field) => (
              <Field
                key={field}
                label={LABELS[field]}
                htmlFor={`company-${field}`}
                error={fieldErrors[field]}
              >
                <Field.Input
                  id={`company-${field}`}
                  type={field === 'email' ? 'email' : field === 'website' ? 'url' : 'text'}
                  value={form[field]}
                  invalid={Boolean(fieldErrors[field])}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, [field]: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, [field]: '' }));
                  }}
                />
              </Field>
            ))}
            <div className="flex gap-2 pt-2 sm:col-span-2">
              <Button type="submit">Save company</Button>
              <Button variant="secondary" onClick={toggleForm}>
                Cancel
              </Button>
            </div>
          </form>
        </Panel>
      )}

      {error && <ErrorAlert message={error} />}

      <DataTable
        loading={loading}
        rows={accounts}
        rowKey={(a) => a.id}
        emptyIcon={IconCompanies}
        emptyTitle={search ? 'No matching companies' : 'No companies yet'}
        emptyMessage={
          search
            ? 'Try a different company name.'
            : 'Add the organisations you sell to, then link contacts and deals to them.'
        }
        emptyAction={
          !search && !showForm ? <Button onClick={toggleForm}>Add company</Button> : undefined
        }
        toolbar={
          <>
            <SearchInput
              value={search}
              onChange={setSearch}
              onSubmit={(q) => void load(q)}
              placeholder="Search companies…"
            />
            <span className="text-xs text-slate-400">
              {loading ? '' : `${accounts.length} compan${accounts.length === 1 ? 'y' : 'ies'}`}
            </span>
          </>
        }
        columns={[
          {
            key: 'name',
            header: 'Name',
            cell: (a) => (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <IconCompanies size={16} />
                </div>
                <div className="min-w-0">
                  <Link to={`/companies/${a.id}`} className="link-brand">
                    {a.name}
                  </Link>
                  {a.email && <p className="truncate text-xs text-slate-500">{a.email}</p>}
                </div>
              </div>
            ),
          },
          {
            key: 'industry',
            header: 'Industry',
            cell: (a) => (
              <span className="text-slate-600 dark:text-slate-300">{a.industry ?? '—'}</span>
            ),
          },
          {
            key: 'contacts',
            header: 'Contacts',
            cell: (a) => a._count?.contacts ?? 0,
          },
          {
            key: 'deals',
            header: 'Deals',
            cell: (a) => a._count?.deals ?? 0,
          },
        ]}
      />

      {canImport && (
        <p className="text-xs text-slate-500">
          CSV headers: <span className="font-mono">name, industry, size, email, phone, website</span>
        </p>
      )}
    </div>
  );
}
