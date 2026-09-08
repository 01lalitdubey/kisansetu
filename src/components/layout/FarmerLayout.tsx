import { useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Bell,
  Bot,
  Building2,
  ClipboardList,
  History,
  LayoutDashboard,
  Loader2,
  Sprout,
  Ticket,
  Truck,
  User,
  Users,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore, selectUnreadCount } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { LanguageSelector } from '../common/LanguageSelector';
import { Toast } from '../common/Toast';
import { ConnectionBanner } from '../common/ConnectionBanner';

const nav = [
  { to: '/farmer/dashboard', key: 'nav.dashboard', icon: LayoutDashboard },
  { to: '/farmer/centers', key: 'nav.centers', icon: Building2 },
  { to: '/farmer/procurement', key: 'nav.procurement', icon: ClipboardList },
  { to: '/farmer/token', key: 'nav.myToken', icon: Ticket },
  { to: '/farmer/queue', key: 'nav.queue', icon: Users },
  { to: '/farmer/transport', key: 'nav.transport', icon: Truck },
  { to: '/farmer/assistant', key: 'nav.assistant', icon: Bot },
  { to: '/farmer/history', key: 'nav.history', icon: History },
  { to: '/farmer/notifications', key: 'nav.notifications', icon: Bell },
  { to: '/farmer/profile', key: 'nav.profile', icon: User },
];

export function FarmerLayout() {
  const { t } = useT();
  const navigate = useNavigate();
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const user = useAppStore((s) => s.user);
  const unread = useAppStore(selectUnreadCount);
  const backendEnabled = useAppStore((s) => s.backendEnabled);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const authStatus = useAuthStore((s) => s.status);

  useEffect(() => {
    if (!onboardingComplete) {
      navigate('/farmer/onboarding', { replace: true });
    } else if (authStatus === 'signed-out') {
      navigate('/farmer/auth', { replace: true });
    }
  }, [onboardingComplete, authStatus, navigate]);

  useEffect(() => {
    // authStore already hydrates the farmer on sign-in; this just makes sure
    // centre data is warm even in mock mode.
    if (backendEnabled && authStatus === 'signed-in') void bootstrap();
  }, [backendEnabled, authStatus, bootstrap]);

  // Mobile shows the 5 most-used destinations in the bottom bar.
  const bottomNav = nav.filter((n) =>
    ['nav.dashboard', 'nav.centers', 'nav.myToken', 'nav.transport', 'nav.assistant'].includes(n.key),
  );

  if (authStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-grain">
        <Loader2 className="h-8 w-8 animate-spin text-kisan-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-grain">
      <ConnectionBanner />
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-kisan-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <NavLink to="/farmer/dashboard" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-kisan-500 text-lg">
              🌾
            </span>
            <span className="text-lg font-extrabold tracking-tight text-kisan-900">
              {t('common.appName')}
            </span>
          </NavLink>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSelector compact />
            <NavLink
              to="/farmer/notifications"
              className="relative grid h-10 w-10 place-items-center rounded-xl border border-kisan-200 bg-white text-kisan-700 hover:bg-kisan-50"
              aria-label={t('common.notifications')}
            >
              <Bell className="h-5 w-5" />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {unread}
                </span>
              )}
            </NavLink>
            <NavLink
              to="/farmer/profile"
              className="grid h-10 w-10 place-items-center rounded-xl border border-kisan-200 bg-white text-kisan-700 hover:bg-kisan-50"
              aria-label={t('common.profile')}
            >
              <User className="h-5 w-5" />
            </NavLink>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-6 px-4 py-6">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 lg:block">
          <nav className="sticky top-24 space-y-1">
            {nav.map(({ to, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-kisan-500 text-white'
                      : 'text-kisan-800 hover:bg-kisan-50'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {t(key)}
              </NavLink>
            ))}
            <div className="!mt-6 rounded-xl bg-kisan-50 p-3 text-xs text-kisan-700">
              <Sprout className="mb-1 h-4 w-4" />
              {user ? `${user.crop} · ${user.quantityQuintals} q` : 'Farmer account'}
            </div>
          </nav>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1 pb-24 lg:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-kisan-100 bg-white/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {bottomNav.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${
                  isActive ? 'text-kisan-600' : 'text-kisan-500/70'
                }`
              }
            >
              <Icon className="h-5 w-5" />
              {t(key)}
            </NavLink>
          ))}
        </div>
      </nav>

      <Toast />
    </div>
  );
}
