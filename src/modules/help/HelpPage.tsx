import { Link } from 'react-router-dom';
import { PageHeader, Panel } from '../../components/ui';

const GUIDES = [
  {
    title: 'Track a new lead',
    steps: 'Add the person in Contacts, link their company, then create a Deal in the Lead stage.',
    to: '/contacts',
    cta: 'Open contacts',
  },
  {
    title: 'Move deals through the pipeline',
    steps: 'Drag deal cards between stages on the Deals board. Probability updates with each stage.',
    to: '/deals',
    cta: 'Open pipeline',
  },
  {
    title: 'Send a quote',
    steps: 'Open a deal, create a quote with line items, mark it Sent, and download the PDF for your customer.',
    to: '/quotes',
    cta: 'Open quotes',
  },
  {
    title: 'Never miss a follow-up',
    steps: 'Add a Task with a due date. Overdue and upcoming tasks appear in the bell menu at the top.',
    to: '/activities',
    cta: 'Open tasks',
  },
  {
    title: 'Handle support tickets',
    steps: 'Customers submit tickets through your portal link (see Settings). Reply, add internal notes, and watch SLA timers.',
    to: '/tickets',
    cta: 'Open tickets',
  },
  {
    title: 'Invite your team',
    steps: 'Admins can add teammates and assign roles such as Sales Rep or Support Agent from the Team page.',
    to: '/users',
    cta: 'Open team',
  },
];

const FAQ = [
  {
    q: 'Why can’t I see some deals?',
    a: 'Sales reps only see deals they own. Managers and admins see every deal in the workspace.',
  },
  {
    q: 'How do I import contacts?',
    a: 'On the Contacts page, use Import CSV. Include a header row with name, email, phone, title, company and tags.',
  },
  {
    q: 'What does the SLA badge mean?',
    a: 'Each ticket has a response deadline based on its priority. “Due soon” and “Breached” tickets are flagged so you can act first.',
  },
  {
    q: 'How do I change my password?',
    a: 'Go to Settings and use the Password section. You’ll need your current password.',
  },
];

const SHORTCUTS = [
  { keys: '⌘ K / Ctrl K', action: 'Jump to search' },
  { keys: '↑ ↓', action: 'Move through search results' },
  { keys: 'Enter', action: 'Open the highlighted result' },
  { keys: 'Esc', action: 'Close menus and dialogs' },
];

export function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Help & Support" description="Quick guides for everyday work in Novora CRM" />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {GUIDES.map((g) => (
          <Panel key={g.title} className="flex flex-col">
            <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">{g.title}</h2>
            <p className="mt-1.5 flex-1 text-sm leading-relaxed text-slate-500">{g.steps}</p>
            <Link
              to={g.to}
              className="mt-4 text-sm font-medium text-brand-600 hover:underline dark:text-brand-300"
            >
              {g.cta} →
            </Link>
          </Panel>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Frequently asked questions" className="lg:col-span-2">
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {FAQ.map((item) => (
              <details key={item.q} className="group py-3 first:pt-0 last:pb-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-800 dark:text-slate-100">
                  {item.q}
                  <span className="text-slate-400 transition group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.a}</p>
              </details>
            ))}
          </div>
        </Panel>

        <Panel title="Keyboard shortcuts">
          <ul className="space-y-2.5">
            {SHORTCUTS.map((s) => (
              <li key={s.keys} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{s.action}</span>
                <kbd className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950">
                  {s.keys}
                </kbd>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
