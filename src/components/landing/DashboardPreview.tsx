import { Clock, MapPin, Ticket, Users } from 'lucide-react';
import { useT } from '../../i18n';
import { useReveal } from './hooks';

export function DashboardPreview() {
  const { ref, shown } = useReveal<HTMLElement>({ threshold: 0.15 });
  const { t } = useT();

  return (
    <section ref={ref} className="relative z-20 py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
          <div>
            <p className="lp-kicker text-[var(--lp-green-700)]">{t('landing.dashboardPreview.kicker')}</p>
            <h2 className="lp-h2 mt-4 max-w-[16ch] text-[var(--lp-ink)]">{t('landing.dashboardPreview.title')}</h2>
            <p className="lp-lead mt-5 max-w-md text-[var(--lp-ink)]/65">{t('landing.dashboardPreview.subtitle')}</p>
          </div>

          <div className={`lp-reveal ${shown ? 'is-in' : ''}`}>
            <div className="lp-browser-frame mx-auto max-w-xl">
              <div className="lp-browser-bar">
                <span className="lp-browser-dot" />
                <span className="lp-browser-dot" />
                <span className="lp-browser-dot" />
                <span className="ml-3 rounded-md bg-white px-3 py-1 text-[11px] font-medium text-[var(--lp-ink)]/50">
                  kisansetu.ai/farmer/dashboard
                </span>
              </div>

              <div className="bg-[var(--lp-paper)] p-5 sm:p-6">
                <p className="text-lg font-extrabold tracking-tight text-[var(--lp-ink)]">
                  {t('landing.dashboardPreview.mockGreeting', { name: 'Rajesh' })}
                </p>
                <p className="mt-0.5 text-sm text-[var(--lp-ink)]/55">{t('landing.dashboardPreview.mockSubtitle')}</p>

                <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--lp-line)] bg-white">
                  <div className="bg-[var(--lp-green-900)] px-5 py-3.5 text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold">{t('landing.dashboardPreview.cropLine')}</span>
                      <span className="rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-bold">
                        {t('landing.dashboardPreview.activeLabel')}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4 p-5">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[var(--lp-green-700)]" />
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--lp-ink)]/45">
                            {t('landing.dashboardPreview.currentCentreLabel')}
                          </p>
                          <p className="text-sm font-bold text-[var(--lp-ink)]">Amer Procurement Centre</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-[var(--lp-green-700)]">
                        <span className="h-2 w-2 rounded-full bg-[var(--lp-green-500)]" />
                        {t('landing.dashboardPreview.openLabel')}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl bg-[var(--lp-paper)] p-3">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--lp-ink)]/45">
                          <Ticket className="h-3 w-3" /> {t('landing.dashboardPreview.queueLabel')}
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-[var(--lp-ink)]">A127</p>
                      </div>
                      <div className="rounded-xl bg-[var(--lp-paper)] p-3">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--lp-ink)]/45">
                          <Users className="h-3 w-3" /> {t('landing.dashboardPreview.aheadLabel')}
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-[var(--lp-ink)]">8</p>
                      </div>
                      <div className="rounded-xl bg-[var(--lp-paper)] p-3">
                        <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--lp-ink)]/45">
                          <Clock className="h-3 w-3" /> {t('landing.dashboardPreview.waitLabel')}
                        </p>
                        <p className="mt-1 text-lg font-extrabold text-[var(--lp-ink)]">35m</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full rounded-xl bg-[var(--lp-green-500)] py-2.5 text-sm font-bold text-white"
                    >
                      {t('landing.dashboardPreview.cta')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
