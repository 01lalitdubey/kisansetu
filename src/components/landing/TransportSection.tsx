import { Link } from 'react-router-dom';
import { LANDING_IMAGES } from '../../assets/landing/images';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

export function TransportSection() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.15 });
  const { t } = useT();

  return (
    <section ref={ref} id="transport" className="relative z-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className={`lp-reveal overflow-hidden rounded-[1.25rem] ${shown ? 'is-in' : ''}`}>
            <img
              src={LANDING_IMAGES.transportTruck}
              alt="Loaded transport truck on a rural Indian road"
              className="h-full max-h-[420px] w-full object-cover"
              loading="lazy"
            />
          </div>

          <div className={`lp-reveal ${shown ? 'is-in' : ''}`} style={{ transitionDelay: '120ms' }}>
            <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.transport.kicker')}</p>
            <h2 className="lp-h2 mt-4 max-w-[18ch] text-[var(--lp-ink)]">{t('landing.transport.title')}</h2>
            <p className="lp-lead mt-4 max-w-md text-[var(--lp-ink)]/65">{t('landing.transport.subtitle')}</p>

            <div className="mt-8 lp-card p-6">
              <p className="text-sm font-extrabold uppercase tracking-wide text-[var(--lp-ink)]/50">
                {t('landing.transport.cardTitle')}
              </p>
              <div className="mt-4 space-y-2.5">
                <Row label={t('landing.transport.vehicleLabel')} value={t('landing.transport.vehicleValue')} />
                <Row label={t('landing.transport.capacityLabel')} value="50 Qtl" />
                <Row label={t('landing.transport.fareLabel')} value="₹2,000" />
                <Row label={t('landing.transport.feeLabel')} value="₹20" />
                <div className="my-2 h-px bg-[var(--lp-line)]" />
                <Row label={t('landing.transport.totalLabel')} value="₹2,020" strong />
              </div>
              <p className="mt-4 text-xs font-semibold text-[var(--lp-ink)]/50">{t('landing.transport.note')}</p>
              <Link
                to="/farmer/transport"
                className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-[var(--lp-ink)] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
              >
                {t('landing.transport.cta')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? 'font-bold text-[var(--lp-ink)]' : 'text-sm text-[var(--lp-ink)]/60'}>
        {label}
      </span>
      <span className={strong ? 'text-lg font-extrabold text-[var(--lp-ink)]' : 'text-sm font-bold text-[var(--lp-ink)]'}>
        {value}
      </span>
    </div>
  );
}
