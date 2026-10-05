import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dealsApi, type ForecastResponse } from './dealsApi';
import { stageLabel } from '../../utils/labels';
import { ApiClientError } from '../../utils/api';
import { initials, formatCurrency } from '../../utils/format';
import { Card, DataTable, EmptyState, ErrorAlert, LoadingState, PageHeader, Panel } from '../../components/ui';
import { IconChart, IconContact, IconDeals, IconDollar } from '../../components/icons/Icons';

const STAGE_BAR_COLORS: Record<string, string> = {
  LEAD: '#a7f3d0',
  QUALIFIED: '#6ee7b7',
  PROPOSAL: '#34d399',
  NEGOTIATION: '#10b981',
  WON: '#047857',
  LOST: '#94a3b8',
};

export function ForecastPage() {
  const [data, setData] = useState<ForecastResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    dealsApi
      .forecast()
      .then(setData)
      .catch((err) =>
        setError(
          err instanceof ApiClientError
            ? err.message
            : 'Failed to load forecast (requires manager role)',
        ),
      );
  }, []);

  const backLink = (
    <Link to="/deals" className="link-brand text-sm">
      ← Back to pipeline
    </Link>
  );

  if (error) {
    return (
      <div className="space-y-6">
        {backLink}
        <ErrorAlert message={error} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        {backLink}
        <Card>
          <LoadingState message="Loading forecast…" />
        </Card>
      </div>
    );
  }

  const kpiCards = [
    {
      label: 'Open deals',
      value: data.summary.dealCount.toLocaleString(),
      icon: IconDeals,
      iconWrap: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
    },
    {
      label: 'Pipeline value',
      value: formatCurrency(data.summary.pipelineValue),
      icon: IconDollar,
      iconWrap: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
    },
    {
      label: 'Weighted forecast',
      value: formatCurrency(data.summary.weightedForecast),
      icon: IconChart,
      iconWrap: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
    },
  ];

  const maxStageValue = Math.max(1, ...data.byStage.map((r) => r.pipelineValue));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {backLink}
        <PageHeader title="Sales forecast" description="Weighted by stage probability" />
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="p-5">
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconWrap}`}>
                <Icon size={20} />
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {card.value}
              </p>
            </Card>
          );
        })}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="By stage" description="Pipeline value per stage, with weighted amount">
          {data.byStage.length === 0 ? (
            <EmptyState icon={IconChart} message="No open deals to forecast yet." />
          ) : (
            <ul className="space-y-4">
              {data.byStage.map((row) => {
                const width = Math.max(row.pipelineValue > 0 ? 4 : 0, (row.pipelineValue / maxStageValue) * 100);
                const weightedWidth = row.pipelineValue
                  ? (row.weightedValue / row.pipelineValue) * width
                  : 0;
                return (
                  <li key={row.stage}>
                    <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                      <span className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                        <span
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: STAGE_BAR_COLORS[row.stage] ?? '#10b981' }}
                        />
                        {stageLabel(row.stage)}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {row.count}
                        </span>
                      </span>
                      <span className="text-right tabular-nums">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {formatCurrency(row.pipelineValue)}
                        </span>
                        <span className="ml-2 text-xs text-slate-400">
                          {formatCurrency(row.weightedValue)} weighted
                        </span>
                      </span>
                    </div>
                    <div className="relative h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full opacity-40"
                        style={{
                          width: `${width}%`,
                          backgroundColor: STAGE_BAR_COLORS[row.stage] ?? '#10b981',
                        }}
                      />
                      <div
                        className="absolute inset-y-0 left-0 rounded-full"
                        style={{
                          width: `${weightedWidth}%`,
                          backgroundColor: STAGE_BAR_COLORS[row.stage] ?? '#10b981',
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <DataTable
          toolbar={
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              By owner
            </h2>
          }
          rows={data.byOwner}
          rowKey={(row) => row.ownerId}
          emptyIcon={IconContact}
          emptyTitle="No owners yet"
          emptyMessage="Assign deals to team members to see their forecast."
          columns={[
            {
              key: 'owner',
              header: 'Owner',
              cell: (row) => (
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {initials(row.ownerName)}
                  </span>
                  <span className="font-medium text-slate-800 dark:text-slate-100">{row.ownerName}</span>
                </span>
              ),
            },
            { key: 'count', header: 'Deals', cell: (row) => row.count, className: 'tabular-nums' },
            {
              key: 'pipeline',
              header: 'Pipeline',
              cell: (row) => formatCurrency(row.pipelineValue),
              className: 'tabular-nums',
            },
            {
              key: 'weighted',
              header: 'Weighted',
              cell: (row) => (
                <span className="font-semibold text-brand-700 dark:text-brand-300">
                  {formatCurrency(row.weightedValue)}
                </span>
              ),
              className: 'tabular-nums',
            },
          ]}
        />
      </div>
    </div>
  );
}
