import { useEffect } from 'react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { CenterCard } from '../../components/officer/CenterCard';
import { CenterMap } from '../../components/officer/CenterMap';
import { PrototypeNote } from '../../components/common/DemoBadge';

export default function OfficerCenters() {
  const { t } = useT();
  const centers = useAppStore((s) => s.centers);
  const setSelectedCenter = useAppStore((s) => s.setSelectedCenter);
  const selectedCenterId = useAppStore((s) => s.selectedCenterId);
  const refreshRecommendation = useAppStore((s) => s.refreshRecommendation);

  useEffect(() => {
    refreshRecommendation();
  }, [refreshRecommendation]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">{t('officer.centersTitle')}</h1>
        <p className="mt-0.5 text-sm text-white/60">{t('nav.centers')}</p>
      </div>

      <PrototypeNote />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {centers.map((c) => (
          <CenterCard
            key={c.id}
            center={c}
            selected={c.id === selectedCenterId}
            onClick={() => setSelectedCenter(c.id)}
          />
        ))}
      </div>

      <CenterMap centers={centers} />
    </div>
  );
}
