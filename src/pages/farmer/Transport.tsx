import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Check, MapPin, Phone, Truck } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { transportApi, type VehicleType } from '../../services/api';
import { EmptyState, Spinner } from '../../components/common/Feedback';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

const STATUS_STEPS = ['REQUESTED', 'ASSIGNED', 'ON_THE_WAY', 'PICKED_UP', 'DELIVERED'] as const;

interface VehicleOption {
  type: VehicleType;
  label: string;
  capacityLabel: string;
  baseFare: number;
  perKm: number;
}
interface Quote {
  vehicleType: VehicleType;
  vehicleLabel: string;
  pickupLocation: string;
  destination: string;
  distanceKm: number;
  transportAmount: number;
  platformFee: number;
  totalCost: number;
}
interface TransportRow {
  id: string;
  status: string;
  vehicleType: string;
  pickupLocation: string;
  destination: string;
  distanceKm: number;
  estimatedCost: number;
  platformFee: number;
  totalCost: number;
  driverName?: string | null;
  driverPhone?: string | null;
  payment?: { status: string } | null;
}

export default function FarmerTransport() {
  const navigate = useNavigate();
  const procurement = useAppStore((s) => s.farmerProcurement) as
    | { id: string; crop?: { name?: string }; token?: { tokenNumber?: string } }
    | null;
  const transportState = useAppStore((s) => s.farmerTransport) as TransportRow | null;
  const refreshFarmerProcurement = useAppStore((s) => s.refreshFarmerProcurement);
  const setToast = useAppStore((s) => s.setToast);

  const [options, setOptions] = useState<VehicleOption[]>([]);
  const [chosen, setChosen] = useState<VehicleType | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState<TransportRow | null>(transportState);

  const activeTransport = live && live.status !== 'CANCELLED' ? live : null;

  useEffect(() => {
    void refreshFarmerProcurement();
    transportApi
      .options()
      .then((o) => setOptions(o as VehicleOption[]))
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [refreshFarmerProcurement]);

  useEffect(() => {
    setLive(transportState);
  }, [transportState]);

  // fetch full transport row (for driver + payment status) when we have one
  useEffect(() => {
    if (transportState?.id) {
      transportApi
        .get(transportState.id)
        .then((r) => setLive(r as TransportRow))
        .catch(() => undefined);
    }
  }, [transportState?.id]);

  async function getQuote(vt: VehicleType) {
    if (!procurement) return;
    setChosen(vt);
    setBusy(true);
    try {
      const q = (await transportApi.quote({ procurementId: procurement.id, vehicleType: vt })) as Quote;
      setQuote(q);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not get a quote.');
    } finally {
      setBusy(false);
    }
  }

  async function confirm() {
    if (!procurement || !chosen) return;
    setBusy(true);
    try {
      const t = (await transportApi.book({
        procurementId: procurement.id,
        vehicleType: chosen,
      })) as TransportRow;
      await refreshFarmerProcurement();
      navigate(`/farmer/payment/${t.id}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not book transport.');
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = useMemo(
    () => (activeTransport ? STATUS_STEPS.indexOf(activeTransport.status as (typeof STATUS_STEPS)[number]) : -1),
    [activeTransport],
  );

  if (loading) return <Spinner label="Loading transport…" />;

  if (!procurement) {
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-extrabold text-kisan-900">Arrange Transport</h1>
        <EmptyState
          icon={<Truck className="h-7 w-7" />}
          title="Transport unlocks after procurement"
          body="Once your produce has been procured and the deal is confirmed, you can arrange transport from here."
          action={
            <button className="btn-secondary mt-2" onClick={() => navigate('/farmer/dashboard')}>
              Back to dashboard
            </button>
          }
        />
      </div>
    );
  }

  // ---- Active booking: show tracking ----
  if (activeTransport) {
    const paid = activeTransport.payment?.status === 'PAID';
    return (
      <div className="space-y-5">
        <h1 className="text-2xl font-extrabold text-kisan-900">🚚 Transport Booking</h1>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <p className="text-base font-extrabold text-kisan-900">
              {activeTransport.vehicleType.charAt(0) + activeTransport.vehicleType.slice(1).toLowerCase()} Vehicle
            </p>
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                paid ? 'bg-kisan-100 text-kisan-700' : 'bg-amber-100 text-amber-800'
              }`}
            >
              {paid ? '✓ Paid' : 'Payment pending'}
            </span>
          </div>

          <dl className="mt-3 divide-y divide-kisan-100 text-sm">
            <Row label="Pickup" value={activeTransport.pickupLocation} />
            <Row label="Destination" value={activeTransport.destination} />
            <Row label="Distance" value={`${activeTransport.distanceKm} km`} />
            <Row label="Transport charge" value={inr(activeTransport.estimatedCost)} />
            <Row label="KisanSetu AI service fee (1%)" value={inr(activeTransport.platformFee)} />
            <Row label="Total" value={inr(activeTransport.totalCost)} strong />
          </dl>

          {!paid && (
            <button
              className="btn-primary mt-4 w-full"
              onClick={() => navigate(`/farmer/payment/${activeTransport.id}`)}
            >
              Pay now <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* status stepper */}
        <div className="card p-5">
          <p className="text-sm font-bold text-kisan-800">Status</p>
          <ol className="mt-3 space-y-3">
            {STATUS_STEPS.map((s, i) => {
              const done = i <= stepIndex;
              return (
                <li key={s} className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                      done ? 'bg-kisan-500 text-white' : 'bg-kisan-100 text-kisan-500'
                    }`}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className={`text-sm font-semibold ${done ? 'text-kisan-900' : 'text-kisan-500'}`}>
                    {s.replace(/_/g, ' ')}
                  </span>
                </li>
              );
            })}
          </ol>

          {activeTransport.driverName && (
            <div className="mt-4 rounded-xl bg-kisan-50 p-3 text-sm">
              <p className="font-bold text-kisan-900">Driver: {activeTransport.driverName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-kisan-700">
                <Phone className="h-3.5 w-3.5" /> {activeTransport.driverPhone}
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-amber-700">
          Estimated transport charges — the farmer pays the transport cost. The platform does not
          provide free transport.
        </p>
      </div>
    );
  }

  // ---- Choose a vehicle ----
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-kisan-900">🚚 Arrange Transport</h1>
        <p className="mt-0.5 text-kisan-600">
          Your {procurement.crop?.name ?? 'produce'} procurement is complete. Need help transporting
          it?
        </p>
      </div>

      <div className="space-y-3">
        {options.map((o) => (
          <button
            key={o.type}
            onClick={() => getQuote(o.type)}
            className={`card w-full p-4 text-left transition-shadow hover:shadow-lift ${
              chosen === o.type ? 'ring-2 ring-kisan-400' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-base font-extrabold text-kisan-900">{o.label}</p>
              <Truck className="h-5 w-5 text-kisan-500" />
            </div>
            <p className="mt-0.5 text-sm text-kisan-600">Capacity: {o.capacityLabel}</p>
            <p className="mt-1 text-sm font-semibold text-kisan-700">
              From {inr(o.baseFare)} + {inr(o.perKm)}/km · estimated
            </p>
          </button>
        ))}
      </div>

      {busy && !quote && <Spinner label="Getting quote…" />}

      {quote && chosen && (
        <div className="card border-2 border-kisan-300 p-5">
          <p className="text-sm font-bold uppercase tracking-wide text-kisan-600">Transport summary</p>
          <dl className="mt-3 divide-y divide-kisan-100 text-sm">
            <Row label="Vehicle" value={quote.vehicleLabel} />
            <Row
              label="Pickup"
              value={
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-kisan-500" />
                  {quote.pickupLocation}
                </span>
              }
            />
            <Row label="Destination" value={quote.destination} />
            <Row label="Distance" value={`${quote.distanceKm} km`} />
            <Row label="Estimated arrival" value={`~${Math.round(30 + quote.distanceKm * 2.5)} min`} />
            <Row label="Transport charge" value={inr(quote.transportAmount)} />
            <Row label="KisanSetu AI service fee (1%)" value={inr(quote.platformFee)} />
            <Row label="Total" value={inr(quote.totalCost)} strong />
          </dl>
          <button className="btn-primary mt-4 w-full text-lg" onClick={confirm} disabled={busy}>
            {busy ? 'Confirming…' : 'Confirm Transport'} <ArrowRight className="h-5 w-5" />
          </button>
          <p className="mt-2 text-center text-xs text-amber-700">
            Estimated transport charges · the farmer pays the transport cost.
          </p>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="text-kisan-600">{label}</dt>
      <dd className={strong ? 'text-lg font-extrabold text-kisan-900' : 'font-bold text-kisan-900'}>
        {value}
      </dd>
    </div>
  );
}
