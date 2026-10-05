import { useEffect, useMemo, useState, type ComponentType, type SVGProps } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Permission, roleHasPermission, type Role } from '@/shared';
import { authApi } from '../modules/auth/authApi';
import { useAuthStore } from '../store/authStore';
import { getStoredTheme, toggleTheme, type ThemeMode } from '../utils/theme';
import { Button, Modal } from '../components/ui';
import { GlobalSearch } from '../components/layout/GlobalSearch';
import { NotificationsMenu } from '../components/layout/NotificationsMenu';
import { ProfileMenu } from '../components/layout/ProfileMenu';
import {
  IconCampaigns,
  IconChart,
  IconCompanies,
  IconContacts,
  IconDeals,
  IconHelp,
  IconLogout,
  IconMenu,
  IconMoon,
  IconOverview,
  IconProducts,
  IconAutomation,
  IconHistory,
  IconQuotes,
  IconSettings,
  IconSun,
  IconTasks,
  IconTeam,
  IconTickets,
} from '../components/icons/Icons';

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const navPrimary: Array<{
  to: string;
  label: string;
  icon: IconComponent;
  permission?: Permission;
}> = [
  { to: '/dashboard', label: 'Overview', icon: IconOverview },
  { to: '/contacts', label: 'Contacts', icon: IconContacts, permission: Permission.VIEW_CONTACTS },
  { to: '/companies', label: 'Companies', icon: IconCompanies, permission: Permission.VIEW_COMPANIES },
  { to: '/deals', label: 'Deals', icon: IconDeals, permission: Permission.VIEW_DEALS },
  { to: '/quotes', label: 'Quotes', icon: IconQuotes, permission: Permission.VIEW_QUOTES },
  { to: '/products', label: 'Products', icon: IconProducts, permission: Permission.VIEW_QUOTES },
  { to: '/activities', label: 'Tasks', icon: IconTasks, permission: Permission.VIEW_ACTIVITIES },
  { to: '/automations', label: 'Automations', icon: IconAutomation, permission: Permission.MANAGE_AUTOMATIONS },
  { to: '/tickets', label: 'Tickets', icon: IconTickets, permission: Permission.VIEW_TICKETS },
  { to: '/campaigns', label: 'Campaigns', icon: IconCampaigns, permission: Permission.VIEW_CAMPAIGNS },
  { to: '/reports', label: 'Reports', icon: IconChart, permission: Permission.VIEW_REPORTS },
  { to: '/users', label: 'Team', icon: IconTeam, permission: Permission.VIEW_USERS },
  { to: '/audit-log', label: 'Audit log', icon: IconHistory, permission: Permission.VIEW_AUDIT_LOG },
];

function NavItems({ onNavigate }: { onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.user?.role);
  const items = useMemo(
    () =>
      navPrimary.filter(
        (item) => !item.permission || (role ? roleHasPermission(role as Role, item.permission) : false),
      ),
    [role],
  );

  return (
    <>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 ${
                isActive
                  ? 'bg-brand-500 text-white shadow-soft'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={18}
                  className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200'}
                />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
    </>
  );
}

function SidebarBrand() {
  return (
    <div className="shrink-0 px-5 py-5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500 text-sm font-bold text-white shadow-soft">
          N
        </div>
        <div>
          <p className="font-display text-base font-semibold leading-5 text-slate-900 dark:text-white">
            Novora
          </p>
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">CRM</p>
        </div>
      </div>
    </div>
  );
}

const footerItem =
  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500';
const footerIdle =
  'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100';
const footerActive = 'bg-brand-500 text-white shadow-soft';

function SidebarFooter({
  theme,
  onToggleTheme,
  onLogout,
  onNavigate,
}: {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onLogout: () => void;
  onNavigate?: () => void;
}) {
  return (
    <div className="mt-auto space-y-0.5 border-t border-slate-100 p-3 dark:border-slate-800">
      <button type="button" onClick={onToggleTheme} className={`${footerItem} ${footerIdle}`}>
        {theme === 'dark' ? <IconSun size={18} /> : <IconMoon size={18} />}
        <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
      </button>
      <NavLink
        to="/settings"
        onClick={onNavigate}
        className={({ isActive }) => `${footerItem} ${isActive ? footerActive : footerIdle}`}
      >
        <IconSettings size={18} />
        <span>Settings</span>
      </NavLink>
      <NavLink
        to="/help"
        onClick={onNavigate}
        className={({ isActive }) => `${footerItem} ${isActive ? footerActive : footerIdle}`}
      >
        <IconHelp size={18} />
        <span>Help & Support</span>
      </NavLink>
      <button type="button" onClick={onLogout} className={`${footerItem} ${footerIdle}`}>
        <IconLogout size={18} />
        <span>Sign out</span>
      </button>
    </div>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const tokens = useAuthStore((s) => s.tokens);
  const clearSession = useAuthStore((s) => s.clearSession);
  const [menuOpen, setMenuOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() =>
    typeof document !== 'undefined' ? getStoredTheme() : 'light',
  );

  useEffect(() => {
    if (!menuOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  function requestLogout() {
    setMenuOpen(false);
    setLogoutOpen(true);
  }

  async function confirmLogout() {
    setLoggingOut(true);
    try {
      if (tokens?.refreshToken) {
        await authApi.logout(tokens.refreshToken);
      }
    } catch {
      // still clear local session
    } finally {
      setLoggingOut(false);
      setLogoutOpen(false);
      clearSession();
      navigate('/login');
    }
  }

  function onToggleTheme() {
    setTheme(toggleTheme());
  }

  return (
    <div className="flex min-h-screen bg-[#f4f6f8] dark:bg-slate-950">
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col border-r border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
        <SidebarBrand />
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3" aria-label="Main">
          <NavItems />
        </nav>
        <SidebarFooter
          theme={theme}
          onToggleTheme={onToggleTheme}
          onLogout={requestLogout}
        />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-white shadow-xl dark:bg-slate-900">
            <div className="flex items-center justify-between pr-3">
              <SidebarBrand />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-500"
              >
                Close
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-3" aria-label="Main">
              <NavItems onNavigate={() => setMenuOpen(false)} />
            </nav>
            <SidebarFooter
              theme={theme}
              onToggleTheme={onToggleTheme}
              onLogout={requestLogout}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}

      <Modal
        open={logoutOpen}
        onClose={() => {
          if (!loggingOut) setLogoutOpen(false);
        }}
        title="Sign out?"
        description="You’ll need to sign in again to access your Novora CRM workspace."
      >
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="secondary"
            disabled={loggingOut}
            onClick={() => setLogoutOpen(false)}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            disabled={loggingOut}
            onClick={() => void confirmLogout()}
            className="w-full bg-rose-600 hover:bg-rose-700 focus-visible:outline-rose-500 sm:w-auto"
          >
            {loggingOut ? 'Signing out…' : 'Sign out'}
          </Button>
        </div>
      </Modal>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              aria-label="Open menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="rounded-xl border border-slate-200 p-2 text-slate-600 md:hidden dark:border-slate-700 dark:text-slate-200"
            >
              <IconMenu size={18} />
            </button>

            <GlobalSearch />

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <NotificationsMenu />
              <ProfileMenu onSignOut={requestLogout} />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
