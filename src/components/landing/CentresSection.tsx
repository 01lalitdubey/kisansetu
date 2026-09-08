import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { centers as prototypeCentres } from '../../data/centers';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

const LOAD_COLOR: Record<string, string> = {
  low: 'var(--lp-green-500)',
  normal: 'var(--lp-soil)',
  high: '#dc2626',
};

/**
 * Lightweight, static map-styled preview of the prototype centre network —
 * no live Leaflet embed on the landing page. The real interactive map still
 * lives on /farmer/centers, untouched.
 */
export function CentresSection() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.15 });
  const { t } = useT();

  return (
    <section ref={ref} id="centres" className="relative z-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.centres.kicker')}</p>
        <h2 className="lp-h2 mt-4 max-w-[20ch] text-[var(--lp-ink)]">{t('landing.centres.title')}</h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className={`lp-reveal lp-static-map ${shown ? 'is-in' : ''}`} style={{ height: 420 }}>
            <p className="absolute left-4 top-4 rounded-lg bg-white/85 px-3 py-1.5 text-xs font-bold tracking-wide text-[var(--lp-ink)]/70 backdrop-blur-sm">
              {t('landing.centres.mapLabel')}
            </p>
            {prototypeCentres.map((c) => (
              <div
                key={c.id}
                className="lp-map-pin"
                style={{ left: `${c.mapX}%`, top: `${c.mapY}%` }}
                title={c.name}
              >
                <span
                  className="block h-3.5 w-3.5 rounded-full border-2 border-white shadow-[0_2px_6px_rgba(0,0,0,0.3)]"
                  style={{ background: LOAD_COLOR[c.load] ?? 'var(--lp-soil)' }}
                />
                <span className="mt-1 block whitespace-nowrap rounded-md bg-white/90 px-1.5 py-0.5 text-[10px] font-bold text-[var(--lp-ink)]/75 shadow-sm">
                  {c.name.replace(' Procurement Center', '').replace(' Grain Center', '')}
                </span>
              </div>
            ))}
          </div>

          <div className={`lp-reveal lp-card flex flex-col p-6 ${shown ? 'is-in' : ''}`} style={{ transitionDelay: '120ms' }}>
            {/* No fabricated centre count on a public page — see countLabel for the honest "demo network" disclosure. */}
            <p className="text-3xl font-extrabold tracking-tight text-[var(--lp-green-700)]">Jaipur Network</p>
            <p className="lp-kicker mt-1 text-[var(--lp-ink)]/50">{t('landing.centres.countLabel')}</p>
            <p className="mt-4 text-sm leading-relaxed text-[var(--lp-ink)]/65">{t('landing.centres.description')}</p>

            <ul className="mt-5 space-y-2 border-t border-[var(--lp-line)] pt-4">
              {prototypeCentres.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-semibold text-[var(--lp-ink)]/80">{c.name}</span>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase text-white"
                    style={{ background: LOAD_COLOR[c.load] ?? 'var(--lp-soil)' }}
                  >
                    {c.load}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              to="/farmer/centers"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--lp-ink)] px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-0.5"
            >
              <MapPin className="h-4 w-4" /> {t('landing.centres.cta')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
