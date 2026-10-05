export type RangePreset =
  | 'this_month'
  | 'last_month'
  | 'last_30'
  | 'last_90'
  | 'this_quarter'
  | 'this_year'
  | 'all'
  | 'custom';

export interface RangeSelection {
  preset: RangePreset;
  /** `YYYY-MM-DD`, only used when preset is `custom`. */
  customFrom?: string;
  customTo?: string;
}

export interface ResolvedRange {
  /** Inclusive start; null means "since the beginning". */
  from: Date | null;
  /** Inclusive end (end of day). */
  to: Date;
}

export const PRESET_LABEL: Record<RangePreset, string> = {
  this_month: 'This month',
  last_month: 'Last month',
  last_30: 'Last 30 days',
  last_90: 'Last 90 days',
  this_quarter: 'This quarter',
  this_year: 'This year',
  all: 'All time',
  custom: 'Custom range',
};

const DAY_MS = 86_400_000;

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function endOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
}

function parseDay(value: string | undefined) {
  if (!value) return null;
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function toInputDate(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function resolveRange(sel: RangeSelection, now = new Date()): ResolvedRange {
  const today = endOfDay(now);
  switch (sel.preset) {
    case 'this_month':
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: today };
    case 'last_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: endOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
      };
    case 'last_30':
      return { from: startOfDay(new Date(now.getTime() - 29 * DAY_MS)), to: today };
    case 'last_90':
      return { from: startOfDay(new Date(now.getTime() - 89 * DAY_MS)), to: today };
    case 'this_quarter':
      return {
        from: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
        to: today,
      };
    case 'this_year':
      return { from: new Date(now.getFullYear(), 0, 1), to: today };
    case 'custom': {
      const from = parseDay(sel.customFrom);
      const to = parseDay(sel.customTo);
      if (from && to) {
        return from <= to
          ? { from, to: endOfDay(to) }
          : { from: to, to: endOfDay(from) };
      }
      return { from: from ?? null, to: to ? endOfDay(to) : today };
    }
    case 'all':
    default:
      return { from: null, to: today };
  }
}

export function inRange(iso: string | null | undefined, range: ResolvedRange) {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return (range.from === null || t >= range.from.getTime()) && t <= range.to.getTime();
}

export function rangeLabel(sel: RangeSelection, range: ResolvedRange) {
  if (sel.preset === 'all') return 'All time';
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  return range.from ? `${fmt(range.from)} - ${fmt(range.to)}` : `Until ${fmt(range.to)}`;
}

export interface Bucket {
  start: Date;
  end: Date;
  label: string;
}

/** Splits a range into daily, weekly or monthly buckets depending on its length. */
export function buildBuckets(from: Date, to: Date): Bucket[] {
  const spanDays = Math.max(1, Math.round((to.getTime() - from.getTime()) / DAY_MS));
  const buckets: Bucket[] = [];

  if (spanDays <= 31) {
    for (let d = startOfDay(from); d <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
      buckets.push({
        start: d,
        end: endOfDay(d),
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }
  } else if (spanDays <= 120) {
    for (let d = startOfDay(from); d <= to; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)) {
      const end = endOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 6));
      buckets.push({
        start: d,
        end: end > to ? to : end,
        label: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      });
    }
  } else {
    for (
      let d = new Date(from.getFullYear(), from.getMonth(), 1);
      d <= to;
      d = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    ) {
      buckets.push({
        start: d,
        end: endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0)),
        label: d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' }),
      });
    }
  }
  return buckets;
}
