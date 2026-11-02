import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DEAL_STAGES, Permission, createDealSchema, type DealStage } from '@/shared';
import { LEAD_SOURCES, SOURCE_LABEL, STAGE_LABEL, sourceLabel } from '../../utils/labels';
import { dealsApi, type Deal, type PipelineResponse } from './dealsApi';
import { automationNotice } from '../automations/automationsApi';
import { contactsApi, type Contact } from '../contacts/contactsApi';
import { companiesApi, type Account } from '../companies/companiesApi';
import { usePermission } from '../../hooks/usePermission';
import { ApiClientError } from '../../utils/api';
import { apiFieldErrors, validateForm, type FieldErrors } from '../../utils/formErrors';
import {
  Button,
  Card,
  ErrorAlert,
  ExportButton,
  Field,
  ImportCsvButton,
  LoadingState,
  PageHeader,
  Panel,
} from '../../components/ui';
import { IconChart } from '../../components/icons/Icons';
import { initials, formatCurrency } from '../../utils/format';
import { csvDate, parseCsv, type CsvColumn } from '../../utils/csv';

function dealsFromCsv(text: string) {
  return parseCsv(text)
    .map((row) => ({
      title: row.title || row.name || row.deal || '',
      value: row.value || row.amount || '',
      stage: row.stage || '',
      probability: row['probability %'] || row.probability || '',
      accountName: row.company || row.account || row.accountname || '',
      contactName: row.contact || row.contactname || '',
      contactEmail: row.contactemail || row.email || '',
      source: row.source || '',
      closeDate: row['close date'] || row.closedate || row.close_date || '',
    }))
    .filter((r) => r.title);
}

const DEAL_CSV: CsvColumn<Deal>[] = [
  { header: 'Title', value: (d) => d.title },
  { header: 'Stage', value: (d) => STAGE_LABEL[d.stage] },
  { header: 'Value', value: (d) => Number(d.value) },
  { header: 'Probability %', value: (d) => d.probability },
  { header: 'Company', value: (d) => d.account?.name },
  { header: 'Contact', value: (d) => d.contact?.name },
  { header: 'Source', value: (d) => sourceLabel(d.source) },
  { header: 'Owner', value: (d) => d.owner?.name },
  { header: 'Close date', value: (d) => csvDate(d.closeDate) },
  { header: 'Created', value: (d) => csvDate(d.createdAt) },
];

const STAGE_DOT_COLORS: Record<string, string> = {
  LEAD: '#a7f3d0',
  QUALIFIED: '#6ee7b7',
  PROPOSAL: '#34d399',
  NEGOTIATION: '#10b981',
  WON: '#047857',
  LOST: '#94a3b8',
};

export function DealPipelinePage() {
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(true);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const canImport = usePermission(Permission.IMPORT_DEALS);
  const [form, setForm] = useState({
    title: '',
    value: '0',
    stage: 'LEAD' as DealStage,
    closeDate: '',
    contactId: '',
    accountId: '',
    source: '',
  });

  async function load() {
    setLoading(true);
    try {
      const [p, c, a] = await Promise.all([
        dealsApi.pipeline(),
        contactsApi.list(),
        companiesApi.list(),
      ]);
      setPipeline(p);
      setContacts(c);
      setAccounts(a);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load pipeline');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: '' }));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = validateForm(createDealSchema, form);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    try {
      const created = await dealsApi.create({
        title: parsed.data.title,
        value: Number(parsed.data.value) || 0,
        stage: parsed.data.stage,
        closeDate: parsed.data.closeDate || null,
        contactId: parsed.data.contactId || null,
        accountId: parsed.data.accountId || null,
        source: parsed.data.source || null,
      });
      setShowForm(false);
      setForm({
        title: '',
        value: '0',
        stage: 'LEAD',
        closeDate: '',
        contactId: '',
        accountId: '',
        source: '',
      });
      setNotice(automationNotice(created.automationTasks));
      await load();
    } catch (err) {
      const fromApi = apiFieldErrors(err);
      if (Object.keys(fromApi).length) setFieldErrors(fromApi);
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  async function moveDeal(id: string, stage: DealStage) {
    const current = pipeline?.columns.flatMap((c) => c.deals).find((d) => d.id === id);
    if (current?.stage === stage) return;
    try {
      const updated = await dealsApi.updateStage(id, stage);
      setError(null);
      setNotice(automationNotice(updated.automationTasks));
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Stage update failed');
    }
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const rows = dealsFromCsv(text);
      setNotice(null);
      if (!rows.length) {
        setError('CSV needs a header row and at least one deal with a title');
        return;
      }
      const result = await dealsApi.import(rows);
      const plural = (n: number) => `${n} deal${n === 1 ? '' : 's'}`;
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
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Import failed');
    }
  }

  async function onDrop(stage: DealStage) {
    if (!draggingId) return;
    const id = draggingId;
    setDraggingId(null);
    await moveDeal(id, stage);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Deal pipeline"
        description={`Open pipeline value: ${formatCurrency(pipeline?.totalOpenValue)}. Drag cards between stages to update them.`}
        actions={
          <>
            <Link to="/deals/forecast" className="btn-secondary">
              <IconChart size={16} />
              Forecast
            </Link>
            {canImport && <ImportCsvButton onFile={onImportFile} />}
            <ExportButton
              name="deals"
              rows={pipeline?.columns.flatMap((c) => c.deals) ?? []}
              columns={DEAL_CSV}
            />
            <Button
              variant={showForm ? 'secondary' : 'primary'}
              onClick={() => {
                setShowForm((v) => !v);
                setFieldErrors({});
              }}
            >
              {showForm ? 'Cancel' : 'New deal'}
            </Button>
          </>
        }
      />

      {showForm && (
        <Panel title="New deal" description="Add a deal to the pipeline.">
          <form onSubmit={onCreate} noValidate className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Title" htmlFor="deal-title" error={fieldErrors.title}>
                <Field.Input
                  id="deal-title"
                  value={form.title}
                  invalid={Boolean(fieldErrors.title)}
                  onChange={(e) => setField('title', e.target.value)}
                />
              </Field>
            </div>
            <Field label="Value" htmlFor="deal-value" error={fieldErrors.value}>
              <Field.Input
                id="deal-value"
                type="number"
                min={0}
                value={form.value}
                invalid={Boolean(fieldErrors.value)}
                onChange={(e) => setField('value', e.target.value)}
              />
            </Field>
            <Field label="Stage" htmlFor="deal-stage" error={fieldErrors.stage}>
              <Field.Select
                id="deal-stage"
                value={form.stage}
                invalid={Boolean(fieldErrors.stage)}
                onChange={(e) => setField('stage', e.target.value as DealStage)}
              >
                {DEAL_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <Field label="Close date" htmlFor="deal-close" error={fieldErrors.closeDate}>
              <Field.Input
                id="deal-close"
                type="date"
                value={form.closeDate}
                invalid={Boolean(fieldErrors.closeDate)}
                onChange={(e) => setField('closeDate', e.target.value)}
              />
            </Field>
            <Field label="Contact" htmlFor="deal-contact" error={fieldErrors.contactId}>
              <Field.Select
                id="deal-contact"
                value={form.contactId}
                invalid={Boolean(fieldErrors.contactId)}
                onChange={(e) => {
                  const contactId = e.target.value;
                  setField('contactId', contactId);
                  const contactSource = contacts.find((c) => c.id === contactId)?.source;
                  if (contactSource && !form.source) setField('source', contactSource);
                }}
              >
                <option value="">None</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <Field label="Company" htmlFor="deal-account" error={fieldErrors.accountId}>
              <Field.Select
                id="deal-account"
                value={form.accountId}
                invalid={Boolean(fieldErrors.accountId)}
                onChange={(e) => setField('accountId', e.target.value)}
              >
                <option value="">None</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <Field label="Source" htmlFor="deal-source" error={fieldErrors.source}>
              <Field.Select
                id="deal-source"
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
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Create deal</Button>
            </div>
          </form>
        </Panel>
      )}

      {error && <ErrorAlert message={error} />}
      {notice && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200"
        >
          <span>{notice}</span>
          <span className="flex shrink-0 gap-3">
            <Link to="/activities" className="font-medium underline-offset-2 hover:underline">
              View tasks
            </Link>
            <button
              type="button"
              className="text-brand-700/70 hover:text-brand-900 dark:text-brand-300/70"
              onClick={() => setNotice(null)}
              aria-label="Dismiss"
            >
              ✕
            </button>
          </span>
        </div>
      )}

      {loading && !pipeline ? (
        <Card>
          <LoadingState message="Loading pipeline…" />
        </Card>
      ) : (
        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-4">
          {(pipeline?.columns ?? DEAL_STAGES.map((stage) => ({ stage, deals: [] as Deal[], totalValue: 0 }))).map(
            (col) => (
              <div
                key={col.stage}
                className={`flex w-72 shrink-0 flex-col rounded-2xl bg-slate-100/70 p-3 transition dark:bg-slate-900/60 ${
                  draggingId ? 'outline-dashed outline-2 outline-brand-200 dark:outline-brand-900' : ''
                }`}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => void onDrop(col.stage)}
              >
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: STAGE_DOT_COLORS[col.stage] ?? '#10b981' }}
                      />
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {STAGE_LABEL[col.stage]}
                      </p>
                      <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300">
                        {col.deals.length}
                      </span>
                    </div>
                  </div>
                  <p className="mt-1 pl-[18px] text-xs font-medium tabular-nums text-slate-500 dark:text-slate-400">
                    {formatCurrency(col.totalValue)}
                  </p>
                </div>
                <div className="flex min-h-[120px] flex-1 flex-col gap-2.5">
                  {col.deals.length === 0 && (
                    <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700 dark:text-slate-500">
                      Drop deals here
                    </div>
                  )}
                  {col.deals.map((deal) => (
                    <div
                      key={deal.id}
                      draggable
                      onDragStart={() => setDraggingId(deal.id)}
                      onDragEnd={() => setDraggingId(null)}
                      className={`rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition hover:shadow-card dark:border-slate-800 dark:bg-slate-950 ${
                        draggingId === deal.id ? 'opacity-50' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/deals/${deal.id}`}
                          className="text-sm font-semibold text-slate-900 hover:text-brand-700 dark:text-white dark:hover:text-brand-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {deal.title}
                        </Link>
                        <span
                          className="cursor-grab select-none text-xs text-slate-300 active:cursor-grabbing dark:text-slate-600"
                          title="Drag to move"
                          aria-hidden
                        >
                          ⋮⋮
                        </span>
                      </div>
                      <p className="mt-1.5 font-display text-base font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                        {formatCurrency(deal.value)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">
                          {deal.contact?.name ?? deal.account?.name ?? 'No contact'}
                        </p>
                        {deal.owner && (
                          <span
                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300"
                            title={deal.owner.name}
                          >
                            {initials(deal.owner.name)}
                          </span>
                        )}
                      </div>
                      <label
                        className="mt-3 block text-[10px] font-semibold uppercase tracking-wide text-slate-400"
                        htmlFor={`stage-${deal.id}`}
                      >
                        Stage
                      </label>
                      <select
                        id={`stage-${deal.id}`}
                        value={deal.stage}
                        onChange={(e) => void moveDeal(deal.id, e.target.value as DealStage)}
                        className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/15 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {DEAL_STAGES.map((s) => (
                          <option key={s} value={s}>
                            {STAGE_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {canImport && (
        <p className="text-xs text-slate-500">
          CSV headers:{' '}
          <span className="font-mono">title, stage, value, company, contact, email, source, close date</span>
        </p>
      )}
    </div>
  );
}
