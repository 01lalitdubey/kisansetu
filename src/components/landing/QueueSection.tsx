import { useEffect, useState } from 'react';
import { Activity, Users } from 'lucide-react';
import { LANDING_IMAGES } from '../../assets/landing/images';
import { useT } from '../../i18n';
import { useReducedMotion, useReveal } from './hooks';

const TOKENS = ['A118', 'A121', 'A124', 'A127'];

export function QueueSection() {
  const reduced = useReducedMotion();
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.25 });
  const [pulse, setPulse] = useState(false);
  const { t } = useT();

  useEffect(() => {
    if (!shown || reduced) return;
    const id = setInterval(() => setPulse((p) => !p), 1600);
    return () => clearInterval(id);
  }, [shown, reduced]);

  const stats = [
    { k: t('landing.queue.currentTokenLabel'), v: 'A118' },
    { k: t('landing.queue.yourTokenLabel'), v: 'A127' },
    { k: t('landing.queue.farmersAheadLabel'), v: '8' },
    { k: t('landing.queue.estWaitLabel'), v: '35 min' },
  ];

  const statusCards = [
    { label: t('landing.queue.statusActive'), tone: 'green' as const },
    { label: t('landing.queue.statusWaiting'), tone: 'neutral' as const },
    { label: t('landing.queue.statusCounters'), tone: 'neutral' as const },
    { label: t('landing.queue.statusModerate'), tone: 'amber' as const },
  ];

  return (
    <section ref={ref} id="queue" className="relative z-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.queue.kicker')}</p>
        <h2 className="lp-h2 mt-4 max-w-[26ch] text-[var(--lp-ink)]">{t('landing.queue.title')}</h2>

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
          {/* LEFT — queue card */}
          <div className={`lp-reveal lp-card p-6 sm:p-8 ${shown ? 'is-in' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-lg font-extrabold text-[var(--lp-ink)]">Amer Procurement Centre</p>
              <span className="flex items-center gap-1.5 rounded-full bg-[var(--lp-green-500)]/10 px-3 py-1 text-xs font-bold text-[var(--lp-green-700)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--lp-green-500)]" /> {t('landing.queue.openLabel')}
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.k} className="rounded-xl bg-[var(--lp-paper)] p-3.5">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--lp-ink)]/45">
                    {s.k}
                  </p>
                  <p className="mt-1 text-lg font-extrabold text-[var(--lp-ink)]">{s.v}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <p className="text-xs font-bold uppercase tracking-widest text-[var(--lp-ink)]/45">
                {t('landing.queue.progressLabel')}
              </p>
              <div className="mt-4 flex items-center">
                {TOKENS.map((tk, i) => {
                  const isYou = tk === 'A127';
                  const isCurrent = tk === 'A118';
                  return (
                    <div key={tk} className="flex flex-1 items-center last:flex-none">
                      <div
                        className="lp-token grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-extrabold sm:h-12 sm:w-12 sm:text-sm"
                        style={{
                          background: isYou ? 'var(--lp-green-500)' : isCurrent ? 'var(--lp-ink)' : 'var(--lp-paper-2)',
                          color: isYou || isCurrent ? '#fff' : 'var(--lp-ink)',
                          transform: isCurrent && pulse ? 'scale(1.08)' : 'scale(1)',
                        }}
                      >
                        {tk}
                      </div>
                      {i < TOKENS.length - 1 && (
                        <div className="h-0.5 flex-1 bg-[var(--lp-line)]" aria-hidden />
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-[var(--lp-ink)]/50">{t('landing.queue.note')}</p>
            </div>
          </div>

          {/* RIGHT — centre image + status cards */}
          <div className={`lp-reveal overflow-hidden rounded-[1.25rem] ${shown ? 'is-in' : ''}`} style={{ transitionDelay: '120ms' }}>
            <div
              className="relative h-full min-h-[320px] bg-cover bg-center"
              style={{ backgroundImage: `url(${LANDING_IMAGES.grainWarehouse})` }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(180deg, rgba(11,31,18,0.15) 0%, rgba(11,31,18,0.85) 100%)',
                }}
                aria-hidden
              />
              <div className="relative flex h-full flex-col justify-end gap-3 p-6">
                {statusCards.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2.5 rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-bold text-white backdrop-blur-sm"
                  >
                    {s.tone === 'green' ? (
                      <Activity className="h-4 w-4 text-[var(--lp-leaf)]" />
                    ) : (
                      <Users className="h-4 w-4 text-white/70" />
                    )}
                    {s.label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
