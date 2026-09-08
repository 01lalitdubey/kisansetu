import { ArrowRight, CheckCircle2, Sparkles, TrendingDown } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';

export function AIRecommendationPanel() {
  const { t } = useT();
  const rec = useAppStore((s) => s.activeRecommendation);
  const apply = useAppStore((s) => s.applyRecommendation);

  if (!rec) {
    return (
      <div className="card border-2 border-dashed border-kisan-200 p-6 text-center">
        <Sparkles className="mx-auto h-6 w-6 text-kisan-400" />
        <p className="mt-2 text-sm font-medium text-kisan-600">{t('officer.noRecommendation')}</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden border-2 border-kisan-300">
      <div className="flex items-center gap-2 bg-kisan-500 px-5 py-3 text-white">
        <Sparkles className="h-5 w-5" />
        <h3 className="text-base font-extrabold">🤖 {t('officer.aiRecommendation')}</h3>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-base font-semibold text-kisan-900">
          {t('officer.predictedExceed', {
            center: rec.fromCenterName,
            percent: rec.overflowPercent,
          })}
        </p>

        <div className="rounded-xl bg-kisan-50 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-kisan-600">
            {t('officer.recommendedAction')}
          </p>
          <p className="mt-1 flex flex-wrap items-center gap-1.5 text-base font-bold text-kisan-900">
            {rec.fromCenterName}
            <ArrowRight className="h-4 w-4 text-kisan-500" />
            {rec.toCenterName}
          </p>
          <p className="mt-1 text-sm text-kisan-700">
            {t('officer.redirect', { count: rec.redirectFarmers, center: rec.toCenterName })}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl bg-white p-3 shadow-card">
            <p className="text-xs font-semibold text-kisan-600">{t('officer.before')}</p>
            <p className="mt-1 text-xl font-extrabold text-red-600">
              {rec.waitBeforeMinutes} {t('common.min')}
            </p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-card">
            <p className="text-xs font-semibold text-kisan-600">{t('officer.after')}</p>
            <p className="mt-1 text-xl font-extrabold text-kisan-600">
              {rec.waitAfterMinutes} {t('common.min')}
            </p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-card">
            <p className="flex items-center justify-center gap-1 text-xs font-semibold text-kisan-600">
              <TrendingDown className="h-3.5 w-3.5" /> {t('officer.potentialReduction')}
            </p>
            <p className="mt-1 text-xl font-extrabold text-kisan-700">{rec.reductionPercent}%</p>
          </div>
        </div>

        {rec.applied ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-kisan-100 py-3 text-sm font-bold text-kisan-700">
            <CheckCircle2 className="h-5 w-5" /> {t('officer.appliedToast')}
          </div>
        ) : (
          <button className="btn-primary w-full text-lg" onClick={apply}>
            {t('officer.applyRecommendation')}
          </button>
        )}
      </div>
    </div>
  );
}
