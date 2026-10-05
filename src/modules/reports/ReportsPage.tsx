import { useEffect, useMemo, useState, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi, type SalesReport } from './reportsApi';
import { ApiClientError } from '../../utils/api';
import { formatCurrency, initials } from '../../utils/format';
import { sourceLabel, stageLabel } from '../../utils/labels';
import { Card, DataTable, EmptyState, ErrorAlert, LoadingState, PageHeader, Panel } from '../../components/ui';
import { IconCalendar, IconChart, IconCompanies, IconContact, IconDeals, IconDollar } from '../../components/icons/Icons';
import { DateRangePicker } from '../dashboard/DateRangePicker';
import { PRESET_LABEL, rangeLabel, resolveRange, toInputDate, type RangeSelection } from '../dashboard/dateRange';

const RANGE_STORAGE_KEY = 'novora.reports.range';

const STAGE_COLORS: Record<string, string> = {
  LEAD: '#a7f3d0',
  QUALIFIED: '#6ee7b7',
  PROPOSAL: '#34d399',
  NEGOTIATION: '#10b981',
  WON: '#047857',
  LOST: '#94a3b8',
};

const STAGE_ORDER = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];

const ACTIVITY_COLORS: Record<string, string> = {
  CALL: '#10b981',
  MEETING: '#3b82f6',
  EMAIL: '#f97316',
  TASK: '#8b5cf6',
  NOTE: '#94a3b8',
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

function loadSelection(): RangeSelection {
  try {
    const raw = localStorage.getItem(RANGE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as RangeSelection;
      if (parsed && typeof parsed.preset === 'string' && parsed.preset in PRESET_LABEL) return parsed;
    }
  } catch {
    // ignore malformed storage
  }
  return { preset: 'this_year' };
}

function parseDay(value: string) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function bucketLabel(start: string, interval: SalesReport['range']['interval'], long = false) {
  const d = parseDay(start);
  if (interval === 'month') {
    return d.toLocaleDateString(undefined, { month: long ? 'long' : 'short', year: long ? 'numeric' : '2-digit' });
  }
  const day = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return interval === 'week' && long ? `Week of ${day}` : day;
}

function compactMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

function titleCase(value: string) {
  return value.charAt(0) + value.slice(1).toLowerCase();
}

function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  iconWrap,
}: {
  label: string;
  value: string;
  hint: ReactNode;
  icon: IconComponent;
  iconWrap: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconWrap}`}>
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-2 font-display text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{hint}</p>
    </Card>
  );
}

function TrendChart({ report }: { report: SalesReport }) {
  const [hover, setHover] = useState<number | null>(null);
  const { trend, range } = report;
  const hasRevenue = trend.some((t) => t.revenue > 0);
  const max = Math.max(1, ...trend.map((t) => t.revenue));
  const width = 720;
  const height = 220;
  const pad = { top: 12, bottom: 28, left: 44, right: 8 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const slot = plotW / Math.max(1, trend.length);
  const barW = Math.max(2, Math.min(36, slot * 0.6));
  const labelEvery = Math.max(1, Math.ceil(trend.length / 8));
  const active = hover !== null ? trend[hover] : null;

  return (
    <div>
      <div className="mb-3 min-h-[20px] text-sm text-slate-500">
        {active ? (
          <span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">
              {bucketLabel(active.start, range.interval, true)}
            </span>
            {' · '}
            {formatCurrency(active.revenue)} won · {active.won} won · {active.lost} lost · {active.created} new
          </span>
        ) : (
          <span>Hover a bar for details</span>
        )}
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" onMouseLeave={() => setHover(null)}>
        {(hasRevenue ? [0, 0.5, 1] : [0]).map((f) => {
          const y = pad.top + plotH * (1 - f);
          return (
            <g key={f}>
              <line x1={pad.left} x2={width - pad.right} y1={y} y2={y} className="stroke-slate-100 dark:stroke-slate-800" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="fill-slate-400 text-[13px]">
                {compactMoney(max * f)}
              </text>
            </g>
          );
        })}
        {trend.map((t, i) => {
          const h = (t.revenue / max) * plotH;
          const x = pad.left + slot * i + (slot - barW) / 2;
          return (
            <g key={t.start} onMouseEnter={() => setHover(i)}>
              <rect x={pad.left + slot * i} y={pad.top} width={slot} height={plotH} fill="transparent" />
              <rect
                x={x}
                y={pad.top + plotH - Math.max(t.revenue > 0 ? 2 : 0, h)}
                width={barW}
                height={Math.max(t.revenue > 0 ? 2 : 0, h)}
                rx={Math.min(6, barW / 3)}
                className={hover === i ? 'fill-brand-700' : 'fill-brand-500'}
              />
              {i % labelEvery === 0 && (
                <text x={x + barW / 2} y={height - 8} textAnchor="middle" className="fill-slate-400 text-[13px]">
                  {bucketLabel(t.start, range.interval)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function WinLoss({ won, lost }: { won: number; lost: number }) {
  const total = won + lost;
  const r = 52;
  const c = 2 * Math.PI * r;
  const wonLen = total ? (won / total) * c : 0;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 140 140" className="h-36 w-36 shrink-0 -rotate-90">
        <circle cx="70" cy="70" r={r} fill="none" strokeWidth="16" className="stroke-slate-200 dark:stroke-slate-700" />
        {total > 0 && (
          <circle
            cx="70"
            cy="70"
            r={r}
            fill="none"
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={`${wonLen} ${c}`}
            className="stroke-brand-600"
          />
        )}
      </svg>
      <div className="space-y-3 text-sm">
        <div>
          <p className="font-display text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {total ? `${Math.round((won / total) * 100)}%` : '—'}
          </p>
          <p className="text-slate-500">of closed deals won</p>
        </div>
        <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-brand-600" /> {won} won
        </p>
        <p className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-600" /> {lost} lost
        </p>
      </div>
    </div>
  );
}

function BarList({
  rows,
  empty,
}: {
  rows: Array<{ key: string; label: ReactNode; value: number; display: string; color?: string }>;
  empty: ReactNode;
}) {
  if (rows.length === 0) return <>{empty}</>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-3.5">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
            <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">{row.label}</span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-800 dark:text-slate-100">{row.display}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(row.value > 0 ? 4 : 0, (row.value / max) * 100)}%`,
                backgroundColor: row.color ?? '#10b981',
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ReportsPage() {
  const [selection, setSelection] = useState<RangeSelection>(loadSelection);
  const range = useMemo(() => resolveRange(selection), [selection]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const from = range.from ? toInputDate(range.from) : undefined;
  const to = toInputDate(range.to);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    reportsApi
      .sales({ from, to })
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiClientError ? err.message : 'Could not load the report.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from, to]);

  function changeRange(next: RangeSelection) {
    setSelection(next);
    localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(next));
  }

  const s = report?.summary;
  const stages = report
    ? [...report.stages].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage))
    : [];

  return (
    <div className="space-y-6">
      <div className="relative z-20">
        <PageHeader
          title="Reports"
          description={
            report?.scope === 'own'
              ? 'How your own deals are performing'
              : 'Sales performance across your whole team'
          }
          actions={<DateRangePicker value={selection} label={rangeLabel(selection, range)} onChange={changeRange} />}
        />
      </div>

      {error && <ErrorAlert message={error} />}

      {!report && loading && (
        <Card>
          <LoadingState message="Loading report…" />
        </Card>
      )}

      {report && s && (
        <div className={`space-y-6 transition-opacity ${loading ? 'opacity-60' : ''}`}>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Revenue won"
              value={formatCurrency(s.revenue)}
              hint={`${s.won} deal${s.won === 1 ? '' : 's'} closed won`}
              icon={IconDollar}
              iconWrap="bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300"
            />
            <KpiCard
              label="Win rate"
              value={s.winRate === null ? '—' : `${s.winRate}%`}
              hint={`${s.won} won · ${s.lost} lost`}
              icon={IconChart}
              iconWrap="bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300"
            />
            <KpiCard
              label="Average deal size"
              value={s.won ? formatCurrency(s.avgDealSize) : '—'}
              hint="Across won deals"
              icon={IconDeals}
              iconWrap="bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300"
            />
            <KpiCard
              label="Sales cycle"
              value={s.won ? `${s.avgSalesCycleDays} days` : '—'}
              hint="Average from created to won"
              icon={IconCalendar}
              iconWrap="bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300"
            />
          </section>

          <div className="grid gap-6 xl:grid-cols-3">
            <Panel
              className="xl:col-span-2"
              title="Revenue over time"
              description={`Won revenue per ${report.range.interval}, with ${s.newDeals} new deals created in this period`}
            >
              <TrendChart report={report} />
            </Panel>
            <Panel title="Win / loss" description="Deals closed in this period">
              <WinLoss won={s.won} lost={s.lost} />
              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <div>
                  <p className="text-xs text-slate-500">Open pipeline</p>
                  <p className="font-semibold tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(s.openPipeline)}
                  </p>
                  <p className="text-xs text-slate-400">{s.openDeals} open deals</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Weighted forecast</p>
                  <p className="font-semibold tabular-nums text-brand-700 dark:text-brand-300">
                    {formatCurrency(s.weightedPipeline)}
                  </p>
                  <Link to="/deals/forecast" className="link-brand text-xs">
                    View forecast
                  </Link>
                </div>
              </div>
            </Panel>
          </div>

          <DataTable
            toolbar={
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Team performance</h2>
                <p className="text-sm text-slate-500">Deals and activities per owner in this period</p>
              </div>
            }
            rows={report.byOwner}
            rowKey={(row) => row.id}
            emptyIcon={IconContact}
            emptyTitle="No team activity"
            emptyMessage="Nobody has deals or activities in this period."
            columns={[
              {
                key: 'owner',
                header: 'Owner',
                cell: (row) => (
                  <span className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                      {initials(row.name)}
                    </span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{row.name}</span>
                  </span>
                ),
              },
              { key: 'created', header: 'New deals', cell: (row) => row.created, className: 'tabular-nums' },
              { key: 'won', header: 'Won', cell: (row) => row.won, className: 'tabular-nums' },
              { key: 'lost', header: 'Lost', cell: (row) => row.lost, className: 'tabular-nums' },
              {
                key: 'winRate',
                header: 'Win rate',
                cell: (row) =>
                  row.winRate === null ? (
                    <span className="text-slate-400">—</span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <span className="block h-full rounded-full bg-brand-500" style={{ width: `${row.winRate}%` }} />
                      </span>
                      <span className="tabular-nums">{row.winRate}%</span>
                    </span>
                  ),
              },
              {
                key: 'revenue',
                header: 'Revenue',
                cell: (row) => (
                  <span className="font-semibold text-brand-700 dark:text-brand-300">{formatCurrency(row.revenue)}</span>
                ),
                className: 'tabular-nums',
              },
              {
                key: 'pipeline',
                header: 'Open pipeline',
                cell: (row) => formatCurrency(row.openPipeline),
                className: 'tabular-nums',
              },
              { key: 'activities', header: 'Activities', cell: (row) => row.activities, className: 'tabular-nums' },
            ]}
          />

          <DataTable
            toolbar={
              <div>
                <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">Lead sources</h2>
                <p className="text-sm text-slate-500">
                  Deals created in this period, grouped by where they came from
                </p>
              </div>
            }
            rows={report.bySource}
            rowKey={(row) => row.source}
            emptyIcon={IconDeals}
            emptyTitle="No new deals"
            emptyMessage="No deals were created in this period."
            columns={[
              {
                key: 'source',
                header: 'Source',
                cell: (row) => (
                  <span className="font-medium text-slate-800 dark:text-slate-100">
                    {row.source === 'UNKNOWN' ? (
                      <span className="text-slate-400">Not set</span>
                    ) : (
                      sourceLabel(row.source)
                    )}
                  </span>
                ),
              },
              {
                key: 'created',
                header: 'New deals',
                cell: (row) => (
                  <span className="flex items-center gap-2">
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <span
                        className="block h-full rounded-full bg-sky-500"
                        style={{ width: `${s.newDeals ? (row.created / s.newDeals) * 100 : 0}%` }}
                      />
                    </span>
                    <span className="tabular-nums">{row.created}</span>
                  </span>
                ),
              },
              { key: 'won', header: 'Won', cell: (row) => row.won, className: 'tabular-nums' },
              { key: 'lost', header: 'Lost', cell: (row) => row.lost, className: 'tabular-nums' },
              {
                key: 'winRate',
                header: 'Win rate',
                cell: (row) => (row.winRate === null ? <span className="text-slate-400">—</span> : `${row.winRate}%`),
                className: 'tabular-nums',
              },
              {
                key: 'revenue',
                header: 'Revenue',
                cell: (row) => (
                  <span className="font-semibold text-brand-700 dark:text-brand-300">{formatCurrency(row.revenue)}</span>
                ),
                className: 'tabular-nums',
              },
              {
                key: 'pipeline',
                header: 'Open pipeline',
                cell: (row) => formatCurrency(row.openPipeline),
                className: 'tabular-nums',
              },
            ]}
          />

          <div className="grid gap-6 lg:grid-cols-3">
            <Panel title="Top companies" description="By revenue won">
              <BarList
                rows={report.topAccounts.map((a) => ({
                  key: a.id,
                  label: (
                    <Link to={`/companies/${a.id}`} className="hover:text-brand-700 dark:hover:text-brand-300">
                      {a.name}
                    </Link>
                  ),
                  value: a.revenue,
                  display: formatCurrency(a.revenue),
                }))}
                empty={<EmptyState icon={IconCompanies} message="No won deals linked to a company yet." />}
              />
            </Panel>
            <Panel title="New deals by stage" description="Where this period's deals are now">
              <BarList
                rows={stages.map((st) => ({
                  key: st.stage,
                  label: `${stageLabel(st.stage)} · ${st.count}`,
                  value: st.value,
                  display: formatCurrency(st.value),
                  color: STAGE_COLORS[st.stage],
                }))}
                empty={<EmptyState icon={IconDeals} message="No deals were created in this period." />}
              />
            </Panel>
            <Panel title="Activity mix" description="Logged calls, meetings, emails and more">
              <BarList
                rows={report.activityMix.map((a) => ({
                  key: a.type,
                  label: titleCase(a.type),
                  value: a.count,
                  display: a.count.toLocaleString(),
                  color: ACTIVITY_COLORS[a.type],
                }))}
                empty={<EmptyState icon={IconCalendar} message="No activities logged in this period." />}
              />
            </Panel>
          </div>
        </div>
      )}
    </div>
  );
}
