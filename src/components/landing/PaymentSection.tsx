import { ShieldCheck } from 'lucide-react';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

/** Landing-page explanation only — no payment flow, no Stripe keys here. */
export function PaymentSection() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.2 });
  const { t } = useT();

  return (
    <section
      ref={ref}
      id="payment"
      className="relative z-20 border-y border-[var(--lp-line)] bg-[var(--lp-paper-2)] py-14 sm:py-20"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-6 sm:px-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.payment.kicker')}</p>
          <h2 className="lp-h2 mt-4 text-[var(--lp-ink)]">{t('landing.payment.title')}</h2>
          <p className="lp-lead mt-4 max-w-md text-[var(--lp-ink)]/65">{t('landing.payment.subtitle')}</p>
        </div>

        <div className={`lp-reveal lp-card p-7 ${shown ? 'is-in' : ''}`}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[var(--lp-ink)]/55">{t('landing.payment.transportChargeLabel')}</span>
              <span className="font-bold text-[var(--lp-ink)]">₹2,000</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--lp-ink)]/55">{t('landing.payment.platformFeeLabel')}</span>
              <span className="font-bold text-[var(--lp-ink)]">₹20</span>
            </div>
            <div className="h-px bg-[var(--lp-line)]" />
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-[var(--lp-ink)]">{t('landing.payment.totalLabel')}</span>
              <span className="text-3xl font-extrabold tracking-tight text-[var(--lp-ink)]">₹2,020</span>
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 rounded-xl bg-[var(--lp-ink)] px-4 py-3 text-sm font-semibold text-white">
            <ShieldCheck className="h-4 w-4 text-[var(--lp-leaf)]" />
            {t('landing.payment.secureLabel')}
          </div>
          <p className="mt-3 text-xs text-[var(--lp-ink)]/45">{t('landing.payment.note')}</p>
        </div>
      </div>
    </section>
  );
}
