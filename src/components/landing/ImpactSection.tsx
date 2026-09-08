import { LANGUAGES, useT } from '../../i18n';
import { Counter } from './Counter';
import { useReveal } from './hooks';

export function ImpactSection() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.2 });
  const { t } = useT();

  const features = [
    t('landing.impact.featureQueue'),
    t('landing.impact.featureTokens'),
    t('landing.impact.featureTransport'),
    t('landing.impact.featurePayments'),
  ];

  return (
    <section ref={ref} className="relative z-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.impact.kicker')}</p>
            <h2 className="lp-h2 mt-4 max-w-[18ch] text-[var(--lp-ink)]">{t('landing.impact.title')}</h2>
          </div>
          <span className="rounded-full border border-[var(--lp-line)] bg-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide text-[var(--lp-ink)]/50">
            {t('landing.impact.badge')}
          </span>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <div className={`lp-reveal lp-card p-6 lg:col-span-2 ${shown ? 'is-in' : ''}`}>
            {/* No fabricated centre count — the real, growing number lives in the
                database, not this marketing page. */}
            <p className="text-5xl font-extrabold tracking-tight text-[var(--lp-green-700)]">Jaipur</p>
            <p className="mt-2 text-sm font-bold text-[var(--lp-ink)]/60">{t('landing.impact.centresLabel')}</p>
          </div>
          <div className={`lp-reveal lp-card p-6 lg:col-span-2 ${shown ? 'is-in' : ''}`} style={{ transitionDelay: '80ms' }}>
            <p className="text-5xl font-extrabold tracking-tight text-[var(--lp-green-700)]">
              <Counter to={LANGUAGES.length} />
            </p>
            <p className="mt-2 text-sm font-bold text-[var(--lp-ink)]/60">{t('landing.impact.languagesLabel')}</p>
          </div>
          <div className={`lp-reveal lp-card p-6 lg:col-span-2 ${shown ? 'is-in' : ''}`} style={{ transitionDelay: '160ms' }}>
            <p className="text-5xl font-extrabold tracking-tight text-[var(--lp-green-700)]">8</p>
            <p className="mt-2 text-sm font-bold text-[var(--lp-ink)]/60">{t('landing.impact.stepsLabel')}</p>
          </div>

          {features.map((f, i) => (
            <div
              key={f}
              className={`lp-reveal lp-card p-5 lg:col-span-3 ${shown ? 'is-in' : ''}`}
              style={{ transitionDelay: `${240 + i * 80}ms` }}
            >
              <p className="text-sm font-extrabold text-[var(--lp-ink)]">{f}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-xs text-[var(--lp-ink)]/45">{t('landing.impact.note')}</p>
      </div>
    </section>
  );
}
