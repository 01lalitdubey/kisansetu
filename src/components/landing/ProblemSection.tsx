import { Clock3, MapPinned, MessageCircleWarning, Truck } from 'lucide-react';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

const ICONS = [Clock3, MapPinned, MessageCircleWarning, Truck];

export function ProblemSection() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.15 });
  const { t } = useT();

  const problems = [1, 2, 3, 4].map((n, i) => ({
    icon: ICONS[i],
    title: t(`landing.problem.card${n}Title`),
    body: t(`landing.problem.card${n}Body`),
  }));

  return (
    <section ref={ref} className="relative z-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.problem.kicker')}</p>
        <h2 className="lp-h2 mt-4 max-w-[22ch] text-[var(--lp-ink)]">{t('landing.problem.title')}</h2>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {problems.map(({ icon: Icon, title, body }, i) => (
            <div
              key={title}
              className={`lp-reveal lp-card flex flex-col gap-4 p-6 ${shown ? 'is-in' : ''}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--lp-green-500)]/10 text-[var(--lp-green-700)]">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="text-lg font-extrabold text-[var(--lp-ink)]">{title}</h3>
              <p className="text-sm leading-relaxed text-[var(--lp-ink)]/65">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
