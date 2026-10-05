import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { DEAL_STAGES, Permission, type DealStage } from '@/shared';
import { useAuthStore } from '../../store/authStore';
import { usePermission } from '../../hooks/usePermission';
import { STAGE_LABEL } from '../../utils/labels';
import { api, ApiClientError } from '../../utils/api';
import { dealsApi, type Deal } from '../deals/dealsApi';
import { activitiesApi, type Activity } from '../activities/activitiesApi';
import { IconChart, IconContact, IconContacts, IconDollar } from '../../components/icons/Icons';
import { DateRangePicker } from './DateRangePicker';
import {
  PRESET_LABEL,
  buildBuckets,
  inRange,
  rangeLabel,
  resolveRange,
  type RangeSelection,
} from './dateRange';

interface ActivityRow {
  id: string;
  type: string;
  subject: string | null;
  note: string | null;
  date: string;
  user: { name: string };
  contact?: { id: string; name: string } | null;
  deal?: { id: string; title: string } | null;
}

const RANGE_STORAGE_KEY = 'novora.dashboard.range';

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
  return { preset: 'this_month' };
}

/** When a deal was won: its close date if set, otherwise when it was last moved. */
function wonDate(deal: Deal) {
  return deal.closeDate ?? deal.updatedAt ?? deal.createdAt ?? null;
}

const PIPELINE_STAGES: DealStage[] = ['LEAD', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON'];

const STAGE_BAR_COLORS: Record<string, string> = {
  LEAD: '#a7f3d0',
  QUALIFIED: '#6ee7b7',
  PROPOSAL: '#34d399',
  NEGOTIATION: '#10b981',
  WON: '#047857',
};

const DONUT_COLORS = ['#14b8a6', '#22c55e', '#3b82f6', '#f97316', '#0f766e', '#94a3b8'];

const ACTIVITY_VERB: Record<string, string> = {
  CALL: 'logged a call',
  MEETING: 'scheduled a meeting',
  EMAIL: 'sent an email',
  TASK: 'added a task',
  NOTE: 'left a note',
};

function formatMoney(value: number) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${Math.round(value).toLocaleString()}`;
  return `$${Math.round(value).toLocaleString()}`;
}

function greetingForHour(hour: number) {
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function dateChip(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function CardShell({
  children,
  className = '',
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900 ${className}`}
    >
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title ? (
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
              {title}
            </h2>
          ) : (
            <span />
          )}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function RangeTag({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-lg bg-slate-50 px-2 py-1 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
      {children}
    </span>
  );
}

function PipelineBars({
  counts,
  loading,
}: {
  counts: Array<{ stage: DealStage; count: number }>;
  loading: boolean;
}) {
  const max = Math.max(1, ...counts.map((c) => c.count));
  return (
    <div className="space-y-3.5">
      {counts.map((row) => {
        const width = loading ? 0 : Math.max(row.count > 0 ? 6 : 0, (row.count / max) * 100);
        return (
          <div key={row.stage} className="grid grid-cols-[110px_1fr_36px] items-center gap-3">
            <span className="truncate text-sm text-slate-500">
              {row.stage === 'LEAD' ? 'New Leads' : STAGE_LABEL[row.stage]}
            </span>
            <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${width}%`,
                  backgroundColor: STAGE_BAR_COLORS[row.stage] ?? '#10b981',
                }}
              />
            </div>
            <span className="text-right text-sm font-semibold tabular-nums text-slate-700 dark:text-slate-200">
              {loading ? '—' : row.count}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DealDonut({
  slices,
  total,
  loading,
}: {
  slices: Array<{ label: string; value: number; color: string }>;
  total: number;
  loading: boolean;
}) {
  const radius = 54;
  const stroke = 18;
  const c = 2 * Math.PI * radius;
  let offset = 0;
  const safeTotal = Math.max(1, total);

  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
      <div className="relative h-40 w-40 shrink-0">
        <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-slate-100 dark:text-slate-800"
          />
          {!loading &&
            slices.map((slice) => {
              const len = (slice.value / safeTotal) * c;
              const el = (
                <circle
                  key={slice.label}
                  cx="70"
                  cy="70"
                  r={radius}
                  fill="none"
                  stroke={slice.color}
                  strokeWidth={stroke}
                  strokeDasharray={`${len} ${c - len}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <p className="font-display text-2xl font-bold tabular-nums text-slate-900 dark:text-white">
            {loading ? '—' : total}
          </p>
          <p className="text-[11px] font-medium text-slate-400">Deals</p>
        </div>
      </div>
      <ul className="w-full space-y-2.5">
        {slices.map((slice) => {
          const pct = total ? Math.round((slice.value / total) * 100) : 0;
          return (
            <li key={slice.label} className="flex items-center justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: slice.color }}
                />
                {slice.label}
              </span>
              <span className="font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {loading ? '—' : `${pct}%`}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Up to six evenly spaced label positions, always including the first and last point. */
function tickIndexes(count: number) {
  const ticks = Math.min(6, count);
  if (ticks <= 1) return count ? [0] : [];
  return [...new Set(Array.from({ length: ticks }, (_, k) => Math.round((k * (count - 1)) / (ticks - 1))))];
}

function AcquisitionChart({
  points,
  loading,
}: {
  points: Array<{ label: string; value: number }>;
  loading: boolean;
}) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = 320;
  const h = 160;
  const padX = 8;
  const padY = 16;
  const coords = points.map((p, i) => {
    const x = padX + (i / Math.max(1, points.length - 1)) * (w - padX * 2);
    const y = h - padY - (p.value / max) * (h - padY * 2);
    return { ...p, x, y };
  });
  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x},${c.y}`).join(' ');
  const area = `${line} L${coords[coords.length - 1]?.x ?? 0},${h - padY} L${coords[0]?.x ?? 0},${h - padY} Z`;
  const last = coords[coords.length - 1];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-44 w-full overflow-visible">
        <defs>
          <linearGradient id="acqFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {!loading && coords.length > 1 && (
          <>
            <path d={area} fill="url(#acqFill)" />
            <path d={line} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" />
            {last && (
              <>
                <circle cx={last.x} cy={last.y} r="5" fill="#10b981" className="stroke-white" strokeWidth="2" />
                <foreignObject x={last.x - 44} y={last.y - 48} width="88" height="40">
                  <div className="rounded-lg bg-slate-900 px-2 py-1 text-center text-[10px] font-medium text-white shadow-soft">
                    <div className="tabular-nums">{last.value}</div>
                    <div className="text-slate-300">{last.label}</div>
                  </div>
                </foreignObject>
              </>
            )}
          </>
        )}
      </svg>
      <div className="mt-1 flex justify-between px-1 text-[11px] font-medium text-slate-400">
        {tickIndexes(points.length).map((i) => (
          <span key={points[i].label}>{points[i].label}</span>
        ))}
      </div>
    </div>
  );
}

function ConversionFunnel({
  steps,
  loading,
}: {
  steps: Array<{ label: string; count: number; pct: number }>;
  loading: boolean;
}) {
  const colors = ['#86efac', '#4ade80', '#22c55e', '#16a34a', '#15803d'];
  return (
    <div className="space-y-2.5">
      {steps.map((step, i) => {
        const width = 100 - i * 12;
        return (
          <div key={step.label} className="flex items-center gap-3">
            <div className="flex-1">
              <div
                className="mx-auto flex h-9 items-center justify-center rounded-md text-sm font-semibold text-white transition-all"
                style={{
                  width: `${width}%`,
                  backgroundColor: colors[i] ?? '#16a34a',
                }}
              >
                {step.label}
              </div>
            </div>
            <div className="w-20 shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums text-slate-800 dark:text-slate-100">
                {loading ? '—' : step.count.toLocaleString()}
              </p>
              <p className="text-[11px] text-slate-400">{loading ? '—' : `${step.pct}%`}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const canManage = usePermission(Permission.MANAGE_USERS);
  const canContacts = usePermission(Permission.VIEW_CONTACTS);
  const canDeals = usePermission(Permission.VIEW_DEALS);
  const canActivities = usePermission(Permission.VIEW_ACTIVITIES);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [contactDates, setContactDates] = useState<Array<string | undefined>>([]);
  const [recent, setRecent] = useState<ActivityRow[]>([]);
  const [reminders, setReminders] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selection, setSelection] = useState<RangeSelection>(loadSelection);

  const greeting = useMemo(() => greetingForHour(new Date().getHours()), []);
  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const range = useMemo(() => resolveRange(selection), [selection]);
  const isAllTime = selection.preset === 'all';
  const scopeLabel = PRESET_LABEL[selection.preset];

  function changeSelection(next: RangeSelection) {
    setSelection(next);
    localStorage.setItem(RANGE_STORAGE_KEY, JSON.stringify(next));
  }

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [contacts, pipelineData, recentActs, reminderList] = await Promise.all([
          canContacts ? api.get<Array<{ createdAt?: string }>>('/contacts') : [],
          canDeals ? dealsApi.pipeline() : null,
          canActivities ? api.get<ActivityRow[]>('/activities/recent?limit=8') : [],
          canActivities ? activitiesApi.reminders().catch(() => [] as Activity[]) : [],
        ]);
        setDeals(pipelineData ? pipelineData.columns.flatMap((c) => c.deals) : []);
        setContactDates(contacts.map((c) => c.createdAt));
        setRecent(recentActs);
        setReminders(reminderList.slice(0, 5));
      } catch (err) {
        setError(
          err instanceof ApiClientError ? err.message : 'Could not load dashboard metrics',
        );
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [canContacts, canDeals, canActivities]);

  /** Deals that entered the pipeline during the selected range. */
  const dealsInRange = useMemo(
    () => deals.filter((d) => inRange(d.createdAt, range)),
    [deals, range],
  );

  const wonInRange = useMemo(
    () => deals.filter((d) => d.stage === 'WON' && inRange(wonDate(d), range)),
    [deals, range],
  );

  const stats = useMemo(
    () => ({
      leads: dealsInRange.length,
      contacts: contactDates.filter((iso) => inRange(iso, range)).length,
      customers: new Set(wonInRange.map((d) => d.accountId ?? d.contactId ?? d.id)).size,
      revenue: wonInRange.reduce((sum, d) => sum + Number(d.value || 0), 0),
    }),
    [dealsInRange, contactDates, wonInRange, range],
  );

  const pipelineCounts = useMemo(
    () =>
      PIPELINE_STAGES.map((stage) => ({
        stage,
        count: dealsInRange.filter((d) => d.stage === stage).length,
      })),
    [dealsInRange],
  );

  const donutSlices = useMemo(() => {
    const open = DEAL_STAGES.filter((s) => s !== 'LOST');
    return open.map((stage, i) => ({
      label: stage === 'LEAD' ? 'New Leads' : STAGE_LABEL[stage],
      value: dealsInRange.filter((d) => d.stage === stage).length,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
    }));
  }, [dealsInRange]);

  const activeDealTotal = useMemo(
    () => dealsInRange.filter((d) => d.stage !== 'LOST').length,
    [dealsInRange],
  );

  const acquisitionPoints = useMemo(() => {
    let from = range.from;
    if (!from) {
      const sixMonthsAgo = new Date(range.to.getFullYear(), range.to.getMonth() - 5, 1);
      const earliest = deals
        .map((d) => new Date(wonDate(d) ?? d.createdAt ?? '').getTime())
        .filter((t) => !Number.isNaN(t))
        .reduce((min, t) => Math.min(min, t), sixMonthsAgo.getTime());
      from = new Date(earliest);
    }
    return buildBuckets(from, range.to).map((bucket) => ({
      label: bucket.label,
      value: wonInRange.filter((d) => {
        const t = new Date(wonDate(d) ?? '').getTime();
        return t >= bucket.start.getTime() && t <= bucket.end.getTime();
      }).length,
    }));
  }, [deals, wonInRange, range]);

  const funnelSteps = useMemo(() => {
    // A deal that reached a later stage also passed through every earlier one.
    const reached = pipelineCounts.map((_, i) =>
      pipelineCounts.slice(i).reduce((sum, row) => sum + row.count, 0),
    );
    const base = reached[0] ?? 0;
    return pipelineCounts.map((row, i) => ({
      label: row.stage === 'LEAD' ? 'Leads' : row.stage === 'WON' ? 'Customers' : STAGE_LABEL[row.stage],
      count: reached[i],
      pct: base ? Math.round((reached[i] / base) * 100) : 0,
    }));
  }, [pipelineCounts]);

  const messageItems = useMemo(
    () =>
      recent
        .filter((r) => r.type === 'EMAIL' || r.type === 'NOTE' || r.type === 'CALL')
        .slice(0, 4),
    [recent],
  );

  const kpiCards = [
    {
      label: isAllTime ? 'Total Leads' : 'New Leads',
      value: stats.leads.toLocaleString(),
      icon: IconContacts,
      iconWrap: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
      delta: null as string | null,
    },
    {
      label: isAllTime ? 'Total Contacts' : 'New Contacts',
      value: stats.contacts.toLocaleString(),
      icon: IconContact,
      iconWrap: 'bg-sky-50 text-sky-600 dark:bg-sky-950 dark:text-sky-300',
      delta: null,
    },
    {
      label: isAllTime ? 'Total Customers' : 'New Customers',
      value: stats.customers.toLocaleString(),
      icon: IconChart,
      iconWrap: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
      delta: null,
    },
    {
      label: isAllTime ? 'Total Revenue' : 'Revenue Won',
      value: formatMoney(stats.revenue),
      icon: IconDollar,
      iconWrap: 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300',
      delta: null,
    },
  ];

  return (
    <div className="dash-enter space-y-6">
      <div className="relative z-20 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
            {greeting}, Here&apos;s your CRM overview
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-slate-500">
            Hi {firstName} — track pipeline health, customer growth, and team activity in one place.
          </p>
        </div>
        <DateRangePicker
          value={selection}
          label={rangeLabel(selection, range)}
          onChange={changeSelection}
        />
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {!loading && !error && canManage && deals.length === 0 && contactDates.length === 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-brand-900 dark:bg-brand-950/40">
          <div>
            <p className="text-sm font-semibold text-brand-900 dark:text-brand-100">Your workspace is empty</p>
            <p className="mt-0.5 text-sm text-brand-800/80 dark:text-brand-200/80">
              Load sample data to see how the dashboard, pipeline and reports look, then remove it any time.
            </p>
          </div>
          <Link to="/settings" className="btn-primary shrink-0">
            Load sample data
          </Link>
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.iconWrap}`}
                >
                  <Icon size={20} />
                </div>
                {card.delta && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {card.delta}
                  </span>
                )}
              </div>
              <p className="mt-4 text-sm font-medium text-slate-500">{card.label}</p>
              <p className="mt-1 font-display text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-white">
                {loading ? (
                  <span className="inline-block h-9 w-24 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                ) : (
                  card.value
                )}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <CardShell title="Sales Pipeline" action={<RangeTag>{scopeLabel}</RangeTag>}>
          <PipelineBars counts={pipelineCounts} loading={loading} />
        </CardShell>

        <CardShell title="Deal Stages" action={<RangeTag>{scopeLabel}</RangeTag>}>
          <DealDonut
            slices={
              donutSlices.some((s) => s.value > 0)
                ? donutSlices.filter((s) => s.value > 0)
                : PIPELINE_STAGES.map((stage, i) => ({
                    label: stage === 'LEAD' ? 'New Leads' : STAGE_LABEL[stage],
                    value: 0,
                    color: DONUT_COLORS[i],
                  }))
            }
            total={activeDealTotal}
            loading={loading}
          />
        </CardShell>

        <CardShell title="Customer Acquisition" action={<RangeTag>{scopeLabel}</RangeTag>}>
          <AcquisitionChart points={acquisitionPoints} loading={loading} />
        </CardShell>

        <CardShell title="Conversion Funnel" action={<RangeTag>{scopeLabel}</RangeTag>}>
          <ConversionFunnel steps={funnelSteps} loading={loading} />
        </CardShell>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <CardShell
          title="Upcoming Tasks & Calendar"
          action={
            <Link
              to="/activities"
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              View all
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {!loading && reminders.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-500">No upcoming tasks</li>
            )}
            {reminders.map((item) => (
              <li key={item.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-50 text-center dark:bg-slate-950">
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    {(item.dueAt ? dateChip(item.dueAt) : dateChip(item.date)).split(' ')[1]}
                  </span>
                  <span className="font-display text-lg font-bold leading-none text-slate-800 dark:text-slate-100">
                    {(item.dueAt ? dateChip(item.dueAt) : dateChip(item.date)).split(' ')[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {item.subject || `${item.type} task`}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {item.deal?.title || item.contact?.name || 'General'}
                    {item.dueAt ? ` · ${timeLabel(item.dueAt)}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardShell>

        <CardShell
          title="Recent Messages"
          action={
            <Link
              to="/activities"
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              View all
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {!loading && messageItems.length === 0 && recent.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-500">No recent messages</li>
            )}
            {(messageItems.length ? messageItems : recent.slice(0, 4)).map((item, idx) => (
              <li key={item.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="relative shrink-0">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
                    {initials(item.user.name)}
                  </div>
                  {idx < 2 && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-brand-500 ring-2 ring-white dark:ring-slate-900" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {item.contact?.name || item.user.name}
                    </p>
                    <span className="shrink-0 text-[11px] text-slate-400">
                      {relativeTime(item.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                    {item.subject || item.note || ACTIVITY_VERB[item.type] || item.type}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </CardShell>

        <CardShell
          title="Team Activity"
          action={
            <Link
              to="/activities"
              className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              View all
            </Link>
          }
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {!loading && recent.length === 0 && (
              <li className="py-6 text-center text-sm text-slate-500">No team activity yet</li>
            )}
            {recent.slice(0, 5).map((item) => (
              <li key={item.id} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {initials(item.user.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {item.user.name}
                    </span>{' '}
                    {ACTIVITY_VERB[item.type] ?? 'updated a record'}
                    {item.deal ? (
                      <>
                        {' '}
                        <span className="font-medium text-slate-800 dark:text-slate-100">
                          {item.deal.title}
                        </span>
                      </>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">{relativeTime(item.date)}</p>
                </div>
              </li>
            ))}
          </ul>
        </CardShell>
      </section>
    </div>
  );
}
