import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { companiesApi, type Account } from './companiesApi';
import { stageLabel } from '../../utils/labels';
import { ApiClientError } from '../../utils/api';
import { initials, formatCurrency } from '../../utils/format';
import { Card, EmptyState, ErrorAlert, LoadingState, PageHeader, Panel } from '../../components/ui';
import { IconContacts, IconDeals } from '../../components/icons/Icons';

export function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    companiesApi
      .get(id)
      .then(setAccount)
      .catch((err) => setError(err instanceof ApiClientError ? err.message : 'Failed to load'));
  }, [id]);

  const backLink = (
    <Link to="/companies" className="link-brand text-sm">
      ← Back to companies
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-4">
        {backLink}
        <ErrorAlert message={error} />
      </div>
    );
  }
  if (!account) {
    return (
      <div className="space-y-4">
        {backLink}
        <Card>
          <LoadingState message="Loading company…" />
        </Card>
      </div>
    );
  }

  const contacts = account.contacts ?? [];
  const deals = account.deals ?? [];
  const details: Array<[string, string | null]> = [
    ['Industry', account.industry],
    ['Size', account.size],
    ['Email', account.email],
    ['Phone', account.phone],
    ['Website', account.website],
    ['Owner', account.owner?.name ?? null],
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {backLink}
        <PageHeader
          title={account.name}
          description={
            [account.industry, account.size].filter(Boolean).join(' · ') || 'No industry set'
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Contacts" description="People at this company">
            {contacts.length === 0 ? (
              <EmptyState icon={IconContacts} message="No contacts linked to this company yet." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {contacts.map((c) => (
                  <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {initials(c.name)}
                    </div>
                    <div className="min-w-0">
                      <Link to={`/contacts/${c.id}`} className="link-brand text-sm">
                        {c.name}
                      </Link>
                      {c.email && <p className="truncate text-xs text-slate-500">{c.email}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Deals" description="Opportunities with this company">
            {deals.length === 0 ? (
              <EmptyState icon={IconDeals} message="No deals for this company yet." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {deals.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link to={`/deals/${d.id}`} className="link-brand text-sm">
                        {d.title}
                      </Link>
                      <p className="text-xs text-slate-500">{stageLabel(d.stage)}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {formatCurrency(d.value)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel title="Details" className="self-start">
          <dl className="space-y-4">
            {details.map(([label, value]) => (
              <div key={label}>
                <dt className="text-xs uppercase tracking-wide text-slate-400">{label}</dt>
                <dd className="mt-0.5 break-all text-sm text-slate-800 dark:text-slate-100">
                  {value || '—'}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
    </div>
  );
}
