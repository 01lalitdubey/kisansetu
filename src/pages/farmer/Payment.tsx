import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreditCard, Lock, ShieldAlert, Truck } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { paymentApi, transportApi } from '../../services/api';
import { Spinner } from '../../components/common/Feedback';

const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

interface TransportRow {
  id: string;
  vehicleType: string;
  pickupLocation: string;
  destination: string;
  estimatedCost: number;
  platformFee: number;
  totalCost: number;
  payment?: { status: string } | null;
}

export default function FarmerPayment() {
  const { transportId } = useParams<{ transportId: string }>();
  const navigate = useNavigate();
  const setToast = useAppStore((s) => s.setToast);
  const refreshFarmerProcurement = useAppStore((s) => s.refreshFarmerProcurement);

  const [transport, setTransport] = useState<TransportRow | null>(null);
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!transportId) return;
    Promise.all([transportApi.get(transportId), paymentApi.config()])
      .then(([t, cfg]) => {
        setTransport(t as TransportRow);
        setStripeConfigured((cfg as { stripeConfigured: boolean }).stripeConfigured);
      })
      .catch((e) => setToast(e instanceof Error ? e.message : 'Could not load payment'))
      .finally(() => setLoading(false));
  }, [transportId, setToast]);

  async function pay() {
    if (!transportId) return;
    setBusy(true);
    try {
      const res = (await paymentApi.startTransportPayment(transportId)) as {
        mode: 'stripe' | 'demo';
        checkoutUrl?: string;
        payment: { id: string };
      };
      if (res.mode === 'stripe' && res.checkoutUrl) {
        window.location.href = res.checkoutUrl; // -> Stripe Checkout
        return;
      }
      // Demo Payment path
      await paymentApi.demoConfirm(res.payment.id);
      await refreshFarmerProcurement();
      navigate('/farmer/payment/success?demo=1');
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Payment could not be started');
    } finally {
      setBusy(false);
    }
  }

  if (loading || stripeConfigured === null) return <Spinner label="Loading payment…" />;
  if (!transport) {
    return <p className="card p-6 text-center text-sm text-kisan-600">Transport booking not found.</p>;
  }

  if (transport.payment?.status === 'PAID') {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-extrabold text-kisan-900">✓ Already paid</p>
        <button className="btn-primary mt-4" onClick={() => navigate('/farmer/transport')}>
          Track transport
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold text-kisan-900">
        <Truck className="h-6 w-6 text-kisan-500" /> Transport Payment
      </h1>

      <div className="card p-5">
        <dl className="divide-y divide-kisan-100 text-sm">
          <Row
            label="Vehicle"
            value={
              transport.vehicleType.charAt(0) + transport.vehicleType.slice(1).toLowerCase() + ' Vehicle'
            }
          />
          <Row label="Pickup" value={transport.pickupLocation} />
          <Row label="Destination" value={transport.destination} />
          <Row label="Transport" value={inr(transport.estimatedCost)} />
          <Row label="KisanSetu AI Service Fee (1%)" value={inr(transport.platformFee)} />
          <Row label="Total" value={inr(transport.totalCost)} strong />
        </dl>
      </div>

      {stripeConfigured ? (
        <button className="btn-primary w-full text-lg" onClick={pay} disabled={busy}>
          <Lock className="h-5 w-5" /> {busy ? 'Redirecting…' : 'Pay with Stripe'}
        </button>
      ) : (
        <div className="card border border-amber-200 bg-amber-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <ShieldAlert className="h-4 w-4" /> Stripe payment is not configured in this environment.
          </p>
          <p className="mt-1 text-xs text-amber-700">
            Demo payment — no real money will be charged.
          </p>
          <button className="btn-dark mt-3 w-full" onClick={pay} disabled={busy}>
            <CreditCard className="h-4 w-4" /> {busy ? 'Processing…' : 'Demo Payment'}
          </button>
        </div>
      )}

      <p className="text-center text-xs text-kisan-500">
        Payments are processed securely by Stripe. KisanSetu AI never sees your card details, and a
        payment is confirmed only after the backend verifies it.
      </p>
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
