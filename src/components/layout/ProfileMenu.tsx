import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useDismiss } from '../../hooks/useDismiss';
import { formatRole, initials } from '../../utils/format';
import { IconChevronDown, IconHelp, IconLogout, IconSettings } from '../icons/Icons';

export function ProfileMenu({ onSignOut }: { onSignOut: () => void }) {
  const user = useAuthStore((s) => s.user);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(wrapRef, open, close);

  const firstName = user?.name?.split(' ')[0] ?? 'there';
  const itemClass =
    'flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2.5 rounded-full border border-slate-200 py-1 pl-1 pr-1 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500 sm:pr-2.5 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-300">
          {initials(user?.name)}
        </span>
        <span className="hidden min-w-0 pr-0.5 text-left sm:block">
          <span className="block truncate text-sm font-semibold leading-4 text-slate-800 dark:text-slate-100">
            Hi, {firstName}
          </span>
          <span className="block truncate text-[11px] text-slate-400">{formatRole(user?.role)}</span>
        </span>
        <IconChevronDown
          size={16}
          className={`hidden text-slate-400 transition sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-2 w-64 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-card dark:border-slate-700 dark:bg-slate-900"
        >
          <div className="border-b border-slate-100 px-3 pb-3 pt-1 dark:border-slate-800">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{user?.name}</p>
            <p className="truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <div className="pt-2">
            <Link role="menuitem" to="/settings" onClick={close} className={itemClass}>
              <IconSettings size={16} /> Settings
            </Link>
            <Link role="menuitem" to="/help" onClick={close} className={itemClass}>
              <IconHelp size={16} /> Help & Support
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={() => {
                close();
                onSignOut();
              }}
              className={`${itemClass} text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/40`}
            >
              <IconLogout size={16} /> Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
