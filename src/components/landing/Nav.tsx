import { Link } from 'react-router-dom';
import { useT } from '../../i18n';
import { useScrollY } from './hooks';
import { LanguageSelector } from '../common/LanguageSelector';

function scrollTo(id: string) {
  const el = document.getElementById(id);
  el?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function Nav() {
  const compact = useScrollY() > 40;
  const { t } = useT();

  const LINKS: { label: string; to?: string; anchor?: string }[] = [
    { label: t('landing.nav.howItWorks'), anchor: 'how-it-works' },
    { label: t('landing.nav.forFarmers'), anchor: 'roles' },
    { label: t('landing.nav.forCentres'), to: '/officer/dashboard' },
    { label: t('landing.nav.about'), anchor: 'final' },
    { label: t('landing.nav.login'), to: '/farmer/auth' },
  ];

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-all duration-300"
      style={{ paddingTop: compact ? 8 : 18, paddingBottom: compact ? 8 : 18 }}
    >
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between px-4 transition-all duration-300 sm:px-8 ${
          compact
            ? 'rounded-2xl border border-black/5 bg-white/75 py-2 shadow-[0_8px_30px_-12px_rgba(15,61,34,0.25)] backdrop-blur-md'
            : 'py-1'
        }`}
        style={{ maxWidth: compact ? 1120 : 1280 }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <span
            className="grid place-items-center rounded-lg bg-[var(--lp-green-500)] text-white transition-all duration-300"
            style={{ height: compact ? 30 : 36, width: compact ? 30 : 36, fontSize: compact ? 15 : 18 }}
          >
            🌾
          </span>
          <span
            className="font-extrabold tracking-tight text-[var(--lp-ink)] transition-all duration-300"
            style={{ fontSize: compact ? 15 : 17 }}
          >
            KisanSetu AI
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) =>
            l.to ? (
              <Link
                key={l.label}
                to={l.to}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--lp-ink)]/70 transition-colors hover:text-[var(--lp-ink)]"
              >
                {l.label}
              </Link>
            ) : (
              <button
                key={l.label}
                onClick={() => scrollTo(l.anchor!)}
                className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--lp-ink)]/70 transition-colors hover:text-[var(--lp-ink)]"
              >
                {l.label}
              </button>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <LanguageSelector compact />
          </div>
          <Link
            to="/farmer/onboarding"
            className="rounded-xl bg-[var(--lp-ink)] px-4 py-2 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            {t('landing.nav.getStarted')}
          </Link>
        </div>
      </div>
    </header>
  );
}
