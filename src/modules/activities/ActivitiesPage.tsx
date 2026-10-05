import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ACTIVITY_TYPES, Permission, createActivitySchema, type ActivityType } from '@/shared';
import { usePermission } from '../../hooks/usePermission';
import { activitiesApi, type Activity } from './activitiesApi';
import { contactsApi, type Contact } from '../contacts/contactsApi';
import { dealsApi, type Deal } from '../deals/dealsApi';
import { ApiClientError } from '../../utils/api';
import { apiFieldErrors, validateForm, type FieldErrors } from '../../utils/formErrors';
import { Button, Card, EmptyState, ErrorAlert, Field, PageHeader, Panel } from '../../components/ui';
import { IconBell, IconTasks } from '../../components/icons/Icons';
import { AutomatedChip } from '../automations/AutomatedChip';

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
}

function toIsoDate(d: Date) {
  return d.toISOString();
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatType(type: string) {
  return type.charAt(0) + type.slice(1).toLowerCase();
}

function formatDue(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DueChip({ dueAt }: { dueAt: string }) {
  const due = new Date(dueAt);
  const now = new Date();
  const overdue = due.getTime() < now.getTime();
  const today = sameDay(due, now);
  const tone = overdue
    ? 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/40 dark:text-red-300 dark:ring-red-900'
    : today
      ? 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900'
      : 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${tone}`}>
      {overdue ? 'Overdue · ' : ''}
      {formatDue(dueAt)}
    </span>
  );
}

function TypePill({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-700 dark:bg-brand-950/60 dark:text-brand-300">
      {formatType(type)}
    </span>
  );
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function ActivitiesPage() {
  const canContacts = usePermission(Permission.VIEW_CONTACTS);
  const canDeals = usePermission(Permission.VIEW_DEALS);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<Activity[]>([]);
  const [reminders, setReminders] = useState<Activity[]>([]);
  const [tasks, setTasks] = useState<Activity[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'TASK' as ActivityType,
    subject: '',
    note: '',
    dueAt: '',
    contactId: '',
    dealId: '',
  });

  async function load() {
    try {
      const from = toIsoDate(startOfMonth(month));
      const to = toIsoDate(endOfMonth(month));
      const [cal, rem, openTasks, c, d] = await Promise.all([
        activitiesApi.calendar(from, to),
        activitiesApi.reminders(),
        activitiesApi.list({ completed: false }),
        canContacts ? contactsApi.list() : [],
        canDeals ? dealsApi.list() : [],
      ]);
      setEvents(cal);
      setReminders(rem);
      setTasks(openTasks);
      setContacts(c);
      setDeals(d);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load activities');
    }
  }

  useEffect(() => {
    void load();
  }, [month]);

  const days = useMemo(() => {
    const first = startOfMonth(month);
    const startPad = first.getDay();
    const daysInMonth = endOfMonth(month).getDate();
    const cells: Array<{ date: Date | null; items: Activity[] }> = [];

    for (let i = 0; i < startPad; i++) cells.push({ date: null, items: [] });
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(month.getFullYear(), month.getMonth(), day);
      const items = events.filter((e) => sameDay(new Date(e.eventAt ?? e.dueAt ?? e.date), date));
      cells.push({ date, items });
    }
    return cells;
  }, [month, events]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = validateForm(createActivitySchema, form);
    if (!parsed.ok) {
      setFieldErrors(parsed.fieldErrors);
      return;
    }
    setFieldErrors({});
    try {
      await activitiesApi.create({
        type: parsed.data.type,
        subject: parsed.data.subject || null,
        note: parsed.data.note || null,
        dueAt: parsed.data.dueAt ? new Date(parsed.data.dueAt).toISOString() : null,
        contactId: parsed.data.contactId || null,
        dealId: parsed.data.dealId || null,
      });
      setShowForm(false);
      setForm({
        type: 'TASK',
        subject: '',
        note: '',
        dueAt: '',
        contactId: '',
        dealId: '',
      });
      await load();
    } catch (err) {
      const fromApi = apiFieldErrors(err);
      if (Object.keys(fromApi).length) setFieldErrors(fromApi);
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  async function markDone(id: string) {
    try {
      await activitiesApi.complete(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not complete');
    }
  }

  const today = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activities"
        description="Tasks, calls and meetings — plan your month and stay on top of reminders."
        actions={
          <Button
            variant={showForm ? 'secondary' : 'primary'}
            onClick={() => {
              setShowForm((v) => !v);
              setFieldErrors({});
            }}
          >
            {showForm ? 'Cancel' : 'New activity'}
          </Button>
        }
      />

      {reminders.length > 0 && (
        <Card className="overflow-hidden border-amber-200/80 dark:border-amber-900/60">
          <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50/70 px-5 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
            <IconBell size={16} className="text-amber-600 dark:text-amber-400" />
            <h2 className="text-sm font-semibold text-amber-900 dark:text-amber-200">
              Reminders
            </h2>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/60 dark:text-amber-200">
              {reminders.length}
            </span>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {reminders.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${
                      r.status === 'overdue'
                        ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                        : 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                    }`}
                  >
                    {r.status}
                  </span>
                  <TypePill type={r.type} />
                  {r.automated && <AutomatedChip />}
                  {r.subject && (
                    <span className="truncate font-medium text-slate-800 dark:text-slate-100">
                      {r.subject}
                    </span>
                  )}
                  {r.dueAt && (
                    <span className="text-xs text-slate-500">due {formatDue(r.dueAt)}</span>
                  )}
                </div>
                <Button variant="secondary" className="px-3 py-1.5 text-xs" onClick={() => void markDone(r.id)}>
                  Mark done
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {showForm && (
        <Panel title="New activity" description="Log a task, call or meeting and link it to a contact or deal.">
          <form onSubmit={onCreate} noValidate className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
            <Field label="Type" htmlFor="activity-type" error={fieldErrors.type}>
              <Field.Select
                id="activity-type"
                value={form.type}
                invalid={Boolean(fieldErrors.type)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, type: e.target.value as ActivityType }));
                  setFieldErrors((prev) => ({ ...prev, type: '' }));
                }}
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <Field label="Due" htmlFor="activity-due" error={fieldErrors.dueAt}>
              <Field.Input
                id="activity-due"
                type="datetime-local"
                value={form.dueAt}
                invalid={Boolean(fieldErrors.dueAt)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, dueAt: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, dueAt: '' }));
                }}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Subject" htmlFor="activity-subject" error={fieldErrors.subject}>
                <Field.Input
                  id="activity-subject"
                  value={form.subject}
                  invalid={Boolean(fieldErrors.subject)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, subject: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, subject: '' }));
                  }}
                />
              </Field>
            </div>
            <Field label="Contact" htmlFor="activity-contact" error={fieldErrors.contactId}>
              <Field.Select
                id="activity-contact"
                value={form.contactId}
                invalid={Boolean(fieldErrors.contactId)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, contactId: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, contactId: '', dealId: '' }));
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
            <Field label="Deal" htmlFor="activity-deal" error={fieldErrors.dealId}>
              <Field.Select
                id="activity-deal"
                value={form.dealId}
                invalid={Boolean(fieldErrors.dealId)}
                onChange={(e) => {
                  setForm((f) => ({ ...f, dealId: e.target.value }));
                  setFieldErrors((prev) => ({ ...prev, contactId: '', dealId: '' }));
                }}
              >
                <option value="">None</option>
                {deals.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </Field.Select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Note" htmlFor="activity-note" error={fieldErrors.note}>
                <Field.Textarea
                  id="activity-note"
                  value={form.note}
                  rows={2}
                  invalid={Boolean(fieldErrors.note)}
                  onChange={(e) => {
                    setForm((f) => ({ ...f, note: e.target.value }));
                    setFieldErrors((prev) => ({ ...prev, note: '' }));
                  }}
                />
              </Field>
            </div>
            <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
              <Button
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setFieldErrors({});
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Save activity</Button>
            </div>
          </form>
        </Panel>
      )}

      {error && <ErrorAlert message={error} />}

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {month.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
            </h2>
            <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                aria-label="Previous month"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                onClick={() =>
                  setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
                }
              >
                ‹ Prev
              </button>
              <button
                type="button"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                onClick={() => setMonth(startOfMonth(new Date()))}
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Next month"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-white hover:text-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-200"
                onClick={() =>
                  setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
                }
              >
                Next ›
              </button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1.5">
            {days.map((cell, idx) => {
              const isToday = cell.date ? sameDay(cell.date, today) : false;
              return (
                <div
                  key={idx}
                  className={`min-h-[92px] rounded-xl p-1.5 text-left ${
                    cell.date
                      ? isToday
                        ? 'bg-brand-50/60 ring-2 ring-brand-500 dark:bg-brand-950/30'
                        : 'border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40'
                      : ''
                  }`}
                >
                  {cell.date && (
                    <>
                      <p
                        className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                          isToday
                            ? 'bg-brand-600 text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`}
                      >
                        {cell.date.getDate()}
                      </p>
                      <ul className="mt-1 space-y-1">
                        {cell.items.slice(0, 3).map((item) => {
                          const href = item.deal
                            ? `/deals/${item.deal.id}`
                            : item.contact
                              ? `/contacts/${item.contact.id}`
                              : '/activities';
                          return (
                            <li key={item.id}>
                              <Link
                                to={href}
                                className="block truncate rounded-md bg-brand-100 px-1.5 py-0.5 text-[10px] font-medium text-brand-800 transition hover:bg-brand-200 dark:bg-brand-950 dark:text-brand-200 dark:hover:bg-brand-900"
                                title={item.subject ?? item.type}
                              >
                                {item.type}
                                {item.subject ? `: ${item.subject}` : ''}
                              </Link>
                            </li>
                          );
                        })}
                        {cell.items.length > 3 && (
                          <li className="px-1 text-[10px] font-medium text-slate-500">
                            +{cell.items.length - 3} more
                          </li>
                        )}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              Open tasks
            </h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {tasks.length}
            </span>
          </div>
          {tasks.length === 0 ? (
            <EmptyState
              icon={IconTasks}
              title="All caught up"
              message="No open activities. Create one to plan your next call or meeting."
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start gap-3 px-5 py-3.5">
                  <button
                    type="button"
                    onClick={() => void markDone(t.id)}
                    aria-label="Complete"
                    title="Complete"
                    className="group mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-slate-300 transition hover:border-brand-500 hover:bg-brand-50 dark:border-slate-600 dark:hover:bg-brand-950"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-3 w-3 text-brand-600 opacity-0 transition group-hover:opacity-100"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={3}
                      aria-hidden
                    >
                      <path d="M5 12l5 5L19 7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {t.subject || formatType(t.type)}
                    </p>
                    {(t.contact || t.deal) && (
                      <p className="mt-0.5 truncate text-xs text-slate-500">
                        {t.contact ? (
                          <Link to={`/contacts/${t.contact.id}`} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300">
                            {t.contact.name}
                          </Link>
                        ) : null}
                        {t.deal ? (
                          <>
                            {t.contact ? ' · ' : ''}
                            <Link to={`/deals/${t.deal.id}`} className="hover:text-brand-700 hover:underline dark:hover:text-brand-300">
                              {t.deal.title}
                            </Link>
                          </>
                        ) : null}
                      </p>
                    )}
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <TypePill type={t.type} />
                      {t.dueAt && <DueChip dueAt={t.dueAt} />}
                      {t.automated && <AutomatedChip />}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
