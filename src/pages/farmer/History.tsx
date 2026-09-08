import { CheckCircle2, XCircle } from 'lucide-react';
import { useT } from '../../i18n';
import { procurementHistory } from '../../data/tokens';
import { EmptyState, Spinner } from '../../components/common/Feedback';
import { History as HistoryIcon } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useBackendResource } from '../../services/useBackendResource';
import { farmerApi } from '../../services/api';
import { toProcurementRecord } from '../../services/adapters';
import { PrototypeNote } from '../../components/common/DemoBadge';
import type { ProcurementRecord } from '../../types';

export default function FarmerHistory() {
  const { t } = useT();
  const farmerId = useAppStore((s) => s.backendIds.farmerId);

  const { data: records, loading } = useBackendResource<ProcurementRecord[]>(
    async () => {
      if (!farmerId) return procurementHistory;
      const rows = (await farmerApi.history(farmerId)) as Parameters<typeof toProcurementRecord>[0][];
      return rows.map(toProcurementRecord);
    },
    procurementHistory,
    [farmerId],
  );
  const usingFallback = records === procurementHistory;

  if (loading && records.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-kisan-900">{t('history.title')}</h1>
        <Spinner label="Loading history…" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-kisan-900">{t('history.title')}</h1>
        <EmptyState icon={<HistoryIcon className="h-7 w-7" />} title={t('history.empty')} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-kisan-900">{t('history.title')}</h1>
        {usingFallback && (
          <PrototypeNote className="mt-1">
            {' '}
            — showing example history; unable to reach the procurement service right now.
          </PrototypeNote>
        )}
      </div>

      {/* Mobile: cards */}
      <div className="space-y-3 sm:hidden">
        {records.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-base font-extrabold text-kisan-900">
                {r.crop} · {r.quantityQuintals} q
              </p>
              <StatusPill status={r.status} completedLabel={t('procurement.completed')} />
            </div>
            <p className="mt-1 text-sm text-kisan-600">
              {r.date} · {r.center}
            </p>
            {r.amount && (
              <p className="mt-2 text-sm font-bold text-kisan-700">{r.amount}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tablet/desktop: table */}
      <div className="card hidden overflow-hidden sm:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-kisan-50 text-xs uppercase tracking-wide text-kisan-600">
            <tr>
              <th className="px-4 py-3">{t('history.date')}</th>
              <th className="px-4 py-3">{t('history.crop')}</th>
              <th className="px-4 py-3">{t('history.quantity')}</th>
              <th className="px-4 py-3">{t('history.center')}</th>
              <th className="px-4 py-3 text-right">{t('history.status')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-kisan-100">
            {records.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-semibold text-kisan-900">{r.date}</td>
                <td className="px-4 py-3">{r.crop}</td>
                <td className="px-4 py-3">{r.quantityQuintals} q</td>
                <td className="px-4 py-3 text-kisan-700">{r.center}</td>
                <td className="px-4 py-3 text-right">
                  <StatusPill status={r.status} completedLabel={t('procurement.completed')} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusPill({
  status,
  completedLabel,
}: {
  status: 'Completed' | 'Cancelled';
  completedLabel: string;
}) {
  if (status === 'Completed') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-kisan-100 px-3 py-1 text-xs font-bold text-kisan-700">
        <CheckCircle2 className="h-3.5 w-3.5" /> {completedLabel}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-600">
      <XCircle className="h-3.5 w-3.5" /> {status}
    </span>
  );
}
