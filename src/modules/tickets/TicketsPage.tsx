import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TICKET_PRIORITIES, createTicketSchema, type TicketPriority } from '@/shared';
import { ticketsApi, type Ticket } from './ticketsApi';
import { contactsApi, type Contact } from '../contacts/contactsApi';
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/badges/StatusBadge';
import { ApiClientError } from '../../utils/api';
import { apiFieldErrors, validateForm, type FieldErrors } from '../../utils/formErrors';
import { Button, Card, DataTable, ErrorAlert, ExportButton, Field, PageHeader, Panel } from '../../components/ui';
import { IconHelp, IconTickets } from '../../components/icons/Icons';
import { csvDate, type CsvColumn } from '../../utils/csv';

function humanize(value: string) {
  const text = value.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

const TICKET_CSV: CsvColumn<Ticket>[] = [
  { header: 'Number', value: (t) => t.ticketNumber },
  { header: 'Title', value: (t) => t.title },
  { header: 'Status', value: (t) => humanize(t.status) },
  { header: 'Priority', value: (t) => humanize(t.priority) },
  { header: 'Requester', value: (t) => t.contact?.name ?? t.requesterName },
  { header: 'Requester email', value: (t) => t.contact?.email ?? t.requesterEmail },
  { header: 'Assignee', value: (t) => t.assignee?.name },
  { header: 'SLA due', value: (t) => csvDate(t.slaDueAt) },
  { header: 'SLA breached', value: (t) => (t.slaBreached ? 'Yes' : 'No') },
  { header: 'Created', value: (t) => csvDate(t.createdAt) },
  { header: 'Resolved', value: (t) => csvDate(t.resolvedAt) },
];

function SlaCell({ ticket }: { ticket: Ticket }) {
  if (ticket.slaBreached) {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
        Breached
      </span>
    );
  }
  if (ticket.slaDueSoon) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
        Due soon
      </span>
    );
  }
  if (ticket.slaDueAt) {
    return <span className="text-xs text-slate-500">{new Date(ticket.slaDueAt).toLocaleString()}</span>;
  }
  return <span className="text-slate-400">—</span>;
}

export function TicketsPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [alerts, setAlerts] = useState<Ticket[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [portalSlug, setPortalSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as TicketPriority,
    contactId: '',
  });

  async function load() {
    setLoading(true);
    try {
      const [t, a, c, portal] = await Promise.all([
        ticketsApi.list(),
        ticketsApi.slaAlerts(),
        contactsApi.list(),
        ticketsApi.portalInfo(),
      ]);
      setTickets(t);
      setAlerts(a);
      setContacts(c);
      setPortalSlug(portal.portalSlug);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load tickets');
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
    const parsed = validateForm(createTicketSchema, form);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    try {
      await ticketsApi.create({
        title: parsed.data.title,
        description: parsed.data.description,
        priority: parsed.data.priority,
        contactId: parsed.data.contactId || null,
      });
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'MEDIUM', contactId: '' });
      await load();
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tickets"
        description="Support queue with SLA tracking, a knowledge base and a public customer portal."
        actions={
          <>
            {portalSlug && (
              <Link to={`/portal/${portalSlug}`} className="btn-secondary">
                Customer portal
              </Link>
            )}
            <Link to="/tickets/kb" className="btn-secondary">
              <IconHelp size={16} />
              Knowledge base
            </Link>
            <ExportButton name="tickets" rows={tickets} columns={TICKET_CSV} />
            <Button variant={showForm ? 'secondary' : 'primary'} onClick={toggleForm}>
              {showForm ? 'Cancel' : 'New ticket'}
            </Button>
          </>
        }
      />

      {alerts.length > 0 && (
        <Card className="overflow-hidden border-red-200/80 dark:border-red-900/60">
          <div className="flex items-center gap-2 border-b border-red-100 bg-red-50/70 px-5 py-3 dark:border-red-900/50 dark:bg-red-950/30">
            <span className="h-2 w-2 rounded-full bg-red-500" />
            <h2 className="text-sm font-semibold text-red-800 dark:text-red-200">SLA alerts</h2>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-700 dark:bg-red-900/60 dark:text-red-200">
              {alerts.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {alerts.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                <div className="flex min-w-0 items-center gap-3">
                  <Link to={`/tickets/${t.id}`} className="link-brand shrink-0">
                    {t.ticketNumber}
                  </Link>
                  <span className="truncate text-slate-700 dark:text-slate-200">{t.title}</span>
                </div>
                <SlaCell ticket={{ ...t, slaDueSoon: !t.slaBreached }} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showForm && (
        <Panel title="New ticket" description="Open a support ticket on behalf of a customer.">
          <form onSubmit={onCreate} noValidate className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Title" htmlFor="ticket-title" error={fieldErrors.title}>
                <Field.Input
                  id="ticket-title"
                  value={form.title}
                  invalid={Boolean(fieldErrors.title)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, title: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, title: '' }));
                  }}
                />
              </Field>
            </div>
            <Field label="Priority" htmlFor="ticket-priority" error={fieldErrors.priority}>
              <Field.Select
                id="ticket-priority"
                value={form.priority}
                invalid={Boolean(fieldErrors.priority)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, priority: e.target.value as TicketPriority }));
                  setFieldErrors((prev) => ({ ...prev, priority: '' }));
                }}
              >
                {TICKET_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <Field label="Contact" htmlFor="ticket-contact" error={fieldErrors.contactId}>
              <Field.Select
                id="ticket-contact"
                value={form.contactId}
                invalid={Boolean(fieldErrors.contactId)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, contactId: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, contactId: '' }));
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
            <div className="sm:col-span-2">
              <Field label="Description" htmlFor="ticket-desc" error={fieldErrors.description}>
                <Field.Textarea
                  id="ticket-desc"
                  rows={4}
                  value={form.description}
                  invalid={Boolean(fieldErrors.description)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, description: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, description: '' }));
                  }}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
              <Button variant="secondary" onClick={toggleForm}>
                Cancel
              </Button>
              <Button type="submit">Create ticket</Button>
            </div>
          </form>
        </Panel>
      )}

      {error && <ErrorAlert message={error} />}

      <DataTable
        rows={tickets}
        rowKey={(t) => t.id}
        loading={loading}
        emptyIcon={IconTickets}
        emptyTitle="No tickets yet"
        emptyMessage="When customers reach out or you open a ticket, it will show up here with its SLA status."
        emptyAction={
          !showForm ? <Button onClick={toggleForm}>New ticket</Button> : undefined
        }
        toolbar={
          <p className="text-sm text-slate-500">
            <span className="font-semibold text-slate-900 dark:text-white">{tickets.length}</span>{' '}
            {tickets.length === 1 ? 'ticket' : 'tickets'}
          </p>
        }
        columns={[
          {
            key: 'ticket',
            header: 'Ticket',
            cell: (t) => (
              <div className="min-w-0">
                <Link to={`/tickets/${t.id}`} className="link-brand">
                  {t.ticketNumber}
                </Link>
                <p className="mt-0.5 max-w-xs truncate text-xs text-slate-500">{t.title}</p>
              </div>
            ),
          },
          { key: 'priority', header: 'Priority', cell: (t) => <TicketPriorityBadge priority={t.priority} /> },
          { key: 'status', header: 'Status', cell: (t) => <TicketStatusBadge status={t.status} /> },
          { key: 'sla', header: 'SLA', cell: (t) => <SlaCell ticket={t} /> },
          {
            key: 'contact',
            header: 'Contact',
            cell: (t) => t.contact?.name ?? t.requesterName ?? <span className="text-slate-400">—</span>,
          },
        ]}
      />
    </div>
  );
}
