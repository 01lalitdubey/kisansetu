import { useEffect } from 'react';
import { CheckCircle2, Clock, Pause, Play, SkipForward, Users } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { StatusBadge } from '../../components/common/StatusBadge';

export default function OfficerQueue() {
  const { t } = useT();
  const queue = useAppStore((s) => s.officerQueue);
  const processNext = useAppStore((s) => s.officerProcessNext);
  const skip = useAppStore((s) => s.officerSkip);
  const markComplete = useAppStore((s) => s.officerMarkComplete);
  const setRunning = useAppStore((s) => s.setOfficerQueueRunning);
  const refreshOfficerQueue = useAppStore((s) => s.refreshOfficerQueue);

  useEffect(() => {
    void refreshOfficerQueue();
  }, [refreshOfficerQueue]);

  const waiting = queue.upcoming.filter(
    (tk) => parseInt(tk.replace(/\D/g, ''), 10) > parseInt(queue.nowServing.replace(/\D/g, ''), 10),
  ).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">{t('officer.queueMgmt')}</h1>
          <p className="mt-0.5 text-sm text-white/60">{queue.centerName}</p>
        </div>
        <StatusBadge
          variant={queue.running ? 'active' : 'paused'}
          label={queue.running ? t('status.ACTIVE') : t('status.PAUSED')}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm font-semibold text-kisan-600">{t('officer.currentToken')}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-wider text-kisan-900">
            {queue.nowServing}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm font-semibold text-kisan-600">{t('officer.nextToken')}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-wider text-kisan-900">
            {queue.nextToken}
          </p>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-kisan-600">
            <Users className="h-4 w-4" /> {t('officer.farmersWaiting')}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-kisan-900">{waiting}</p>
        </div>
        <div className="card p-5">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-kisan-600">
            <Clock className="h-4 w-4" /> {t('officer.avgProcessing')}
          </p>
          <p className="mt-1 text-3xl font-extrabold text-kisan-900">
            {queue.avgProcessingMinutes} {t('common.min')}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button className="btn-primary" onClick={processNext}>
            <SkipForward className="h-4 w-4" /> {t('officer.processNext')}
          </button>
          <button className="btn-secondary" onClick={skip}>
            {t('officer.skip')}
          </button>
          <button className="btn-secondary" onClick={markComplete}>
            <CheckCircle2 className="h-4 w-4" /> {t('officer.markComplete')}
          </button>
          {queue.running ? (
            <button
              className="btn border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
              onClick={() => setRunning(false)}
            >
              <Pause className="h-4 w-4" /> {t('officer.pauseQueue')}
            </button>
          ) : (
            <button className="btn-primary" onClick={() => setRunning(true)}>
              <Play className="h-4 w-4" /> {t('officer.resumeQueue')}
            </button>
          )}
        </div>
      </div>

      <div className="card p-5">
        <p className="text-sm font-bold text-kisan-800">{t('queue.upNext')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {queue.upcoming.slice(0, 20).map((tk) => {
            const n = parseInt(tk.replace(/\D/g, ''), 10);
            const serving = parseInt(queue.nowServing.replace(/\D/g, ''), 10);
            return (
              <span
                key={tk}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  n === serving
                    ? 'bg-kisan-800 text-white'
                    : n < serving
                      ? 'bg-gray-100 text-gray-400 line-through'
                      : 'bg-kisan-50 text-kisan-700'
                }`}
              >
                {tk}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
