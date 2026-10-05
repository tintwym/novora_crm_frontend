import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Button, Card, EmptyState, ErrorAlert, Field } from '../../components/ui';
import { IconHelp } from '../../components/icons/Icons';
import { TicketStatusBadge } from '../../components/badges/StatusBadge';
import { initials } from '../../utils/format';

const API_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

async function portalRequest<T>(path: string, data?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: data ? 'POST' : 'GET',
    headers: data ? { 'Content-Type': 'application/json' } : undefined,
    body: data ? JSON.stringify(data) : undefined,
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.message ?? 'Request failed');
  }
  return body.data as T;
}

export function CustomerPortalPage() {
  const { portalSlug = '' } = useParams<{ portalSlug: string }>();
  const [tab, setTab] = useState<'submit' | 'track' | 'kb'>('submit');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [kb, setKb] = useState<Array<{ id: string; title: string; body: string }>>([]);
  const [tracked, setTracked] = useState<{
    ticketNumber: string;
    title: string;
    status: string;
    messages: Array<{ id: string; body: string; authorName: string | null; createdAt: string }>;
  } | null>(null);

  const [submitForm, setSubmitForm] = useState({
    title: '',
    description: '',
    requesterName: '',
    requesterEmail: '',
  });
  const [trackForm, setTrackForm] = useState({ email: '', ticketNumber: '', reply: '' });

  useEffect(() => {
    if (tab !== 'kb') return;
    portalRequest<Array<{ id: string; title: string; body: string }>>(`/portal/${portalSlug}/kb`)
      .then(setKb)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load KB'));
  }, [tab, portalSlug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    try {
      const created = await portalRequest<{ ticketNumber: string }>(
        `/portal/${portalSlug}/tickets`,
        submitForm,
      );
      setSuccess(`Ticket ${created.ticketNumber} submitted. Save this number to track status.`);
      setSubmitForm({ title: '', description: '', requesterName: '', requesterEmail: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    }
  }

  async function onTrack(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const data = await portalRequest<NonNullable<typeof tracked>>(`/portal/${portalSlug}/track`, {
        email: trackForm.email,
        ticketNumber: trackForm.ticketNumber,
      });
      setTracked(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Track failed');
      setTracked(null);
    }
  }

  async function onReply(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await portalRequest(`/portal/${portalSlug}/reply`, {
        email: trackForm.email,
        ticketNumber: trackForm.ticketNumber,
        body: trackForm.reply,
      });
      setTrackForm((f) => ({ ...f, reply: '' }));
      const data = await portalRequest<NonNullable<typeof tracked>>(`/portal/${portalSlug}/track`, {
        email: trackForm.email,
        ticketNumber: trackForm.ticketNumber,
      });
      setTracked(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reply failed');
    }
  }

  const tabs = [
    ['submit', 'Submit ticket'],
    ['track', 'Track ticket'],
    ['kb', 'FAQ'],
  ] as const;

  const heading = {
    submit: { title: 'How can we help?', description: 'Tell us what’s going on and our team will get back to you by email.' },
    track: { title: 'Track your ticket', description: 'Enter the email and ticket number you received to see updates and reply.' },
    kb: { title: 'Frequently asked questions', description: 'Quick answers to common questions.' },
  }[tab];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white">
              N
            </span>
            <div className="leading-tight">
              <p className="font-display text-base font-semibold text-slate-900 dark:text-white">Novora</p>
              <p className="text-xs text-slate-500">Support · {portalSlug}</p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-sm font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            Agent login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
        <div className="text-center">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
            {heading.title}
          </h1>
          <p className="mx-auto mt-1.5 max-w-lg text-sm text-slate-500">{heading.description}</p>
        </div>

        <div className="flex justify-center">
          <div className="inline-flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  tab === key
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && <ErrorAlert message={error} />}
        {success && (
          <p
            role="status"
            className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200"
          >
            {success}
          </p>
        )}

        {tab === 'submit' && (
          <Card className="p-6">
            <form onSubmit={onSubmit} className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              <Field label="Your name" htmlFor="portal-name">
                <Field.Input
                  id="portal-name"
                  required
                  value={submitForm.requesterName}
                  onChange={(e) => setSubmitForm((f) => ({ ...f, requesterName: e.target.value }))}
                />
              </Field>
              <Field label="Email" htmlFor="portal-email">
                <Field.Input
                  id="portal-email"
                  required
                  type="email"
                  value={submitForm.requesterEmail}
                  onChange={(e) => setSubmitForm((f) => ({ ...f, requesterEmail: e.target.value }))}
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Subject" htmlFor="portal-subject">
                  <Field.Input
                    id="portal-subject"
                    required
                    value={submitForm.title}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, title: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Describe the issue" htmlFor="portal-description">
                  <Field.Textarea
                    id="portal-description"
                    required
                    rows={5}
                    value={submitForm.description}
                    onChange={(e) => setSubmitForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </Field>
              </div>
              <div className="pt-2 sm:col-span-2">
                <Button type="submit" className="w-full">
                  Submit ticket
                </Button>
              </div>
            </form>
          </Card>
        )}

        {tab === 'track' && (
          <div className="space-y-6">
            <Card className="p-6">
              <form onSubmit={onTrack} className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                <Field label="Email" htmlFor="portal-track-email" hint="The email used on the ticket">
                  <Field.Input
                    id="portal-track-email"
                    required
                    type="email"
                    value={trackForm.email}
                    onChange={(e) => setTrackForm((f) => ({ ...f, email: e.target.value }))}
                  />
                </Field>
                <Field label="Ticket number" htmlFor="portal-track-number" hint="e.g. T-00001">
                  <Field.Input
                    id="portal-track-number"
                    required
                    value={trackForm.ticketNumber}
                    onChange={(e) => setTrackForm((f) => ({ ...f, ticketNumber: e.target.value }))}
                  />
                </Field>
                <div className="pt-2 sm:col-span-2">
                  <Button type="submit" className="w-full">
                    Track ticket
                  </Button>
                </div>
              </form>
            </Card>

            {tracked && (
              <Card className="overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 dark:border-slate-800">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">{tracked.ticketNumber}</p>
                    <p className="truncate font-display text-base font-semibold text-slate-900 dark:text-white">
                      {tracked.title}
                    </p>
                  </div>
                  <TicketStatusBadge status={tracked.status} />
                </div>
                <div className="px-6 py-5">
                  {tracked.messages.length === 0 ? (
                    <p className="text-center text-sm text-slate-500">No messages yet.</p>
                  ) : (
                    <ul className="space-y-4">
                      {tracked.messages.map((m) => {
                        const name = m.authorName ?? 'Support';
                        return (
                          <li key={m.id} className="flex items-end gap-2.5">
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">
                              {initials(name)}
                            </span>
                            <div className="max-w-[85%]">
                              <div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
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
                  className="space-y-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-950/30"
                >
                  <label htmlFor="portal-reply" className="sr-only">
                    Add a reply
                  </label>
                  <textarea
                    id="portal-reply"
                    required
                    rows={3}
                    placeholder="Add a reply"
                    value={trackForm.reply}
                    onChange={(e) => setTrackForm((f) => ({ ...f, reply: e.target.value }))}
                    className="field-input"
                  />
                  <div className="flex justify-end">
                    <Button type="submit">Send reply</Button>
                  </div>
                </form>
              </Card>
            )}
          </div>
        )}

        {tab === 'kb' &&
          (kb.length === 0 ? (
            <Card>
              <EmptyState
                icon={IconHelp}
                title="No articles yet"
                message="There are no published articles right now. You can still submit a ticket and we’ll help you directly."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {kb.map((a) => (
                <Card key={a.id} className="p-5">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                      <IconHelp size={16} />
                    </span>
                    <div className="min-w-0">
                      <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                        {a.title}
                      </h2>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                        {a.body}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}
      </main>
    </div>
  );
}
