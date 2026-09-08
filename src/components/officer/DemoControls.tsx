import {
  CalendarClock,
  ChevronRight,
  RotateCcw,
  SkipForward,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { DemoBadge } from '../common/DemoBadge';

export function DemoControls() {
  const { t } = useT();
  const highDemand = useAppStore((s) => s.simulateHighDemand);
  const queueReduction = useAppStore((s) => s.simulateQueueReduction);
  const scheduleChange = useAppStore((s) => s.simulateScheduleChange);
  const processNext = useAppStore((s) => s.processNextTokenDemo);
  const reset = useAppStore((s) => s.resetDemo);

  const actions = [
    { label: t('officer.demo.highDemand'), icon: TrendingUp, onClick: highDemand, tone: 'warn' },
    {
      label: t('officer.demo.queueReduction'),
      icon: TrendingDown,
      onClick: queueReduction,
      tone: 'good',
    },
    {
      label: t('officer.demo.scheduleChange'),
      icon: CalendarClock,
      onClick: scheduleChange,
      tone: 'good',
    },
    { label: t('officer.demo.processToken'), icon: SkipForward, onClick: processNext, tone: 'good' },
  ] as const;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-extrabold text-kisan-900">{t('officer.demo.title')}</h3>
        <DemoBadge />
      </div>
      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        {actions.map(({ label, icon: Icon, onClick, tone }) => (
          <button
            key={label}
            onClick={onClick}
            className={`flex items-center gap-2 rounded-xl border px-4 py-3 text-left text-sm font-bold transition-colors ${
              tone === 'warn'
                ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                : 'border-kisan-200 bg-kisan-50 text-kisan-800 hover:bg-kisan-100'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight className="h-4 w-4 opacity-50" />
          </button>
        ))}
      </div>
      <button
        onClick={reset}
        className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-kisan-200 px-4 py-3 text-sm font-bold text-kisan-700 hover:bg-kisan-50"
      >
        <RotateCcw className="h-4 w-4" /> {t('officer.demo.reset')}
      </button>
    </div>
  );
}
