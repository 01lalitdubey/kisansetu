import { useEffect } from 'react';
import { Lightbulb } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { AIRecommendationPanel } from '../../components/officer/AIRecommendationPanel';
import { DemoControls } from '../../components/officer/DemoControls';
import { aiInsights } from '../../data/analytics';
import { PrototypeNote } from '../../components/common/DemoBadge';

export default function OfficerRecommendations() {
  const { t } = useT();
  const refreshRecommendation = useAppStore((s) => s.refreshRecommendation);
  const centers = useAppStore((s) => s.centers);

  useEffect(() => {
    refreshRecommendation();
  }, [refreshRecommendation, centers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">{t('nav.recommendations')}</h1>
        <p className="mt-0.5 text-sm text-white/60">AI load balancing &amp; optimisation</p>
      </div>

      <PrototypeNote />

      <div className="grid gap-6 lg:grid-cols-2">
        <AIRecommendationPanel />
        <DemoControls />
      </div>

      <div className="card p-5">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-kisan-900">
          <Lightbulb className="h-5 w-5 text-kisan-500" /> {t('admin.aiInsights')}
        </h3>
        <ul className="mt-3 space-y-2.5">
          {aiInsights.map((insight) => (
            <li
              key={insight}
              className="flex items-start gap-3 rounded-xl bg-kisan-50 p-3 text-sm text-kisan-800"
            >
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-kisan-500 text-[11px] font-bold text-white">
                AI
              </span>
              {insight}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
