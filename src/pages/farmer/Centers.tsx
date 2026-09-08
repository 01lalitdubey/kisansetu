import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, Search, Users } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore, selectSelectedCenter } from '../../store/appStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { MapsButtons, CentersMap } from '../../components/common/MapsLink';

const JAIPUR: [number, number] = [26.9124, 75.7873];
// Fallback coords for common villages when the farmer has no saved location yet.
const VILLAGE_COORDS: Record<string, [number, number]> = {
  bassi: [26.8358, 76.0522],
  chomu: [27.1667, 75.7223],
  sanganer: [26.8189, 75.7924],
  amer: [26.9855, 75.8513],
  bagru: [26.8117, 75.5455],
  jaipur: JAIPUR,
};

function haversineKm(a: [number, number], b: [number, number]): number {
  const R = 6371;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

type Filter = 'all' | 'nearby' | 'low-queue' | 'available';

export default function FarmerCenters() {
  const { t } = useT();
  const navigate = useNavigate();
  const centers = useAppStore((s) => s.centers);
  const selected = useAppStore(selectSelectedCenter);
  const setSelectedCenter = useAppStore((s) => s.setSelectedCenter);
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.farmerProfile) as
    | { latitude?: number | null; longitude?: number | null }
    | null;

  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // Prefer the farmer's REAL saved coordinates for distance.
  const home = useMemo<[number, number]>(() => {
    if (profile?.latitude != null && profile?.longitude != null) {
      return [profile.latitude, profile.longitude];
    }
    const key = (user?.village ?? 'jaipur').toLowerCase().split(',')[0].trim();
    return VILLAGE_COORDS[key] ?? JAIPUR;
  }, [profile?.latitude, profile?.longitude, user?.village]);
  const hasRealHome = profile?.latitude != null && profile?.longitude != null;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return centers
      .map((c) => ({
        ...c,
        distanceKm: Math.round(haversineKm(home, [c.lat, c.lng]) * 10) / 10,
        availableSlots: Math.max(0, c.capacity - c.served),
      }))
      .filter((c) => {
        if (term && !`${c.name} ${c.district}`.toLowerCase().includes(term)) return false;
        if (filter === 'nearby') return c.distanceKm <= 20;
        if (filter === 'low-queue') return c.queueLength <= 20;
        if (filter === 'available') return c.load !== 'high' && c.availableSlots > 0;
        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [centers, q, filter, home]);

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'nearby', label: 'Nearby' },
    { id: 'low-queue', label: 'Low Queue' },
    { id: 'available', label: 'Available' },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-kisan-900">Procurement Centres</h1>
        <p className="mt-0.5 text-kisan-600">Choose where to sell your produce.</p>
      </div>

      <p className="text-xs font-medium text-amber-700">Demo / prototype centre data</p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-kisan-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search procurement centre"
          className="field-input pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              filter === f.id
                ? 'border-kisan-500 bg-kisan-500 text-white'
                : 'border-kisan-200 bg-white text-kisan-700 hover:bg-kisan-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <CentersMap
        centers={rows.map((c) => ({
          id: c.id,
          name: c.name,
          latitude: c.lat,
          longitude: c.lng,
          load: c.load,
          status: c.status,
          queueLength: c.queueLength,
          capacity: c.capacity,
          predictedWaitMinutes: c.predictedWaitMinutes,
          district: c.district,
        }))}
        farmer={hasRealHome ? { latitude: home[0], longitude: home[1] } : null}
        selectedId={selected.id}
        onSelect={(id) => setSelectedCenter(id)}
        height={300}
      />
      <p className="-mt-2 text-xs text-kisan-500">
        Distances are <b>estimated</b> straight-line values from{' '}
        {hasRealHome ? 'your saved location' : 'your village'} — not routed road distance.
        {!hasRealHome && (
          <>
            {' '}
            <button onClick={() => navigate('/farmer/profile')} className="font-semibold text-kisan-600 underline">
              Add your address
            </button>{' '}
            for accurate distances.
          </>
        )}
      </p>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-sm text-kisan-600">No centres match your search.</div>
      ) : (
        <div className="space-y-4">
          {rows.map((c) => {
            const isSelected = c.id === selected.id;
            const badge =
              c.load === 'high'
                ? { variant: 'high' as const, label: t('status.HIGH_LOAD') }
                : c.load === 'low'
                  ? { variant: 'low' as const, label: t('status.LOW_LOAD') }
                  : { variant: 'active' as const, label: t('status.ACTIVE') };
            return (
              <div
                key={c.id}
                className={`card p-5 ${isSelected ? 'ring-2 ring-kisan-400' : ''}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-extrabold text-kisan-900">{c.name}</p>
                    <p className="text-sm text-kisan-500">
                      {c.district} · ~{c.distanceKm} km away
                    </p>
                  </div>
                  <StatusBadge variant={badge.variant} label={badge.label} />
                </div>

                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-kisan-50 p-2.5">
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-kisan-600">
                      <Users className="h-3.5 w-3.5" /> Queue
                    </p>
                    <p className="mt-0.5 text-lg font-extrabold text-kisan-900">{c.queueLength}</p>
                  </div>
                  <div className="rounded-xl bg-kisan-50 p-2.5">
                    <p className="flex items-center gap-1 text-[11px] font-semibold text-kisan-600">
                      <Clock className="h-3.5 w-3.5" /> Wait
                    </p>
                    <p className="mt-0.5 text-lg font-extrabold text-kisan-900">
                      {c.predictedWaitMinutes}m
                    </p>
                  </div>
                  <div className="rounded-xl bg-kisan-50 p-2.5">
                    <p className="text-[11px] font-semibold text-kisan-600">Slots</p>
                    <p className="mt-0.5 text-lg font-extrabold text-kisan-900">{c.availableSlots}</p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-kisan-600">
                    <span>Capacity</span>
                    <span>
                      {c.served} / {c.capacity}
                    </span>
                  </div>
                  <ProgressBar className="mt-1" value={c.served} max={c.capacity} />
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {isSelected ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl bg-kisan-100 px-3 py-2 text-sm font-bold text-kisan-700">
                      <CheckCircle2 className="h-4 w-4" /> Selected
                    </span>
                  ) : (
                    <button
                      className="btn-primary px-4 py-2 text-sm"
                      onClick={() => {
                        setSelectedCenter(c.id);
                        navigate('/farmer/dashboard');
                      }}
                    >
                      Select this centre
                    </button>
                  )}
                  <MapsButtons lat={c.lat} lng={c.lng} label={c.name} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
