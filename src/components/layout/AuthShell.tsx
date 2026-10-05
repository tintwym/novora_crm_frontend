import type { ReactNode } from 'react';
import { IconChart, IconContacts, IconDeals, IconTickets } from '../icons/Icons';

const HIGHLIGHTS = [
  { icon: IconContacts, title: 'Contacts & companies', text: 'Every customer, note and deal in one timeline.' },
  { icon: IconDeals, title: 'Visual pipeline', text: 'Drag deals between stages and forecast revenue.' },
  { icon: IconTickets, title: 'Support built in', text: 'Tickets, SLA timers and a self-service portal.' },
];

function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold shadow-soft ${
          inverted ? 'bg-white text-brand-700' : 'bg-brand-500 text-white'
        }`}
      >
        N
      </div>
      <div>
        <p
          className={`font-display text-lg font-semibold leading-5 ${
            inverted ? 'text-white' : 'text-slate-900 dark:text-white'
          }`}
        >
          Novora
        </p>
        <p
          className={`text-[11px] font-medium uppercase tracking-wide ${
            inverted ? 'text-brand-100' : 'text-slate-400'
          }`}
        >
          CRM
        </p>
      </div>
    </div>
  );
}

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <aside className="relative hidden w-[44%] max-w-xl flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-400/20 blur-3xl"
        />

        <Logo inverted />

        <div className="relative">
          <h2 className="font-display text-3xl font-semibold leading-tight tracking-tight">
            Grow relationships,
            <br />
            close more deals.
          </h2>
          <p className="mt-3 max-w-sm text-sm text-brand-100">
            Novora keeps your sales pipeline, customers and support desk in one calm workspace.
          </p>

          <ul className="mt-8 space-y-4">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
                  <Icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-sm text-brand-100">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-brand-700">
            <IconChart size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">Pipeline, forecast and reports</p>
            <p className="text-xs text-brand-100">See what will close this month at a glance.</p>
          </div>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-[28px]">
            {title}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <p className="mt-8 text-center text-sm text-slate-500">{footer}</p>}
        </div>
      </main>
    </div>
  );
}
