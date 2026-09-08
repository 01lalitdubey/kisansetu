import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, Building2, Clock, Hourglass, ShieldAlert, TrendingUp, UserCheck, Users } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { centerApi, analyticsApi, queueApi } from '../../services/api';
import { MetricCard } from '../../components/common/MetricCard';
import { DemoControls } from '../../components/officer/DemoControls';
import { AIRecommendationPanel } from '../../components/officer/AIRecommendationPanel';
import { CenterMapPanel } from '../../components/common/MapsLink';
import { ProgressBar } from '../../components/common/ProgressBar';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Spinner } from '../../components/common/Feedback';

interface MyCenter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isSeed: boolean;
  capacity: number;
  currentQueue: number;
  farmersServed: number;
  activeCounters: number;
  predictedWait: number;
  addressLine?: string | null;
  city?: string | null;
  district?: string | null;
  supportedCrops?: string[];
}
interface CenterAnalytics {
  tokensIssued: number;
  procurementsCompleted: number;
  totalPaymentValue: number;
}
interface QueueSnap {
  currentlyServing: string | null;
  nextToken: string | null;
  farmersAhead: number;
  estimatedWait: number;
}

export default function OfficerDashboard() {
  const { t } = useT();
  const backendEnabled = useAppStore((s) => s.backendEnabled);
  const authRole = useAppStore((s) => s.authRole);
  const refreshRecommendation = useAppStore((s) => s.refreshRecommendation);

  const [center, setCenter] = useState<MyCenter | null>(null);
  const [analytics, setAnalytics] = useState<CenterAnalytics | null>(null);
  const [queue, setQueue] = useState<QueueSnap | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    if (!backendEnabled) {
      setLoading(false);
      return;
    }
    setErr(null);
    try {
      const c = (await centerApi.mine()) as MyCenter;
      setCenter(c);
      if (c.approvalStatus === 'APPROVED') {
        const [a, q] = await Promise.all([analyticsApi.center(c.id), queueApi.get(c.id)]);
        setAnalytics(a as CenterAnalytics);
        setQueue(q as QueueSnap);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load your centre');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    void refreshRecommendation();
    const id = window.setInterval(load, 8000); // near-real-time
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendEnabled, authRole]);

  if (loading) return <Spinner label="Loading your centre…" />;

  if (err || !center) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-white">{t('officer.commandCenter')}</h1>
        <div className="card p-8 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-2 font-bold text-kisan-900">No procurement centre linked to this account</p>
          <p className="mt-1 text-sm text-kisan-600">{err ?? 'Register a centre to get started.'}</p>
          <Link to="/officer/register" className="btn-primary mt-4">
            Register a procurement centre
          </Link>
        </div>
      </div>
    );
  }

  if (center.approvalStatus !== 'APPROVED') {
    const label =
      center.approvalStatus === 'PENDING_APPROVAL'
        ? 'Awaiting admin approval'
        : center.approvalStatus === 'REJECTED'
          ? 'Registration rejected'
          : 'Centre suspended';
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-white">{center.name}</h1>
        <div className="card p-8 text-center">
          <Hourglass className="mx-auto h-8 w-8 text-amber-500" />
          <p className="mt-2 text-lg font-extrabold text-kisan-900">{label}</p>
          <p className="mt-1 text-sm text-kisan-600">
            {center.approvalStatus === 'PENDING_APPROVAL'
              ? 'An admin will review your centre shortly. Live queue, farmers, history and analytics unlock after approval.'
              : 'Contact the administrator for details.'}
          </p>
          <p className="mt-3 text-xs text-kisan-500">
            {[center.addressLine, center.city, center.district].filter(Boolean).join(', ')}
          </p>
        </div>
      </div>
    );
  }

  const utilization = Math.round((center.farmersServed / Math.max(1, center.capacity)) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">{center.name}</h1>
          <p className="mt-0.5 text-sm text-white/60">
            {[center.addressLine, center.city, center.district].filter(Boolean).join(', ')}
          </p>
        </div>
        <StatusBadge variant={center.status === 'ACTIVE' ? 'active' : 'paused'} label={center.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={Users} label="Farmers in queue" value={center.currentQueue} />
        <MetricCard icon={UserCheck} label="Farmers served" value={center.farmersServed} tone="good" />
        <MetricCard icon={Building2} label="Active counters" value={center.activeCounters} />
        <MetricCard
          icon={Clock}
          label="Predicted wait"
          value={`${center.predictedWait} ${t('common.min')}`}
          tone={center.predictedWait > 60 ? 'warn' : 'default'}
        />
        <MetricCard icon={AlarmClock} label="Tokens issued" value={analytics?.tokensIssued ?? '—'} />
        <MetricCard
          icon={TrendingUp}
          label="Procurements done"
          value={analytics?.procurementsCompleted ?? '—'}
          tone="good"
        />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between text-sm font-semibold text-kisan-700">
          <span>Capacity utilisation</span>
          <span>
            {center.farmersServed} / {center.capacity} ({utilization}%)
          </span>
        </div>
        <ProgressBar className="mt-2" value={center.farmersServed} max={center.capacity} />
        {queue && (
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <Mini label="Now serving" value={queue.currentlyServing ?? '—'} />
            <Mini label="Next" value={queue.nextToken ?? '—'} />
            <Mini label="Waiting" value={String(queue.farmersAhead)} />
            <Mini label="Est. wait" value={`${queue.estimatedWait} min`} />
          </div>
        )}
        <Link to="/officer/queue" className="btn-primary mt-4 w-full">
          Manage live queue
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DemoControls />
        <AIRecommendationPanel />
      </div>

      <CenterMapPanel
        center={{
          id: center.id,
          name: center.name,
          latitude: center.latitude,
          longitude: center.longitude,
          addressLine: center.addressLine,
          city: center.city,
          district: center.district,
          status: center.status,
        }}
      />
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-kisan-50 p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-kisan-500">{label}</p>
      <p className="mt-0.5 text-lg font-extrabold text-kisan-900">{value}</p>
    </div>
  );
}
