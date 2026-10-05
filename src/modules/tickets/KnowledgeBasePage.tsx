import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ticketsApi } from './ticketsApi';
import { ApiClientError } from '../../utils/api';
import { Button, Card, EmptyState, ErrorAlert, Field, PageHeader, Panel } from '../../components/ui';
import { IconHelp } from '../../components/icons/Icons';

interface Article {
  id: string;
  title: string;
  slug: string;
  body: string;
  published: boolean;
}

export function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', body: '' });

  async function load() {
    try {
      setArticles(await ticketsApi.listKb());
      setError(null);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Failed to load articles');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    try {
      await ticketsApi.createKb(form);
      setForm({ title: '', body: '' });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Create failed');
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link to="/tickets" className="link-brand text-sm">
          ← Back to tickets
        </Link>
        <PageHeader
          title="Knowledge base"
          description="FAQ articles your customers can browse in the support portal."
          actions={
            <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((v) => !v)}>
              {showForm ? 'Cancel' : 'New article'}
            </Button>
          }
        />
      </div>

      {showForm && (
        <Panel title="New article" description="Published articles appear in the customer portal FAQ.">
          <form onSubmit={onCreate} className="space-y-1">
            <Field label="Title" htmlFor="kb-title">
              <Field.Input
                id="kb-title"
                required
                placeholder="e.g. How do I reset my password?"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </Field>
            <Field label="Body" htmlFor="kb-body">
              <Field.Textarea
                id="kb-body"
                required
                rows={6}
                placeholder="Article body"
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit">Publish</Button>
            </div>
          </form>
        </Panel>
      )}

      {error && <ErrorAlert message={error} />}

      {articles.length === 0 ? (
        <Card>
          <EmptyState
            icon={IconHelp}
            title="No articles yet"
            message="Write answers to common questions so customers can help themselves in the portal."
            action={
              !showForm ? <Button onClick={() => setShowForm(true)}>New article</Button> : undefined
            }
          />
        </Card>
      ) : (
        <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {articles.map((a) => (
            <Card key={a.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300">
                  <IconHelp size={18} />
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                    a.published
                      ? 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {a.published ? 'Published' : 'Draft'}
                </span>
              </div>
              <h2 className="mt-3 font-display text-base font-semibold text-slate-900 dark:text-white">
                {a.title}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600 dark:text-slate-300">
                {a.body}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
