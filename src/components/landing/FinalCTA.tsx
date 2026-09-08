import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { LANDING_IMAGES } from '../../assets/landing/images';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

export function FinalCTA() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.2 });
  const { t } = useT();

  return (
    <section
      ref={ref}
      id="final"
      className="relative z-20 overflow-hidden bg-cover bg-center py-24 text-white sm:py-32"
      style={{ backgroundImage: `url(${LANDING_IMAGES.fieldSunset})` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(15,61,34,0.88) 0%, rgba(11,31,18,0.94) 100%)',
        }}
        aria-hidden
      />

      <div className={`lp-reveal relative mx-auto max-w-4xl px-6 text-center sm:px-8 ${shown ? 'is-in' : ''}`}>
        <h2 className="lp-display">{t('landing.finalCta.title')}</h2>
        <p className="mt-6 text-lg text-white/80">{t('landing.finalCta.subtitle')}</p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            to="/farmer/onboarding"
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--lp-leaf)] px-7 py-3.5 text-base font-extrabold text-[var(--lp-green-900)] transition-transform hover:-translate-y-0.5"
          >
            {t('landing.finalCta.ctaPrimary')} <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/farmer/auth"
            className="inline-flex items-center gap-2 rounded-xl border border-white/30 px-7 py-3.5 text-base font-bold text-white hover:bg-white/10"
          >
            {t('landing.finalCta.ctaSecondary')}
          </Link>
        </div>
      </div>
    </section>
  );
}
