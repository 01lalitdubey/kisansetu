import {
  BadgeCheck,
  ClipboardList,
  CreditCard,
  ListChecks,
  MapPin,
  PackageCheck,
  Truck,
  UserPlus,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

const ICONS = [UserPlus, ListChecks, MapPin, ClipboardList, BadgeCheck, PackageCheck, Truck, CreditCard];

export function HowItWorks() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.1 });
  const { t } = useT();

  const steps = ICONS.map((Icon, i) => ({
    icon: Icon,
    title: t(`landing.how.step${i + 1}Title`),
    body: t(`landing.how.step${i + 1}Body`),
  }));

  return (
    <section
      ref={ref}
      id="how-it-works"
      className="relative z-20 border-y border-[var(--lp-line)] bg-[var(--lp-paper-2)] py-14 sm:py-20"
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.how.kicker')}</p>
        <h2 className="lp-h2 mt-4 max-w-[22ch] text-[var(--lp-ink)]">{t('landing.how.title')}</h2>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className={`lp-reveal lp-card p-5 ${shown ? 'is-in' : ''}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-2xl font-extrabold text-[var(--lp-line)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--lp-green-500)]/10 text-[var(--lp-green-700)]">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
              <h3 className="mt-4 text-sm font-extrabold text-[var(--lp-ink)]">{title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[var(--lp-ink)]/60">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
