import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { QuoteStatus } from '@/shared';
import { quotesApi, type Quote } from './quotesApi';
import { QuoteStatusBadge } from '../../components/badges/StatusBadge';
import { ApiClientError } from '../../utils/api';
import { Button, Card, ErrorAlert, Field, LoadingState, Modal, PageHeader, Panel } from '../../components/ui';
import { IconQuotes } from '../../components/icons/Icons';

const nextActions: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ['SENT'],
  SENT: ['ACCEPTED', 'REJECTED', 'DRAFT'],
  ACCEPTED: [],
  REJECTED: ['DRAFT'],
};

export function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailForm, setEmailForm] = useState({ to: '', subject: '', message: '' });
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  async function load() {
    if (!id) return;
    try {
      setQuote(await quotesApi.get(id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load quote');
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function setStatus(status: QuoteStatus) {
    if (!id) return;
    setBusy(true);
    try {
      setQuote(await quotesApi.updateStatus(id, status));
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Status update failed');
    } finally {
      setBusy(false);
    }
  }

  function openEmail() {
    if (!quote) return;
    setEmailError(null);
    setEmailForm({
      to: quote.contact?.email ?? '',
      subject: `Quote ${quote.quoteNumber} – ${quote.title}`,
      message: `Hi${quote.contact?.name ? ` ${quote.contact.name.split(' ')[0]}` : ''},\n\nPlease find our quote attached. Let me know if you have any questions.`,
    });
    setEmailOpen(true);
  }

  async function sendEmail(e: FormEvent) {
    e.preventDefault();
    if (!id) return;
    const to = emailForm.to.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setSending(true);
    setEmailError(null);
    try {
      const updated = await quotesApi.email(id, {
        to,
        subject: emailForm.subject.trim() || undefined,
        message: emailForm.message.trim() || undefined,
      });
      setQuote(updated);
      setEmailOpen(false);
      setNotice(`Quote emailed to ${updated.emailedTo}.`);
    } catch (err) {
      setEmailError(err instanceof ApiClientError ? err.message : 'Could not send the quote');
    } finally {
      setSending(false);
    }
  }

  async function downloadPdf() {
    if (!id || !quote) return;
    setBusy(true);
    try {
      await quotesApi.downloadPdf(id, `${quote.quoteNumber}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'PDF download failed');
    } finally {
      setBusy(false);
    }
  }

  if (error && !quote) {
    return (
      <div className="space-y-6">
        <Link to="/quotes" className="link-brand text-sm">
          ← Back to quotations
        </Link>
        <ErrorAlert message={error} />
      </div>
    );
  }
  if (!quote) {
    return (
      <Card>
        <LoadingState message="Loading quote…" />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link to="/quotes" className="link-brand text-sm">
          ← Back to quotations
        </Link>
        <PageHeader
          title={quote.quoteNumber}
          description={quote.title}
          actions={
            <>
              <Button variant="secondary" disabled={busy} onClick={() => void downloadPdf()}>
                <IconQuotes size={16} />
                Download PDF
              </Button>
              {(quote.status === 'DRAFT' || quote.status === 'SENT') && (
                <Button variant={quote.status === 'DRAFT' ? 'primary' : 'secondary'} disabled={busy} onClick={openEmail}>
                  {quote.status === 'DRAFT' ? 'Email quote' : 'Email again'}
                </Button>
              )}
              {nextActions[quote.status].map((status) => (
                <Button
                  key={status}
                  variant={status === 'REJECTED' ? 'danger' : status === 'DRAFT' ? 'secondary' : 'primary'}
                  disabled={busy}
                  onClick={() => void setStatus(status)}
                >
                  Mark {status.toLowerCase()}
                </Button>
              ))}
            </>
          }
        />
      </div>

      {error && <ErrorAlert message={error} />}
      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950 dark:text-brand-200">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ✕
          </button>
        </div>
      )}

      <Modal
        open={emailOpen}
        title={`Email ${quote.quoteNumber}`}
        description={
          quote.status === 'DRAFT'
            ? 'The PDF is attached. Sending marks the quote as sent.'
            : 'The PDF is attached.'
        }
        onClose={() => !sending && setEmailOpen(false)}
      >
        <form onSubmit={sendEmail} noValidate className="flex flex-col gap-1">
          <Field label="To" htmlFor="quote-email-to">
            <Field.Input
              id="quote-email-to"
              type="email"
              value={emailForm.to}
              onChange={(e) => setEmailForm((f) => ({ ...f, to: e.target.value }))}
            />
          </Field>
          <Field label="Subject" htmlFor="quote-email-subject">
            <Field.Input
              id="quote-email-subject"
              maxLength={200}
              value={emailForm.subject}
              onChange={(e) => setEmailForm((f) => ({ ...f, subject: e.target.value }))}
            />
          </Field>
          <Field label="Message" htmlFor="quote-email-message">
            <Field.Textarea
              id="quote-email-message"
              rows={5}
              maxLength={5000}
              value={emailForm.message}
              onChange={(e) => setEmailForm((f) => ({ ...f, message: e.target.value }))}
            />
          </Field>
          {emailError && (
            <div className="mb-2">
              <ErrorAlert message={emailError} />
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" disabled={sending} onClick={() => setEmailOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={sending}>
              {sending ? 'Sending…' : 'Send quote'}
            </Button>
          </div>
        </form>
      </Modal>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="overflow-hidden">
            <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
              <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
                Line items
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="table-base">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Unit</th>
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lineItems.map((item, idx) => (
                    <tr key={item.id ?? idx}>
                      <td className="font-medium text-slate-800 dark:text-slate-100">{item.description}</td>
                      <td className="text-right tabular-nums">{item.quantity}</td>
                      <td className="text-right tabular-nums">{Number(item.unitPrice).toLocaleString()}</td>
                      <td className="text-right tabular-nums">{Number(item.amount ?? 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="space-y-1.5 border-t border-slate-100 bg-slate-50/70 px-5 py-4 text-sm dark:border-slate-800 dark:bg-slate-950/40">
              <div className="flex justify-end gap-8 text-slate-500 dark:text-slate-400">
                <dt>Subtotal</dt>
                <dd className="w-36 text-right tabular-nums">{Number(quote.subtotal).toLocaleString()}</dd>
              </div>
              <div className="flex justify-end gap-8 text-slate-500 dark:text-slate-400">
                <dt>Tax ({quote.taxRate}%)</dt>
                <dd className="w-36 text-right tabular-nums">{Number(quote.taxAmount).toLocaleString()}</dd>
              </div>
              <div className="flex items-baseline justify-end gap-8 pt-1 text-slate-900 dark:text-white">
                <dt className="font-semibold">Total</dt>
                <dd className="w-36 text-right font-display text-lg font-semibold tabular-nums">
                  {quote.currency} {Number(quote.total).toLocaleString()}
                </dd>
              </div>
            </dl>
          </Card>

          {(quote.notes || quote.terms) && (
            <div className="grid gap-6 sm:grid-cols-2">
              {quote.notes && (
                <Panel title="Notes">
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{quote.notes}</p>
                </Panel>
              )}
              {quote.terms && (
                <Panel title="Terms">
                  <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300">{quote.terms}</p>
                </Panel>
              )}
            </div>
          )}
        </div>

        <Panel title="Details">
          <dl className="space-y-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Status</dt>
              <dd className="mt-1">
                <QuoteStatusBadge status={quote.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Customer</dt>
              <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                {quote.account?.name ?? quote.contact?.name ?? '—'}
              </dd>
              {(quote.contact?.email ?? quote.account?.email) && (
                <dd className="text-sm text-slate-500 dark:text-slate-400">
                  {quote.contact?.email ?? quote.account?.email}
                </dd>
              )}
            </div>
            {quote.deal && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Deal</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  <Link to={`/deals/${quote.deal.id}`} className="link-brand">
                    {quote.deal.title}
                  </Link>
                </dd>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Currency</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">{quote.currency}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-400">Valid until</dt>
                <dd className="mt-1 text-sm text-slate-800 dark:text-slate-100">
                  {quote.validUntil ? new Date(quote.validUntil).toLocaleDateString() : '—'}
                </dd>
              </div>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  );
}
