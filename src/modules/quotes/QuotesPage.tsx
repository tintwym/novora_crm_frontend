import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { quotesApi, type Quote, type QuoteLineItem } from './quotesApi';
import { dealsApi, type Deal } from '../deals/dealsApi';
import { productsApi, type Product } from '../products/productsApi';
import { QuoteStatusBadge } from '../../components/badges/StatusBadge';
import { ApiClientError } from '../../utils/api';
import { Button, DataTable, ErrorAlert, Field, PageHeader, Panel } from '../../components/ui';
import { IconQuotes } from '../../components/icons/Icons';

const emptyLine = (): QuoteLineItem => ({ productId: null, description: '', quantity: 1, unitPrice: 0 });

export function QuotesPage() {
  const [searchParams] = useSearchParams();
  const presetDealId = searchParams.get('dealId') ?? '';
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(Boolean(presetDealId));
  const [form, setForm] = useState({
    title: '',
    dealId: presetDealId,
    currency: 'MMK',
    taxRate: '5',
    validUntil: '',
    notes: '',
    terms: 'Payment due within 14 days. Prices in MMK unless noted.',
    lineItems: [emptyLine()],
  });

  async function load() {
    setLoading(true);
    try {
      const [q, d, p] = await Promise.all([
        quotesApi.list(),
        dealsApi.list(),
        productsApi.list().catch(() => [] as Product[]),
      ]);
      setQuotes(q);
      setDeals(d);
      setProducts(p);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load quotes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const preview = useMemo(() => {
    const subtotal = form.lineItems.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0,
    );
    const taxRate = Number(form.taxRate || 0);
    const taxAmount = (subtotal * taxRate) / 100;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
  }, [form.lineItems, form.taxRate]);

  const hasCatalog = products.length > 0;

  function pickProduct(index: number, productId: string) {
    const product = products.find((p) => p.id === productId);
    setForm((f) => {
      const lineItems = [...f.lineItems];
      lineItems[index] = product
        ? { ...lineItems[index], productId: product.id, description: product.name, unitPrice: product.unitPrice }
        : { ...lineItems[index], productId: null };
      return { ...f, lineItems };
    });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await quotesApi.create({
        title: form.title,
        dealId: form.dealId,
        currency: form.currency,
        taxRate: Number(form.taxRate) || 0,
        validUntil: form.validUntil || null,
        notes: form.notes || null,
        terms: form.terms || null,
        lineItems: form.lineItems.map((item) => ({
          productId: item.productId || null,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
        })),
      });
      setShowForm(false);
      setForm({
        title: '',
        dealId: '',
        currency: 'MMK',
        taxRate: '5',
        validUntil: '',
        notes: '',
        terms: 'Payment due within 14 days. Prices in MMK unless noted.',
        lineItems: [emptyLine()],
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotations"
        description="Create, send, and track quotes linked to deals"
        actions={
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((v) => !v)}>
            {showForm ? 'Cancel' : 'New quote'}
          </Button>
        }
      />

      {showForm && (
        <Panel title="New quote" description="Draft a quote for an existing deal.">
          <form onSubmit={onCreate} className="space-y-5">
            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              <Field label="Title" htmlFor="quote-title">
                <Field.Input
                  id="quote-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                />
              </Field>
              <Field label="Deal" htmlFor="quote-deal">
                <Field.Select
                  id="quote-deal"
                  required
                  value={form.dealId}
                  onChange={(e) => setForm((f) => ({ ...f, dealId: e.target.value }))}
                >
                  <option value="">Select deal</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.title}
                    </option>
                  ))}
                </Field.Select>
              </Field>
              <Field label="Currency" htmlFor="quote-currency">
                <Field.Select
                  id="quote-currency"
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                >
                  <option value="MMK">MMK</option>
                  <option value="USD">USD</option>
                  <option value="SGD">SGD</option>
                  <option value="THB">THB</option>
                </Field.Select>
              </Field>
              <Field label="Tax %" htmlFor="quote-tax">
                <Field.Input
                  id="quote-tax"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.taxRate}
                  onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                />
              </Field>
              <Field label="Valid until" htmlFor="quote-valid">
                <Field.Input
                  id="quote-valid"
                  type="date"
                  value={form.validUntil}
                  onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
                />
              </Field>
            </div>

            <div className="rounded-xl border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Line items</h3>
                <Button
                  variant="ghost"
                  className="px-2.5 py-1.5 text-xs"
                  onClick={() =>
                    setForm((f) => ({ ...f, lineItems: [...f.lineItems, emptyLine()] }))
                  }
                >
                  + Add line
                </Button>
              </div>
              <div className="space-y-3 p-4">
                {form.lineItems.map((item, index) => (
                  <div
                    key={index}
                    className="grid gap-2 rounded-lg border border-slate-100 p-3 sm:grid-cols-12 sm:items-center dark:border-slate-800"
                  >
                    {hasCatalog && (
                      <select
                        aria-label="Product"
                        value={item.productId ?? ''}
                        onChange={(e) => pickProduct(index, e.target.value)}
                        className="field-input sm:col-span-5"
                      >
                        <option value="">Custom item</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku ? `${p.name} (${p.sku})` : p.name}
                          </option>
                        ))}
                      </select>
                    )}
                    <input
                      required
                      placeholder="Description"
                      aria-label="Description"
                      value={item.description}
                      onChange={(e) =>
                        setForm((f) => {
                          const lineItems = [...f.lineItems];
                          lineItems[index] = { ...lineItems[index], description: e.target.value };
                          return { ...f, lineItems };
                        })
                      }
                      className={`field-input ${hasCatalog ? 'sm:col-span-7' : 'sm:col-span-12'}`}
                    />
                    <label className="flex items-center gap-2 sm:col-span-3">
                      <span className="w-10 shrink-0 text-xs text-slate-500 sm:w-auto">Qty</span>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        aria-label="Quantity"
                        value={item.quantity}
                        onChange={(e) =>
                          setForm((f) => {
                            const lineItems = [...f.lineItems];
                            lineItems[index] = { ...lineItems[index], quantity: Number(e.target.value) };
                            return { ...f, lineItems };
                          })
                        }
                        className="field-input min-w-0"
                      />
                    </label>
                    <label className="flex items-center gap-2 sm:col-span-4">
                      <span className="w-10 shrink-0 text-xs text-slate-500 sm:w-auto">Price</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label="Unit price"
                        value={item.unitPrice}
                        onChange={(e) =>
                          setForm((f) => {
                            const lineItems = [...f.lineItems];
                            lineItems[index] = { ...lineItems[index], unitPrice: Number(e.target.value) };
                            return { ...f, lineItems };
                          })
                        }
                        className="field-input min-w-0"
                      />
                    </label>
                    <p className="text-right text-sm font-medium tabular-nums text-slate-700 dark:text-slate-200 sm:col-span-3">
                      {(Number(item.quantity || 0) * Number(item.unitPrice || 0)).toLocaleString()}
                    </p>
                    <button
                      type="button"
                      disabled={form.lineItems.length === 1}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          lineItems: f.lineItems.filter((_, i) => i !== index),
                        }))
                      }
                      className="justify-self-end rounded-lg px-2 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:text-red-400 dark:hover:bg-red-950/40 sm:col-span-2"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <dl className="space-y-1 border-t border-slate-100 bg-slate-50/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-950/40">
                <div className="flex justify-end gap-6 text-slate-500 dark:text-slate-400">
                  <dt>Subtotal</dt>
                  <dd className="w-32 text-right tabular-nums">{preview.subtotal.toLocaleString()}</dd>
                </div>
                <div className="flex justify-end gap-6 text-slate-500 dark:text-slate-400">
                  <dt>Tax</dt>
                  <dd className="w-32 text-right tabular-nums">{preview.taxAmount.toLocaleString()}</dd>
                </div>
                <div className="flex justify-end gap-6 font-semibold text-slate-900 dark:text-white">
                  <dt>Total</dt>
                  <dd className="w-32 text-right tabular-nums">{preview.total.toLocaleString()}</dd>
                </div>
              </dl>
            </div>

            <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
              <Field label="Notes" htmlFor="quote-notes">
                <Field.Textarea
                  id="quote-notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Notes"
                  rows={2}
                />
              </Field>
              <Field label="Terms" htmlFor="quote-terms">
                <Field.Textarea
                  id="quote-terms"
                  value={form.terms}
                  onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
                  placeholder="Terms"
                  rows={2}
                />
              </Field>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Save draft quote</Button>
            </div>
          </form>
        </Panel>
      )}

      {error && <ErrorAlert message={error} />}

      <DataTable
        loading={loading}
        rows={quotes}
        rowKey={(q) => q.id}
        emptyIcon={IconQuotes}
        emptyTitle="No quotes yet"
        emptyMessage="Create a quote from a deal to send pricing to your customer."
        emptyAction={
          !showForm ? <Button onClick={() => setShowForm(true)}>New quote</Button> : undefined
        }
        toolbar={
          loading ? undefined : (
            <p className="text-sm text-slate-500">
              {quotes.length} {quotes.length === 1 ? 'quote' : 'quotes'}
            </p>
          )
        }
        columns={[
          {
            key: 'quote',
            header: 'Quote',
            cell: (q) => (
              <>
                <Link to={`/quotes/${q.id}`} className="link-brand">
                  {q.quoteNumber}
                </Link>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{q.title}</p>
              </>
            ),
          },
          {
            key: 'deal',
            header: 'Deal',
            cell: (q) =>
              q.deal ? (
                <Link
                  to={`/deals/${q.deal.id}`}
                  className="text-slate-700 hover:text-brand-700 hover:underline dark:text-slate-200 dark:hover:text-brand-300"
                >
                  {q.deal.title}
                </Link>
              ) : (
                '—'
              ),
          },
          { key: 'status', header: 'Status', cell: (q) => <QuoteStatusBadge status={q.status} /> },
          {
            key: 'total',
            header: 'Total',
            className: 'text-right tabular-nums',
            cell: (q) => (
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                {q.currency} {Number(q.total).toLocaleString()}
              </span>
            ),
          },
        ]}
      />
    </div>
  );
}
