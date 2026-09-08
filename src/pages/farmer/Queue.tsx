import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Pause, Play, Radio, Users } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { StatusBadge } from '../../components/common/StatusBadge';

export default function FarmerQueue() {
  const { t } = useT();
  const queue = useAppStore((s) => s.farmerQueue);
  const tick = useAppStore((s) => s.tickFarmerQueue);
  const setRunning = useAppStore((s) => s.setFarmerQueueRunning);
  const token = useAppStore((s) => s.token);
  const timer = useRef<number | null>(null);

  // Pull the queue once on open (backend fetch or mock advance).
  useEffect(() => {
    void tick();
  }, [tick]);

  // Real-time feed — polls the backend (or advances the mock) every 5–10 s.
  useEffect(() => {
    if (!queue.running) return;
    function schedule() {
      const delay = 5000 + Math.random() * 5000;
      timer.current = window.setTimeout(() => {
        void tick();
        schedule();
      }, delay);
    }
    schedule();
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, [queue.running, tick]);

  const yourToken = token?.status === 'ACTIVE' ? token.id : queue.yourToken;
  const servingNum = parseInt(queue.nowServing.replace(/\D/g, ''), 10);

  const visible = queue.upcoming.slice(0, 12);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-kisan-900">{t('queue.title')}</h1>
        <StatusBadge
          variant={queue.running ? 'active' : 'paused'}
          label={queue.running ? t('queue.procurementActive') : t('status.PAUSED')}
        />
      </div>

      <div className="card p-5">
        <p className="text-base font-bold text-kisan-900">{queue.centerName}</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-sm text-kisan-600">
          <Radio className="h-4 w-4 text-kisan-500" /> {t('queue.liveNote')}
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-kisan-800 p-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {t('queue.nowServing')}
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-wider">{queue.nowServing}</p>
          </div>
          <div className="rounded-xl border-2 border-kisan-300 bg-kisan-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-kisan-600">
              {t('queue.yourToken')}
            </p>
            <p className="mt-1 text-4xl font-extrabold tracking-wider text-kisan-900">
              {yourToken ?? '—'}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-kisan-600">
              <Users className="h-4 w-4" /> {t('queue.farmersAhead')}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-kisan-900">{queue.farmersAhead}</p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-card">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-kisan-600">
              <Clock className="h-4 w-4" /> {t('queue.estimatedWait')}
            </p>
            <p className="mt-1 text-2xl font-extrabold text-kisan-900">
              {queue.estimatedWaitMinutes} {t('common.min')}
            </p>
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          {queue.running ? (
            <button className="btn-secondary flex-1" onClick={() => setRunning(false)}>
              <Pause className="h-4 w-4" /> {t('queue.pause')}
            </button>
          ) : (
            <button className="btn-primary flex-1" onClick={() => setRunning(true)}>
              <Play className="h-4 w-4" /> {t('queue.resume')}
            </button>
          )}
        </div>
      </div>

      {/* Token flow strip */}
      <div className="card p-5">
        <p className="text-sm font-bold text-kisan-800">{t('queue.upNext')}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {visible.map((tk) => {
            const n = parseInt(tk.replace(/\D/g, ''), 10);
            const isYou = tk === yourToken;
            const isServing = n === servingNum;
            return (
              <span
                key={tk}
                className={`rounded-lg px-3 py-1.5 text-sm font-bold ${
                  isServing
                    ? 'bg-kisan-800 text-white'
                    : isYou
                      ? 'bg-kisan-100 text-kisan-800 ring-2 ring-kisan-400'
                      : n < servingNum
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

      {!yourToken && (
        <Link to="/farmer/dashboard" className="btn-primary w-full">
          {t('common.book')}
        </Link>
      )}
    </div>
  );
}
