import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  History,
  LayoutGrid,
  ListChecks,
  Menu,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore, selectUnreadCount } from '../../store/appStore';
import { LanguageSelector } from '../common/LanguageSelector';
import { DemoBadge } from '../common/DemoBadge';
import { Toast } from '../common/Toast';
import { ConnectionBanner } from '../common/ConnectionBanner';

// Change 17: no separate "Centers" page — an officer belongs to one centre.
const nav = [
  { to: '/officer/dashboard', key: 'nav.dashboard', icon: LayoutGrid },
  { to: '/officer/queue', key: 'nav.queue', icon: ListChecks },
  { to: '/officer/farmers', key: 'nav.farmers', icon: Users },
  { to: '/officer/history', key: 'nav.history', icon: History },
  { to: '/officer/recommendations', key: 'nav.recommendations', icon: Sparkles },
  { to: '/officer/analytics', key: 'nav.analytics', icon: BarChart3 },
  { to: '/officer/notifications', key: 'nav.notifications', icon: Bell },
];

export function OfficerLayout() {
  const { t } = useT();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const unread = useAppStore(selectUnreadCount);
  const backendEnabled = useAppStore((s) => s.backendEnabled);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const ensureAuth = useAppStore((s) => s.ensureAuth);
  const refreshOfficerQueue = useAppStore((s) => s.refreshOfficerQueue);
  const refreshRecommendation = useAppStore((s) => s.refreshRecommendation);
  const refreshNotifications = useAppStore((s) => s.refreshNotifications);

  const isAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    if (!backendEnabled || isAdmin) return;
    void bootstrap()
      .then(() => ensureAuth('CENTER_OFFICER'))
      .then((ok) => {
        if (!ok) return;
        void refreshOfficerQueue();
        void refreshRecommendation();
        void refreshNotifications();
      });
  }, [
    backendEnabled,
    isAdmin,
    bootstrap,
    ensureAuth,
    refreshOfficerQueue,
    refreshRecommendation,
    refreshNotifications,
  ]);

  return (
    <div className="min-h-screen bg-[#0f1c14] text-white">
      <ConnectionBanner />
      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r border-white/10 bg-[#12251a] transition-transform lg:static lg:translate-x-0 ${
            open ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-kisan-500 text-lg">
                🌾
              </span>
              <div className="leading-tight">
                <p className="text-sm font-extrabold">{t('common.appName')}</p>
                <p className="text-[11px] text-kisan-300">Officer Console</p>
              </div>
            </div>
            <button
              className="lg:hidden"
              onClick={() => setOpen(false)}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="space-y-1 px-3 py-2">
            {nav.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-kisan-500 text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {t(key)}
                {key === 'nav.notifications' && unread > 0 && (
                  <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-xs font-bold">
                    {unread}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </aside>

        {open && (
          <div
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
          />
        )}

        {/* Main */}
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-white/10 bg-[#0f1c14]/95 px-4 py-3 backdrop-blur">
            <button
              className="lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden sm:block">
              <p className="text-sm font-bold">{t('officer.commandCenter')}</p>
              <p className="text-[11px] text-white/50">{t('officer.subtitle')}</p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <DemoBadge />
              <LanguageSelector compact />
            </div>
          </header>

          <main className="flex-1 bg-[#0f1c14] px-4 py-6">
            <div className="mx-auto max-w-6xl">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      <Toast />
    </div>
  );
}
