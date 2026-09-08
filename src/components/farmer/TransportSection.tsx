import { Link } from 'react-router-dom';
import { ArrowRight, Truck } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

/**
 * Dashboard transport card. Only rendered once the farmer has a COMPLETED
 * procurement. Never shows "Transport booked" before that.
 */
export function TransportSection() {
  const procurement = useAppStore((s) => s.farmerProcurement) as { id: string } | null;
  const transport = useAppStore((s) => s.farmerTransport) as
    | {
        id: string;
        status: string;
        vehicleType: string;
        totalCost: number;
        estimatedCost: number;
        payment?: { status: string } | null;
      }
    | null;

  if (!procurement) return null;

  const active = transport && transport.status !== 'CANCELLED' ? transport : null;

  if (!active) {
    return (
      <div className="card border-2 border-kisan-300 bg-kisan-50/40 p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-kisan-500 text-white">
            <Truck className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-extrabold text-kisan-900">🚚 Transport Available</h2>
        </div>
        <p className="mt-2 text-sm text-kisan-700">
          Your procurement is complete. Need help transporting your produce?
        </p>
        <Link to="/farmer/transport" className="btn-primary mt-4 w-full">
          Arrange Transport <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-2 text-center text-xs text-amber-700">
          Estimated transport charges — the farmer pays the transport cost.
        </p>
      </div>
    );
  }

  const paid = active.payment?.status === 'PAID';
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-kisan-50 text-kisan-600">
          <Truck className="h-5 w-5" />
        </span>
        <h2 className="text-lg font-extrabold text-kisan-900">🚚 Transport Booked</h2>
      </div>
      <dl className="mt-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <dt className="text-kisan-600">Vehicle</dt>
          <dd className="font-bold text-kisan-900">
            {active.vehicleType.charAt(0) + active.vehicleType.slice(1).toLowerCase()}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-kisan-600">Cost</dt>
          <dd className="font-bold text-kisan-900">{inr(active.estimatedCost)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-kisan-600">Payment</dt>
          <dd className={`font-bold ${paid ? 'text-kisan-700' : 'text-amber-700'}`}>
            {paid ? '✓ Paid' : 'Pending'}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-kisan-600">Status</dt>
          <dd className="font-bold text-kisan-900">
            {active.status.replace(/_/g, ' ').toLowerCase()}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex gap-3">
        {!paid && (
          <Link to={`/farmer/payment/${active.id}`} className="btn-primary flex-1">
            Pay now
          </Link>
        )}
        <Link to="/farmer/transport" className={`${paid ? 'btn-primary' : 'btn-secondary'} flex-1`}>
          Track Transport
        </Link>
      </div>
    </div>
  );
}
