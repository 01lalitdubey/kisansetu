import { Clock, Users } from 'lucide-react';
import type { ProcurementCenter } from '../../types';
import { useT } from '../../i18n';
import { ProgressBar } from '../common/ProgressBar';
import { StatusBadge } from '../common/StatusBadge';

export function CenterCard({
  center,
  onClick,
  selected,
}: {
  center: ProcurementCenter;
  onClick?: () => void;
  selected?: boolean;
}) {
  const { t } = useT();
  const utilization = Math.round((center.served / center.capacity) * 100);

  const badge =
    center.load === 'high'
      ? { variant: 'high' as const, label: t('status.HIGH_LOAD') }
      : center.load === 'low'
        ? { variant: 'low' as const, label: t('status.LOW_LOAD') }
        : { variant: 'active' as const, label: t('status.ACTIVE') };

  const statusText =
    center.load === 'high'
      ? t('officer.statusOverloaded')
      : center.load === 'low'
        ? t('officer.statusAvailable')
        : t('officer.statusNormal');

  return (
    <button
      onClick={onClick}
      className={`card w-full p-5 text-left transition-shadow hover:shadow-lift ${
        selected ? 'ring-2 ring-kisan-400' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-base font-extrabold text-kisan-900">{center.name}</p>
          <p className="text-xs text-kisan-500">{center.district}</p>
        </div>
        <StatusBadge variant={badge.variant} label={badge.label} />
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-sm font-semibold text-kisan-700">
          <span>{t('officer.capacity')}</span>
          <span>
            {center.served} / {center.capacity}
          </span>
        </div>
        <ProgressBar className="mt-1.5" value={center.served} max={center.capacity} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-kisan-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-kisan-600">
            <Users className="h-3.5 w-3.5" /> {t('officer.queue')}
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-kisan-900">{center.queueLength}</p>
        </div>
        <div className="rounded-xl bg-kisan-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-kisan-600">
            <Clock className="h-3.5 w-3.5" /> {t('officer.predictedWait')}
          </p>
          <p className="mt-0.5 text-xl font-extrabold text-kisan-900">
            {center.predictedWaitMinutes} {t('common.min')}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm font-bold text-kisan-700">
        {statusText} · {utilization}% {t('charts.utilization').toLowerCase()}
      </p>
    </button>
  );
}
