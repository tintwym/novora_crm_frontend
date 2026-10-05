import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Permission } from '@/shared';
import { activitiesApi, type Activity } from '../../modules/activities/activitiesApi';
import { ticketsApi, type Ticket } from '../../modules/tickets/ticketsApi';
import { usePermission } from '../../hooks/usePermission';
import { useDismiss } from '../../hooks/useDismiss';
import { IconBell, IconTasks, IconTickets } from '../icons/Icons';

const REFRESH_MS = 60_000;

function when(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function NotificationsMenu() {
  const canActivities = usePermission(Permission.VIEW_ACTIVITIES);
  const canTickets = usePermission(Permission.VIEW_TICKETS);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [reminders, setReminders] = useState<Activity[]>([]);
  const [sla, setSla] = useState<Ticket[]>([]);
  const [loaded, setLoaded] = useState(false);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  const load = useCallback(async () => {
    const [r, s] = await Promise.all([
      canActivities ? activitiesApi.reminders().catch(() => [] as Activity[]) : Promise.resolve([]),
      canTickets ? ticketsApi.slaAlerts().catch(() => [] as Ticket[]) : Promise.resolve([]),
    ]);
    setReminders(r);
    setSla(s);
    setLoaded(true);
  }, [canActivities, canTickets]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const overdue = reminders.filter((r) => r.status === 'overdue');
  const upcoming = reminders.filter((r) => r.status !== 'overdue');
  const count = reminders.length + sla.length;

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label={count ? `Notifications, ${count} new` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) void load();
        }}
        className="relative rounded-full border border-slate-200 p-2.5 text-slate-500 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <IconBell size={18} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-white dark:ring-slate-900">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-slate-200/80 bg-white shadow-card dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <p className="font-display text-sm font-semibold text-slate-900 dark:text-white">
              Notifications
            </p>
            {count > 0 && <span className="text-xs text-slate-400">{count} need attention</span>}
          </div>

          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!loaded && <p className="px-3 py-6 text-center text-sm text-slate-500">Loading…</p>}
            {loaded && count === 0 && (
              <p className="px-3 py-8 text-center text-sm text-slate-500">
                You’re all caught up.
              </p>
            )}

            {sla.map((t) => (
              <Link
                key={t.id}
                to={`/tickets/${t.id}`}
                onClick={close}
                className="flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300">
                  <IconTickets size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {t.title}
                  </span>
                  <span className="block text-xs text-rose-600 dark:text-rose-400">
                    {t.slaBreached ? 'SLA breached' : 'SLA due soon'}
                    {t.slaDueAt ? ` · ${when(t.slaDueAt)}` : ''}
                  </span>
                </span>
              </Link>
            ))}

            {[...overdue, ...upcoming].map((a) => (
              <Link
                key={a.id}
                to={a.deal ? `/deals/${a.deal.id}` : a.contact ? `/contacts/${a.contact.id}` : '/activities'}
                onClick={close}
                className="flex gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <span
                  className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    a.status === 'overdue'
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
                      : 'bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300'
                  }`}
                >
                  <IconTasks size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {a.subject || a.type.toLowerCase()}
                  </span>
                  <span
                    className={`block text-xs ${
                      a.status === 'overdue' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'
                    }`}
                  >
                    {a.status === 'overdue' ? 'Overdue' : 'Due'} · {when(a.dueAt)}
                    {a.deal ? ` · ${a.deal.title}` : a.contact ? ` · ${a.contact.name}` : ''}
                  </span>
                </span>
              </Link>
            ))}
          </div>

          {canActivities && (
            <div className="border-t border-slate-100 p-2 dark:border-slate-800">
              <Link
                to="/activities"
                onClick={close}
                className="block rounded-xl px-3 py-2 text-center text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/50"
              >
                View all tasks
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
