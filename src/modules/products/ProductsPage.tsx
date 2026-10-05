import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Permission } from '@/shared';
import { productsApi, type Product } from './productsApi';
import { usePermission } from '../../hooks/usePermission';
import { ApiClientError } from '../../utils/api';
import { Button, DataTable, ErrorAlert, Field, Modal, PageHeader, SearchInput } from '../../components/ui';
import { IconProducts } from '../../components/icons/Icons';

type FormState = { name: string; sku: string; description: string; unitPrice: string };

const emptyForm: FormState = { name: '', sku: '', description: '', unitPrice: '' };

export function ProductsPage() {
  const canManage = usePermission(Permission.MANAGE_PRODUCTS);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Product | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setProducts(await productsApi.list({ includeArchived: showArchived, q: query || undefined }));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [showArchived, query]);

  useEffect(() => {
    void load();
  }, [load]);

  function openForm(product: Product | 'new') {
    setEditing(product);
    setFormError(null);
    setForm(
      product === 'new'
        ? emptyForm
        : {
            name: product.name,
            sku: product.sku ?? '',
            description: product.description ?? '',
            unitPrice: String(product.unitPrice),
          },
    );
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      description: form.description.trim() || null,
      unitPrice: Number(form.unitPrice || 0),
    };
    try {
      if (editing === 'new') {
        await productsApi.create(payload);
        setNotice(`Added ${payload.name}.`);
      } else {
        await productsApi.update(editing.id, payload);
        setNotice(`Saved ${payload.name}.`);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setFormError(err instanceof ApiClientError ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function setActive(product: Product, isActive: boolean) {
    try {
      await productsApi.update(product.id, { isActive });
      setNotice(isActive ? `${product.name} is available on quotes again.` : `Archived ${product.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Update failed');
    }
  }

  async function onDelete() {
    if (!deleting) return;
    setSaving(true);
    try {
      const res = await productsApi.remove(deleting.id);
      setNotice(
        res.archived
          ? `${deleting.name} is used on quotes, so it was archived instead of deleted.`
          : `Deleted ${deleting.name}.`,
      );
      setDeleting(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Delete failed');
      setDeleting(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Your catalog of products and services to add to quotes"
        actions={canManage ? <Button onClick={() => openForm('new')}>New product</Button> : undefined}
      />

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-200"
        >
          {notice}
        </div>
      )}
      {error && <ErrorAlert message={error} />}

      <DataTable
        loading={loading}
        rows={products}
        rowKey={(p) => p.id}
        emptyIcon={IconProducts}
        emptyTitle={query ? 'No matching products' : 'No products yet'}
        emptyMessage={
          query
            ? 'Try a different name or SKU.'
            : canManage
              ? 'Add the products and services you sell so the team can pick them when building quotes.'
              : 'Ask a manager to add products to the catalog.'
        }
        emptyAction={canManage && !query ? <Button onClick={() => openForm('new')}>New product</Button> : undefined}
        toolbar={
          <div className="flex flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              onSubmit={setQuery}
              placeholder="Search name or SKU…"
              label="Search products"
              className="w-full sm:w-64"
            />
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(e) => setShowArchived(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              Show archived
            </label>
            {!loading && (
              <p className="text-sm text-slate-500">
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </p>
            )}
          </div>
        }
        columns={[
          {
            key: 'name',
            header: 'Product',
            cell: (p) => (
              <>
                <p className="min-w-[10rem] font-medium text-slate-800 dark:text-slate-100">{p.name}</p>
                {p.description && (
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">{p.description}</p>
                )}
              </>
            ),
          },
          {
            key: 'sku',
            header: 'SKU',
            cell: (p) => <span className="whitespace-nowrap font-mono text-xs text-slate-600 dark:text-slate-300">{p.sku ?? '—'}</span>,
          },
          {
            key: 'price',
            header: 'Unit price',
            className: 'text-right tabular-nums',
            cell: (p) => Number(p.unitPrice).toLocaleString(),
          },
          {
            key: 'used',
            header: 'On quotes',
            className: 'text-right tabular-nums',
            cell: (p) => p.usedCount,
          },
          {
            key: 'status',
            header: 'Status',
            cell: (p) =>
              p.isActive ? (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                  Active
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Archived
                </span>
              ),
          },
          ...(canManage
            ? [
                {
                  key: 'actions',
                  header: '',
                  className: 'text-right whitespace-nowrap',
                  cell: (p: Product) => (
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => openForm(p)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs"
                        onClick={() => void setActive(p, !p.isActive)}
                      >
                        {p.isActive ? 'Archive' : 'Restore'}
                      </Button>
                      <Button
                        variant="ghost"
                        className="px-2 py-1 text-xs text-red-600 dark:text-red-400"
                        onClick={() => setDeleting(p)}
                      >
                        Delete
                      </Button>
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />

      <Modal
        open={editing !== null}
        onClose={() => {
          if (!saving) setEditing(null);
        }}
        title={editing === 'new' ? 'New product' : 'Edit product'}
        description="Prices are copied onto a quote when the product is added, so changing a price here won't alter existing quotes."
      >
        <form onSubmit={onSave} className="space-y-1">
          <Field label="Name" htmlFor="product-name">
            <Field.Input
              id="product-name"
              required
              maxLength={200}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </Field>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Field label="SKU" htmlFor="product-sku" hint="Optional, must be unique">
              <Field.Input
                id="product-sku"
                value={form.sku}
                onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
              />
            </Field>
            <Field label="Unit price" htmlFor="product-price">
              <Field.Input
                id="product-price"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.unitPrice}
                onChange={(e) => setForm((f) => ({ ...f, unitPrice: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="product-description">
            <Field.Textarea
              id="product-description"
              rows={2}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </Field>
          {formError && <ErrorAlert message={formError} />}
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" disabled={saving} onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save product'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={deleting !== null}
        onClose={() => {
          if (!saving) setDeleting(null);
        }}
        title={`Delete ${deleting?.name ?? 'product'}?`}
        description={
          deleting && deleting.usedCount > 0
            ? `This product is on ${deleting.usedCount} ${deleting.usedCount === 1 ? 'quote' : 'quotes'}, so it will be archived instead. Existing quotes keep it; it just won't be offered on new ones.`
            : 'This removes the product from the catalog. It is not used on any quotes.'
        }
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" disabled={saving} onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button variant="danger" disabled={saving} onClick={() => void onDelete()}>
            {saving ? 'Working…' : deleting && deleting.usedCount > 0 ? 'Archive product' : 'Delete product'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
