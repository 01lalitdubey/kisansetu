import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

/**
 * Public role picker — "Who are you?". KisanSetu has exactly two PUBLIC
 * entry points: Farmer and Procurement Centre. Admin is an internal-only
 * platform role and must never be offered here (or anywhere reachable
 * without already being authenticated as an admin).
 */
export function RolesSection() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.15 });
  const { t } = useT();

  const roles = [
    {
      key: 'farmer',
      emoji: '🌾',
      title: t('landing.roles.farmerTitle'),
      description: t('landing.roles.farmerDescription'),
      to: '/farmer/auth',
      cta: t('landing.roles.farmerCta'),
    },
    {
      key: 'officer',
      emoji: '🏢',
      title: t('landing.roles.officerTitle'),
      description: t('landing.roles.officerDescription'),
      to: '/officer/register',
      cta: t('landing.roles.officerCta'),
    },
  ];

  return (
    <section ref={ref} id="roles" className="relative z-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.roles.kicker')}</p>
        <h2 className="lp-h2 mt-4 max-w-[22ch] text-[var(--lp-ink)]">{t('landing.roles.title')}</h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {roles.map((r, i) => (
            <Link
              key={r.key}
              to={r.to}
              className={`lp-reveal lp-card group flex min-h-[280px] flex-col justify-between bg-[var(--lp-ink)] p-8 text-white ${shown ? 'is-in' : ''}`}
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div>
                <span className="grid h-12 w-12 place-items-center rounded-xl bg-white/10 text-2xl">
                  {r.emoji}
                </span>
                <h3 className="mt-6 text-3xl font-extrabold tracking-tight">{r.title}</h3>
                <p className="mt-3 max-w-[26ch] text-base text-white/70">{r.description}</p>
              </div>

              <span className="mt-8 inline-flex items-center gap-2 text-base font-bold text-[var(--lp-leaf)]">
                {r.cta} <ArrowUpRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-sm text-[var(--lp-ink)]/50">{t('landing.roles.note')}</p>
      </div>
    </section>
  );
}
