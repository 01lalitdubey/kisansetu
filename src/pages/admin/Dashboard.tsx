import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Banknote,
  Building2,
  IndianRupee,
  Lightbulb,
  Timer,
  TrendingUp,
  Truck,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { CheckCircle2, ShieldX, XCircle } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { MetricCard } from '../../components/common/MetricCard';
import { DemoBadge, PrototypeNote } from '../../components/common/DemoBadge';
import { useBackendResource } from '../../services/useBackendResource';
import { adminApi, centerApi } from '../../services/api';
import {
  adminMetrics,
  aiInsights,
  centerPerformance,
  procurementByCrop,
} from '../../data/analytics';

interface TransportOverview {
  transportBookings: number;
  transportValue: number;
  platformFees: number;
  paidAmount: number;
  pendingAmount: number;
  successfulPayments: number;
  pendingPayments: number;
}
const DEMO_TRANSPORT: TransportOverview = {
  transportBookings: 184,
  transportValue: 320000,
  platformFees: 3200,
  paidAmount: 290000,
  pendingAmount: 30000,
  successfulPayments: 176,
  pendingPayments: 8,
};

const axis = { fontSize: 12, fill: '#4a3d2f' };

const inr = (n: number) =>
  n >= 1e7 ? `₹${(n / 1e7).toFixed(1)} Cr` : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)} L` : `₹${n.toLocaleString('en-IN')}`;

interface CenterRow {
  id: string;
  name: string;
  district?: string | null;
  status: string;
  approvalStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  isSeed: boolean;
  farmersServed: number;
  utilization: number;
}

export default function AdminDashboard() {
  const { t } = useT();
  const admin = useAppStore((s) => s.admin);
  const refreshAdmin = useAppStore((s) => s.refreshAdmin);
  const backendEnabled = useAppStore((s) => s.backendEnabled);
  const [approving, setApproving] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (backendEnabled) void refreshAdmin();
  }, [backendEnabled, refreshAdmin, tick]);

  const { data: transport } = useBackendResource<TransportOverview>(
    () => adminApi.transportOverview() as Promise<TransportOverview>,
    DEMO_TRANSPORT,
    [tick],
  );

  const { data: allCenters } = useBackendResource<CenterRow[]>(
    () => adminApi.centers() as Promise<CenterRow[]>,
    [],
    [tick],
  );
  const pending = allCenters.filter((c) => c.approvalStatus !== 'APPROVED');

  async function decide(id: string, action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REINSTATE') {
    setApproving(id);
    try {
      await centerApi.setApproval(id, action);
      setTick((n) => n + 1);
    } finally {
      setApproving(null);
    }
  }

  const o = admin.overview as
    | {
        totalCenters: number;
        totalFarmers: number;
        totalProcurement: number;
        completedProcurements?: number;
        activeTokens?: number;
        pendingCenters?: number;
        transportBookings?: number;
        totalPaymentValue: number;
        averageWaitingTime: number;
        activeCenters: number;
      }
    | null;

  const metrics = o
    ? {
        totalCenters: `${o.totalCenters}${o.pendingCenters ? ` (${o.pendingCenters} pending)` : ''}`,
        totalFarmers: o.totalFarmers.toLocaleString('en-IN'),
        totalProcurement: `${(o.completedProcurements ?? 0).toLocaleString('en-IN')} / ${o.totalProcurement.toLocaleString('en-IN')}`,
        paymentValue: inr(o.totalPaymentValue),
        avgWait: o.averageWaitingTime,
        activeCenters: `${o.activeCenters} / ${o.totalCenters}`,
      }
    : {
        totalCenters: String(adminMetrics.totalCenters),
        totalFarmers: adminMetrics.totalFarmers.toLocaleString(),
        totalProcurement: adminMetrics.totalProcurement.toLocaleString(),
        paymentValue: adminMetrics.paymentValue,
        avgWait: adminMetrics.avgWait,
        activeCenters: `${adminMetrics.activeCenters} / ${adminMetrics.totalCenters}`,
      };

  const cropData =
    admin.series.crop && admin.series.crop.length
      ? (admin.series.crop as { crop: string; value: number; color: string }[])
      : procurementByCrop;

  const centerPerf =
    admin.centers && admin.centers.length
      ? (admin.centers as { name: string; farmersServed: number }[]).map((c) => ({
          center: c.name,
          served: c.farmersServed,
        }))
      : centerPerformance;

  const insights = admin.insights.length ? admin.insights : aiInsights;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">{t('admin.title')}</h1>
          <p className="mt-0.5 text-sm text-white/60">{t('admin.subtitle')}</p>
        </div>
        <DemoBadge />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard icon={Building2} label={t('admin.totalCenters')} value={metrics.totalCenters} />
        <MetricCard icon={Users} label={t('admin.totalFarmers')} value={metrics.totalFarmers} />
        <MetricCard
          icon={TrendingUp}
          label={t('admin.totalProcurement')}
          value={metrics.totalProcurement}
          sub="quintals lots"
        />
        <MetricCard
          icon={IndianRupee}
          label={t('admin.paymentValue')}
          value={metrics.paymentValue}
          tone="good"
        />
        <MetricCard
          icon={Timer}
          label={t('admin.avgWait')}
          value={`${metrics.avgWait} ${t('common.min')}`}
        />
        <MetricCard
          icon={Building2}
          label={t('admin.activeCenters')}
          value={metrics.activeCenters}
          tone="good"
        />
      </div>

      <PrototypeNote />

      {/* Transport & payment overview (Change 20) */}
      <div className="card p-5">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-kisan-900">
          <Truck className="h-5 w-5 text-kisan-500" /> Transport &amp; Payments
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <Mini label="Transport Bookings" value={transport.transportBookings.toLocaleString('en-IN')} />
          <Mini label="Transport Value" value={inr(transport.transportValue)} />
          <Mini label="Platform Fees" value={inr(transport.platformFees)} />
          <Mini label="Paid" value={inr(transport.paidAmount)} tone="good" />
          <Mini label="Pending" value={inr(transport.pendingAmount)} tone="warn" />
        </div>
        <p className="mt-3 text-xs text-amber-700">
          Real payment records. Payments are collected via Stripe (1% KisanSetu service fee) and only
          marked paid after backend verification.
        </p>
      </div>

      {/* Centre approvals (Change 6 / 25) */}
      <div className="card p-5">
        <h3 className="flex items-center gap-2 text-base font-extrabold text-kisan-900">
          <ShieldX className="h-5 w-5 text-kisan-500" /> Centre Approvals
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
              {pending.length} pending
            </span>
          )}
        </h3>
        {pending.length === 0 ? (
          <p className="mt-2 text-sm text-kisan-600">
            No centres awaiting review. Officer-registered centres appear here for approval.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-kisan-100 p-3"
              >
                <div>
                  <p className="font-bold text-kisan-900">{c.name}</p>
                  <p className="text-xs text-kisan-500">
                    {c.district ?? '—'} · {c.approvalStatus.replace(/_/g, ' ').toLowerCase()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {c.approvalStatus === 'PENDING_APPROVAL' && (
                    <>
                      <button
                        onClick={() => decide(c.id, 'APPROVE')}
                        disabled={approving === c.id}
                        className="btn bg-kisan-500 px-3 py-1.5 text-sm text-white hover:bg-kisan-600"
                      >
                        <CheckCircle2 className="h-4 w-4" /> Approve
                      </button>
                      <button
                        onClick={() => decide(c.id, 'REJECT')}
                        disabled={approving === c.id}
                        className="btn border border-red-200 bg-white px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4" /> Reject
                      </button>
                    </>
                  )}
                  {(c.approvalStatus === 'REJECTED' || c.approvalStatus === 'SUSPENDED') && (
                    <button
                      onClick={() => decide(c.id, 'REINSTATE')}
                      disabled={approving === c.id}
                      className="btn-secondary px-3 py-1.5 text-sm"
                    >
                      Reinstate
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-base font-extrabold text-kisan-900">{t('admin.centerPerformance')}</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={centerPerf} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6efe1" />
                <XAxis type="number" tick={axis} />
                <YAxis
                  type="category"
                  dataKey="center"
                  tick={axis}
                  width={130}
                  tickFormatter={(v: string) => v.replace(' Procurement Center', '').replace(' Center', '')}
                />
                <Tooltip />
                <Bar dataKey="served" fill="#16a34a" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-base font-extrabold text-kisan-900">{t('admin.procurementStats')}</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={cropData}
                  dataKey="value"
                  nameKey="crop"
                  outerRadius={95}
                  label={(e: { crop: string }) => e.crop}
                >
                  {cropData.map((c) => (
                    <Cell key={c.crop} fill={c.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-kisan-900">
            <Lightbulb className="h-5 w-5 text-kisan-500" /> {t('admin.aiInsights')}
          </h3>
          <ul className="mt-3 space-y-2.5">
            {insights.map((i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-kisan-50 p-3 text-sm text-kisan-800">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-kisan-500 text-[11px] font-bold text-white">
                  AI
                </span>
                {i}
              </li>
            ))}
          </ul>
        </div>

        <div className="card p-5">
          <h3 className="flex items-center gap-2 text-base font-extrabold text-kisan-900">
            <Banknote className="h-5 w-5 text-kisan-500" /> {t('admin.paymentOverview')}
          </h3>
          <dl className="mt-3 divide-y divide-kisan-100">
            {[
              ['Payments disbursed', '₹15.1 Cr'],
              ['Pending settlement', '₹3.3 Cr'],
              ['Avg. payment / farmer', '₹14,750'],
              ['Direct bank transfers', '98.2%'],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-3">
                <dt className="text-sm text-kisan-600">{k}</dt>
                <dd className="text-base font-extrabold text-kisan-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'good' | 'warn';
}) {
  const color =
    tone === 'good' ? 'text-kisan-700' : tone === 'warn' ? 'text-amber-700' : 'text-kisan-900';
  return (
    <div className="rounded-xl bg-kisan-50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-kisan-500">{label}</p>
      <p className={`mt-1 text-lg font-extrabold ${color}`}>{value}</p>
    </div>
  );
}
