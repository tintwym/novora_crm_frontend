import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchApi, type SearchResults } from '../../modules/search/searchApi';
import { stageLabel } from '../../utils/labels';
import { useDismiss } from '../../hooks/useDismiss';
import { IconCompanies, IconContact, IconDeals, IconSearch, IconTickets } from '../icons/Icons';

type Hit = { key: string; to: string; label: string; meta: string; group: string };

const EMPTY: SearchResults = { contacts: [], companies: [], deals: [], tickets: [] };

const GROUP_ICON = {
  Contacts: IconContact,
  Companies: IconCompanies,
  Deals: IconDeals,
  Tickets: IconTickets,
} as const;

function flatten(r: SearchResults): Hit[] {
  return [
    ...r.contacts.map((c) => ({
      key: `c-${c.id}`,
      to: `/contacts/${c.id}`,
      label: c.name,
      meta: c.email || c.title || '',
      group: 'Contacts',
    })),
    ...r.companies.map((a) => ({
      key: `a-${a.id}`,
      to: `/companies/${a.id}`,
      label: a.name,
      meta: a.industry || '',
      group: 'Companies',
    })),
    ...r.deals.map((d) => ({
      key: `d-${d.id}`,
      to: `/deals/${d.id}`,
      label: d.title,
      meta: `${stageLabel(d.stage)} · ${Math.round(d.value).toLocaleString()}`,
      group: 'Deals',
    })),
    ...r.tickets.map((t) => ({
      key: `t-${t.id}`,
      to: `/tickets/${t.id}`,
      label: t.title,
      meta: `${t.ticketNumber} · ${t.status.replace('_', ' ').toLowerCase()}`,
      group: 'Tickets',
    })),
  ];
}

export function GlobalSearch() {
  const navigate = useNavigate();
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [resultsFor, setResultsFor] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setResultsFor('');
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      searchApi
        .query(q)
        .catch(() => EMPTY)
        .then((r) => {
          if (cancelled) return;
          setResults(r);
          setResultsFor(q);
          setActive(0);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const hits = useMemo(() => flatten(results), [results]);
  const showPanel = open && query.trim().length >= 2;
  const loading = resultsFor !== query.trim();

  function go(to: string) {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(to);
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, Math.max(hits.length - 1, 0)));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const hit = loading ? undefined : hits[active];
      if (hit) go(hit.to);
      else if (query.trim()) go(`/contacts?q=${encodeURIComponent(query.trim())}`);
    }
  }

  let lastGroup = '';

  return (
    <div ref={wrapRef} className="relative mx-auto w-full max-w-xl flex-1">
      <IconSearch
        size={18}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder="Search contacts, deals, companies..."
        className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-14 text-sm text-slate-800 outline-none ring-brand-500 placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-brand-600"
      />
      <kbd className="pointer-events-none absolute right-3.5 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:block dark:border-slate-700 dark:bg-slate-900">
        ⌘K
      </kbd>

      {showPanel && (
        <div
          id="global-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200/80 bg-white p-2 shadow-card dark:border-slate-700 dark:bg-slate-900"
        >
          {loading && hits.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">Searching…</p>
          )}
          {!loading && hits.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-slate-500">
              No matches for “{query.trim()}”
            </p>
          )}
          {hits.map((hit, i) => {
            const header = hit.group !== lastGroup;
            lastGroup = hit.group;
            const Icon = GROUP_ICON[hit.group as keyof typeof GROUP_ICON];
            return (
              <div key={hit.key}>
                {header && (
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {hit.group}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => go(hit.to)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
                    i === active ? 'bg-brand-50 dark:bg-brand-950/60' : ''
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                      {hit.label}
                    </span>
                    {hit.meta && (
                      <span className="block truncate text-xs text-slate-500">{hit.meta}</span>
                    )}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
