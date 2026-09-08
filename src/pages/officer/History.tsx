import { Fragment, useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { centerHistoryApi } from '../../services/api';
import { Spinner } from '../../components/common/Feedback';

const RANGES = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: '7d', label: 'Last 7 days' },
  { id: '30d', label: 'Last 30 days' },
] as const;

interface Record_ {
  id: string;
  date: string;
  completedAt: string;
  token: string;
  farmer: string;
  farmerMobile: string;
  crop: string;
  quantity: number;
  declaredQuantity: number;
  qualityGrade?: string | null;
  amount?: number | null;
  status: string;
  paymentStatus: string;
  transportStatus?: string | null;
}

interface HistoryResponse {
  center: { name: string };
  count: number;
  totalQuantity: number;
  totalValue: number;
  records: Record_[];
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

export default function OfficerHistory() {
  const backendEnabled = useAppStore((s) => s.backendEnabled);
  const authRole = useAppStore((s) => s.authRole);

  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('7d');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (!backendEnabled) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    centerHistoryApi
      .list({ dateRange: range, search: debounced || undefined })
      .then((r) => {
        if (alive) setData(r as HistoryResponse);
      })
      .catch(() => {
        if (alive) setData(null);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [backendEnabled, authRole, range, debounced]);

  const records = useMemo(() => data?.records ?? [], [data]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Centre History</h1>
        <p className="mt-0.5 text-sm text-white/60">
          {data?.center?.name ?? 'Your centre'} · completed procurement activity
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold ${
              range === r.id
                ? 'border-kisan-500 bg-kisan-500 text-white'
                : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-kisan-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by farmer name, token or crop"
          className="field-input pl-10"
        />
      </div>

      {loading ? (
        <Spinner label="Loading history…" />
      ) : !backendEnabled ? (
        <div className="card p-8 text-center text-sm text-kisan-600">
          Centre history requires the backend (set VITE_USE_BACKEND=true).
        </div>
      ) : records.length === 0 ? (
        <div className="card p-10 text-center text-sm text-kisan-600">
          No completed procurements in this period.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Records" value={String(data?.count ?? records.length)} />
            <Stat label="Quantity" value={`${data?.totalQuantity ?? 0} q`} />
            <Stat label="Value" value={`₹${(data?.totalValue ?? 0).toLocaleString('en-IN')}`} />
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-kisan-50 text-xs uppercase tracking-wide text-kisan-600">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Farmer</th>
                  <th className="px-4 py-3">Crop</th>
                  <th className="px-4 py-3">Qty</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                  <th className="px-4 py-3">Completed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-kisan-100">
                {records.map((r) => (
                  <Fragment key={r.id}>
                    <tr
                      onClick={() => setOpenId(openId === r.id ? null : r.id)}
                      className="cursor-pointer hover:bg-kisan-50"
                    >
                      <td className="px-4 py-3 font-semibold text-kisan-900">{fmtDate(r.date)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-kisan-700">{r.token}</td>
                      <td className="px-4 py-3">{r.farmer}</td>
                      <td className="px-4 py-3">{r.crop}</td>
                      <td className="px-4 py-3">{Math.round(r.quantity)} q</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-kisan-100 px-2 py-0.5 text-xs font-bold text-kisan-700">
                          {r.status === 'COMPLETED' ? 'Completed' : r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                            r.paymentStatus === 'PAID'
                              ? 'bg-kisan-100 text-kisan-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {r.paymentStatus === 'PAID' ? 'Paid' : r.paymentStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-kisan-600">{fmtTime(r.completedAt)}</td>
                    </tr>
                    {openId === r.id && (
                      <tr className="bg-kisan-50/60">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="grid gap-2 text-xs text-kisan-700 sm:grid-cols-3">
                            <span>Mobile: <b>{r.farmerMobile}</b></span>
                            <span>Declared: <b>{r.declaredQuantity} q</b></span>
                            <span>Grade: <b>{r.qualityGrade ?? '—'}</b></span>
                            <span>Amount: <b>₹{(r.amount ?? 0).toLocaleString('en-IN')}</b></span>
                            <span>Transport: <b>{r.transportStatus ?? 'not arranged'}</b></span>
                            <span>Completed at: <b>{new Date(r.completedAt).toLocaleString('en-IN')}</b></span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-kisan-500">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-kisan-900">{value}</p>
    </div>
  );
}
