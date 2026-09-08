import type { ReactElement } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useT } from '../../i18n';
import {
  avgWaitingTime as mockWait,
  centerUtilization as mockUtil,
  dailyFarmersServed as mockServed,
  peakHours as mockPeak,
  procurementByCrop as mockCrop,
} from '../../data/analytics';
import { PrototypeNote } from '../../components/common/DemoBadge';
import { useBackendResource } from '../../services/useBackendResource';
import { analyticsApi } from '../../services/api';

function ChartCard({ title, children }: { title: string; children: ReactElement }) {
  return (
    <div className="card p-5">
      <h3 className="text-base font-extrabold text-kisan-900">{title}</h3>
      <div className="mt-4 h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const axis = { fontSize: 12, fill: '#4a3d2f' };

type Series = Record<string, string | number>[];

export default function OfficerAnalytics() {
  const { t } = useT();

  const { data: dailyFarmersServed } = useBackendResource<Series>(
    () => analyticsApi.farmersServed() as Promise<Series>,
    mockServed as Series,
  );
  const { data: avgWaitingTime } = useBackendResource<Series>(
    () => analyticsApi.waitingTime() as Promise<Series>,
    mockWait as Series,
  );
  const { data: centerUtilization } = useBackendResource<{ center: string; utilization: number }[]>(
    () => analyticsApi.centerUtilization() as Promise<{ center: string; utilization: number }[]>,
    mockUtil,
  );
  const { data: procurementByCrop } = useBackendResource<{ crop: string; value: number; color: string }[]>(
    () => analyticsApi.cropProcurement() as Promise<{ crop: string; value: number; color: string }[]>,
    mockCrop,
  );
  const { data: peakHours } = useBackendResource<Series>(
    () => analyticsApi.peakHours() as Promise<Series>,
    mockPeak as Series,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">{t('officer.analyticsTitle')}</h1>
        <p className="mt-0.5 text-sm text-white/60">Last 7 days · simulated</p>
      </div>

      <PrototypeNote />

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title={t('charts.dailyFarmers')}>
          <LineChart data={dailyFarmersServed}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6efe1" />
            <XAxis dataKey="day" tick={axis} />
            <YAxis tick={axis} />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="served"
              stroke="#16a34a"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartCard>

        <ChartCard title={t('charts.avgWait')}>
          <LineChart data={avgWaitingTime}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6efe1" />
            <XAxis dataKey="day" tick={axis} />
            <YAxis tick={axis} unit="m" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="minutes"
              stroke="#d97706"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ChartCard>

        <ChartCard title={t('charts.utilization')}>
          <BarChart data={centerUtilization}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6efe1" />
            <XAxis dataKey="center" tick={axis} interval={0} angle={-12} textAnchor="end" height={50} />
            <YAxis tick={axis} unit="%" />
            <Tooltip />
            <Bar dataKey="utilization" radius={[6, 6, 0, 0]}>
              {centerUtilization.map((c) => (
                <Cell
                  key={c.center}
                  fill={c.utilization >= 90 ? '#dc2626' : c.utilization <= 40 ? '#16a34a' : '#d97706'}
                />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        <ChartCard title={t('charts.byCrop')}>
          <PieChart>
            <Pie
              data={procurementByCrop}
              dataKey="value"
              nameKey="crop"
              innerRadius={55}
              outerRadius={90}
              paddingAngle={2}
            >
              {procurementByCrop.map((c) => (
                <Cell key={c.crop} fill={c.color} />
              ))}
            </Pie>
            <Legend />
            <Tooltip />
          </PieChart>
        </ChartCard>

        <ChartCard title={t('charts.peakHours')}>
          <BarChart data={peakHours}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6efe1" />
            <XAxis dataKey="hour" tick={axis} />
            <YAxis tick={axis} />
            <Tooltip />
            <Bar dataKey="farmers" fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartCard>
      </div>
    </div>
  );
}
