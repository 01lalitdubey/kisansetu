import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useT } from '../../i18n';
import { farmers as mockFarmers } from '../../data/farmers';
import { useAppStore } from '../../store/appStore';
import { useBackendResource } from '../../services/useBackendResource';
import { farmerApi } from '../../services/api';
import { PrototypeNote } from '../../components/common/DemoBadge';
import type { Farmer } from '../../types';

export default function OfficerFarmers() {
  const { t } = useT();
  const [q, setQ] = useState('');
  const authRole = useAppStore((s) => s.authRole);

  const { data: farmers } = useBackendResource<Farmer[]>(
    () => farmerApi.listAll() as Promise<Farmer[]>,
    mockFarmers,
    [authRole],
  );
  const usingFallback = farmers === mockFarmers;

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return farmers;
    return farmers.filter(
      (f) =>
        f.name.toLowerCase().includes(term) ||
        f.village.toLowerCase().includes(term) ||
        f.crop.toLowerCase().includes(term) ||
        f.mobile.includes(term) ||
        f.id.toLowerCase().includes(term),
    );
  }, [q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-white">{t('officer.farmersTitle')}</h1>
        <p className="mt-0.5 text-sm text-white/60">{farmers.length} registered</p>
        {usingFallback && (
          <PrototypeNote className="mt-1">
            {' '}
            — showing example farmers; the procurement service is unreachable right now.
          </PrototypeNote>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-kisan-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('officer.search')}
          className="field-input pl-10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card p-10 text-center text-sm text-kisan-600">No farmers match “{q}”.</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 lg:hidden">
            {filtered.map((f) => (
              <div key={f.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-kisan-900">{f.name}</p>
                  <span className="text-xs font-semibold text-kisan-500">{f.id}</span>
                </div>
                <p className="mt-1 text-sm text-kisan-600">
                  {f.village} · {f.mobile}
                </p>
                <p className="mt-1 text-sm font-semibold text-kisan-700">
                  {f.crop} · {f.quantityQuintals} q
                </p>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="card hidden overflow-hidden lg:block">
            <table className="w-full text-left text-sm">
              <thead className="bg-kisan-50 text-xs uppercase tracking-wide text-kisan-600">
                <tr>
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">{t('profile.name')}</th>
                  <th className="px-4 py-3">{t('profile.village')}</th>
                  <th className="px-4 py-3">{t('profile.mobile')}</th>
                  <th className="px-4 py-3">{t('profile.crop')}</th>
                  <th className="px-4 py-3 text-right">{t('profile.quantity')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kisan-100">
                {filtered.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3 font-mono text-xs text-kisan-500">{f.id}</td>
                    <td className="px-4 py-3 font-semibold text-kisan-900">{f.name}</td>
                    <td className="px-4 py-3 text-kisan-700">{f.village}</td>
                    <td className="px-4 py-3 text-kisan-700">{f.mobile}</td>
                    <td className="px-4 py-3">{f.crop}</td>
                    <td className="px-4 py-3 text-right font-semibold">{f.quantityQuintals} q</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
