import type { QuoteStatus } from '@/shared';

const quoteStatusClass: Record<QuoteStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  SENT: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  ACCEPTED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  REJECTED: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

const ticketStatusClass: Record<string, string> = {
  OPEN: 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200',
  IN_PROGRESS: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  RESOLVED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
};

const ticketPriorityClass: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  MEDIUM: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200',
  HIGH: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  URGENT: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
};

export function QuoteStatusBadge({ status }: { status: QuoteStatus | string }) {
  const cls =
    quoteStatusClass[status as QuoteStatus] ??
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{status}</span>
  );
}

export function TicketStatusBadge({ status }: { status: string }) {
  const cls =
    ticketStatusClass[status] ??
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

export function TicketPriorityBadge({ priority }: { priority: string }) {
  const cls =
    ticketPriorityClass[priority] ??
    'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cls}`}>{priority}</span>
  );
}
