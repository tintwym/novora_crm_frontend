import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { TICKET_PRIORITIES, TICKET_STATUSES, type TicketPriority, type TicketStatus } from '@/shared';
import { ticketsApi, type Ticket } from './ticketsApi';
import { TicketPriorityBadge, TicketStatusBadge } from '../../components/badges/StatusBadge';
import { ApiClientError } from '../../utils/api';
import { useAuthStore } from '../../store/authStore';
import { initials } from '../../utils/format';
import { Button, Card, ErrorAlert, LoadingState, PageHeader, Panel } from '../../components/ui';

export function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);

  async function load() {
    if (!id) return;
    try {
      setTicket(await ticketsApi.get(id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load ticket');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function onStatus(status: TicketStatus) {
    if (!id) return;
    try {
      setTicket(await ticketsApi.update(id, { status }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  async function onPriority(priority: TicketPriority) {
    if (!id) return;
    try {
      setTicket(await ticketsApi.update(id, { priority }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  async function onAssignMe() {
    if (!id || !user) return;
    try {
      setTicket(await ticketsApi.update(id, { assigneeId: user.id }));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Assign failed');
    }
  }

  async function onReply(e: FormEvent) {
    e.preventDefault();
    if (!id || !reply.trim()) return;
    try {
      await ticketsApi.addMessage(id, reply.trim(), internal);
      setReply('');
      setInternal(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Reply failed');
    }
  }

  const backLink = (
    <Link to="/tickets" className="link-brand text-sm">
      ← Back to tickets
    </Link>
  );

  if (error && !ticket) {
    return (
      <div className="space-y-4">
        {backLink}
        <ErrorAlert message={error} />
      </div>
    );
  }
  if (!ticket) {
    return (
      <div className="space-y-4">
        {backLink}
        <Card>
          <LoadingState message="Loading ticket…" />
        </Card>
      </div>
    );
  }

  const messages = ticket.messages ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {backLink}
        <PageHeader
          title={ticket.title}
          description={`Ticket ${ticket.ticketNumber}`}
          actions={<Button onClick={() => void onAssignMe()}>Assign to me</Button>}
        />
        <div className="flex flex-wrap items-center gap-2">
          <TicketStatusBadge status={ticket.status} />
          <TicketPriorityBadge priority={ticket.priority} />
          {ticket.slaBreached && (
            <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-inset ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900">
              SLA breached
            </span>
          )}
          {ticket.slaDueSoon && !ticket.slaBreached && (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900">
              SLA due soon
            </span>
          )}
        </div>
      </div>

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex flex-col overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Conversation
            </h2>
            <span className="text-xs text-slate-500">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          <div className="flex-1 space-y-4 px-5 py-5">
            {ticket.description && (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-950/40">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Original request
                </p>
                <p className="mt-1 whitespace-pre-wrap text-slate-700 dark:text-slate-200">
                  {ticket.description}
                </p>
              </div>
            )}

            {messages.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                No replies yet. Start the conversation below.
              </p>
            ) : (
              <ul className="space-y-4">
                {messages.map((m) => {
                  const fromAgent = Boolean(m.author) || m.isInternal;
                  const name = m.author?.name ?? m.authorName ?? 'Customer';
                  const bubble = m.isInternal
                    ? 'border border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900/70 dark:bg-amber-950/40 dark:text-amber-100'
                    : fromAgent
                      ? 'bg-brand-50 text-slate-800 dark:bg-brand-950/50 dark:text-slate-100'
                      : 'border border-slate-200 bg-white text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';
                  return (
                    <li
                      key={m.id}
                      className={`flex items-end gap-2.5 ${fromAgent ? 'flex-row-reverse' : ''}`}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                          fromAgent
                            ? 'bg-brand-500 text-white'
                            : 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200'
                        }`}
                      >
                        {initials(name)}
                      </span>
                      <div className={`max-w-[80%] ${fromAgent ? 'text-right' : ''}`}>
                        <div
                          className={`inline-block rounded-2xl px-4 py-2.5 text-left text-sm ${bubble} ${
                            fromAgent ? 'rounded-br-md' : 'rounded-bl-md'
                          }`}
                        >
                          {m.isInternal && (
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                              Internal note
                            </p>
                          )}
                          <p className="whitespace-pre-wrap">{m.body}</p>
                        </div>
                        <p className="mt-1 px-1 text-[11px] text-slate-400">
                          {name} · {new Date(m.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <form
            onSubmit={onReply}
            className={`space-y-3 border-t px-5 py-4 ${
              internal
                ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/60 dark:bg-amber-950/20'
                : 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-950/30'
            }`}
          >
            <label htmlFor="ticket-reply" className="sr-only">
              Reply
            </label>
            <textarea
              id="ticket-reply"
              required
              rows={3}
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder={internal ? 'Write an internal note…' : 'Write a reply to the customer…'}
              className="field-input"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={internal}
                  onChange={(e) => setInternal(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-600"
                />
                Internal note (hidden from customer)
              </label>
              <Button type="submit">{internal ? 'Add note' : 'Send reply'}</Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6">
          <Panel title="Manage">
            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ticket-status" className="text-xs uppercase tracking-wide text-slate-400">
                  Status
                </label>
                <select
                  id="ticket-status"
                  value={ticket.status}
                  onChange={(e) => void onStatus(e.target.value as TicketStatus)}
                  className="field-input"
                >
                  {TICKET_STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ticket-priority" className="text-xs uppercase tracking-wide text-slate-400">
                  Priority
                </label>
                <select
                  id="ticket-priority"
                  value={ticket.priority}
                  onChange={(e) => void onPriority(e.target.value as TicketPriority)}
                  className="field-input"
                >
                  {TICKET_PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Panel>

          <Panel title="Details">
            <dl className="space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Contact</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {ticket.contact ? (
                    <Link to={`/contacts/${ticket.contact.id}`} className="link-brand">
                      {ticket.contact.name}
                    </Link>
                  ) : (
                    ticket.requesterName ?? '—'
                  )}
                </dd>
                {(ticket.contact?.email ?? ticket.requesterEmail) && (
                  <dd className="text-xs text-slate-500">
                    {ticket.contact?.email ?? ticket.requesterEmail}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Assignee</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {ticket.assignee?.name ?? <span className="text-slate-400">Unassigned</span>}
                </dd>
              </div>
              {ticket.createdAt && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Created</dt>
                  <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                    {new Date(ticket.createdAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>

          <Panel title="SLA">
            <dl className="space-y-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Due</dt>
                <dd
                  className={`mt-1 text-sm ${
                    ticket.slaBreached
                      ? 'font-semibold text-red-600 dark:text-red-400'
                      : ticket.slaDueSoon
                        ? 'font-semibold text-amber-600 dark:text-amber-400'
                        : 'text-slate-800 dark:text-slate-100'
                  }`}
                >
                  {ticket.slaDueAt ? new Date(ticket.slaDueAt).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">First response</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {ticket.firstRespondedAt ? new Date(ticket.firstRespondedAt).toLocaleString() : '—'}
                </dd>
              </div>
              {ticket.resolvedAt && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Resolved</dt>
                  <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                    {new Date(ticket.resolvedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              {ticket.closedAt && (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-400">Closed</dt>
                  <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                    {new Date(ticket.closedAt).toLocaleString()}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>
        </div>
      </div>
    </div>
  );
}
