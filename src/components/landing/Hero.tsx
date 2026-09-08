import { Link } from 'react-router-dom';
import { ArrowRight, Check, ChevronDown, Users } from 'lucide-react';
import { LANDING_IMAGES } from '../../assets/landing/images';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

function scrollToHowItWorks() {
  document.getElementById('how-it-works')?.scrollIntoView({
    behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    block: 'start',
  });
}

export function Hero() {
  const { ref, shown } = useReveal<HTMLDivElement>({ threshold: 0.1 });
  const { t } = useT();

  const trustItems = [
    t('landing.hero.trustQueue'),
    t('landing.hero.trustTokens'),
    t('landing.hero.trustMultilingual'),
    t('landing.hero.trustPayments'),
  ];

  return (
    <section
      id="hero"
      className="relative isolate overflow-hidden bg-cover"
      style={{ backgroundImage: `url(${LANDING_IMAGES.heroFarmer})`, backgroundPosition: 'center 18%' }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(100deg, rgba(11,31,18,0.94) 0%, rgba(11,31,18,0.86) 32%, rgba(11,31,18,0.55) 58%, rgba(11,31,18,0.28) 100%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 pb-20 pt-32 sm:px-8 sm:pt-40 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-28 lg:pt-44">
        {/* LEFT — copy */}
        <div className="text-white">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-bold tracking-widest text-[var(--lp-leaf)] backdrop-blur-sm">
            {t('landing.hero.badge')}
          </span>

          <h1 className="lp-display mt-6 max-w-[14ch]">
            {t('landing.hero.titleLine1')}
            <br />
            <span className="text-[var(--lp-leaf)]">{t('landing.hero.titleLine2')}</span>
          </h1>

          <p className="lp-lead mt-6 max-w-lg text-white/80">{t('landing.hero.subtitle')}</p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              to="/farmer/onboarding"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--lp-green-500)] px-6 py-3.5 text-base font-bold text-white transition-transform hover:-translate-y-0.5 hover:brightness-110"
            >
              {t('landing.hero.ctaPrimary')} <ArrowRight className="h-4 w-4" />
            </Link>
            <button
              onClick={scrollToHowItWorks}
              className="inline-flex items-center gap-2 rounded-xl border border-white/30 bg-white/5 px-6 py-3.5 text-base font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              {t('landing.hero.ctaSecondary')} <ChevronDown className="h-4 w-4" />
            </button>
          </div>

          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-semibold text-white/80">
            {trustItems.map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[var(--lp-leaf)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* RIGHT — realistic product overlay card */}
        <div ref={ref} className="relative hidden lg:block">
          <div
            className={`lp-reveal lp-card ml-auto w-[340px] overflow-hidden bg-white/95 p-0 backdrop-blur ${shown ? 'is-in' : ''}`}
            style={{ transitionDelay: '150ms' }}
          >
            <div className="flex items-center justify-between border-b border-[var(--lp-line)] px-5 py-3.5">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--lp-ink)]/50">
                {t('landing.hero.cardTitle')}
              </p>
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {t('landing.hero.cardStatusModerate')}
              </span>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--lp-ink)]/45">
                  {t('landing.hero.cardCentreLabel')}
                </p>
                <p className="text-base font-extrabold text-[var(--lp-ink)]">Amer Procurement Centre</p>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-[var(--lp-paper)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--lp-ink)]/45">
                    {t('landing.hero.cardQueueLabel')}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-[var(--lp-ink)]">A127</p>
                </div>
                <div className="rounded-xl bg-[var(--lp-paper)] p-3">
                  <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--lp-ink)]/45">
                    <Users className="h-3 w-3" /> {t('landing.hero.cardAheadLabel')}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-[var(--lp-ink)]">8</p>
                </div>
                <div className="rounded-xl bg-[var(--lp-paper)] p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--lp-ink)]/45">
                    {t('landing.hero.cardWaitLabel')}
                  </p>
                  <p className="mt-1 text-xl font-extrabold text-[var(--lp-ink)]">35m</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
