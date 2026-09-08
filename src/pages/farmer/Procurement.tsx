import { CheckCircle2, Circle, Clock, Info, Users, Wheat } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore, selectSelectedCenter } from '../../store/appStore';
import { StatusBadge } from '../../components/common/StatusBadge';

const statusStyles = {
  completed: 'bg-kisan-100 text-kisan-700',
  active: 'bg-amber-100 text-amber-800 ring-2 ring-amber-300',
  upcoming: 'bg-gray-100 text-gray-500',
} as const;

export default function FarmerProcurement() {
  const { t } = useT();
  const center = useAppStore(selectSelectedCenter);
  const schedule = useAppStore((s) => s.schedule);

  const remaining = Math.max(0, center.capacity - center.served);
  const stats = [
    { label: t('procurement.farmersServed'), value: center.served, icon: Users },
    { label: t('procurement.remainingCapacity'), value: remaining, icon: Wheat },
    {
      label: t('procurement.avgWait'),
      value: `${center.predictedWaitMinutes} ${t('common.min')}`,
      icon: Clock,
    },
    { label: t('procurement.currentQueue'), value: center.queueLength, icon: Users },
  ];

  const statusLabel = {
    completed: t('procurement.completed'),
    active: t('procurement.active'),
    upcoming: t('procurement.upcoming'),
  };

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-kisan-900">{t('procurement.title')}</h1>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <p className="text-lg font-bold text-kisan-900">{center.name}</p>
          <StatusBadge variant="active" label={t('status.ACTIVE')} />
        </div>

        <h2 className="mt-5 text-sm font-bold uppercase tracking-wide text-kisan-600">
          {t('procurement.schedule')}
        </h2>
        <ul className="mt-3 space-y-2">
          {schedule.map((slot) => (
            <li
              key={slot.time}
              className="flex items-center justify-between rounded-xl border border-kisan-100 px-4 py-3"
            >
              <span className="text-base font-bold text-kisan-900">{slot.time}</span>
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${statusStyles[slot.status]}`}
              >
                {statusLabel[slot.status]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-kisan-600">
              <Icon className="h-4 w-4" /> {label}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-kisan-900">{value}</p>
          </div>
        ))}
      </div>

      {/* Document checklist */}
      <div className="card p-5">
        <h2 className="text-lg font-extrabold text-kisan-900">{t('procurement.beforeYouVisit')}</h2>
        <ul className="mt-3 space-y-2.5">
          {t.list('procurement.checklist').map((item, i) => (
            <li key={item} className="flex items-center gap-3 text-base text-kisan-800">
              {i < 4 ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-kisan-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-kisan-300" />
              )}
              {item}
            </li>
          ))}
        </ul>
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-kisan-50 p-3 text-sm text-kisan-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {t('procurement.checklistNote')}
        </p>
      </div>
    </div>
  );
}
