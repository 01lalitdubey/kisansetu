import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { paymentApi } from '../../services/api';

/** Stripe / demo return page — verifies the payment server-side, never trusts the URL. */
export default function FarmerPaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const refreshFarmerProcurement = useAppStore((s) => s.refreshFarmerProcurement);
  const refreshNotifications = useAppStore((s) => s.refreshNotifications);

  const sessionId = params.get('session_id');
  const isDemo = params.get('demo') === '1';
  const [state, setState] = useState<'checking' | 'ok' | 'pending'>(isDemo ? 'ok' : 'checking');

  useEffect(() => {
    (async () => {
      if (sessionId) {
        try {
          const p = (await paymentApi.verify(sessionId)) as { status?: string };
          setState(p.status === 'PAID' ? 'ok' : 'pending');
        } catch {
          setState('pending');
        }
      }
      await refreshFarmerProcurement();
      await refreshNotifications();
    })();
  }, [sessionId, refreshFarmerProcurement, refreshNotifications]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      {state === 'checking' ? (
        <>
          <Loader2 className="h-10 w-10 animate-spin text-kisan-500" />
          <p className="text-lg font-bold text-kisan-800">Confirming your payment…</p>
        </>
      ) : state === 'ok' ? (
        <>
          <CheckCircle2 className="h-14 w-14 text-kisan-500" />
          <h1 className="text-2xl font-extrabold text-kisan-900">Payment Successful</h1>
          <p className="text-kisan-600">
            Transport Booking Confirmed{isDemo ? ' (demo — no real money charged)' : ''}.
          </p>
          <div className="mt-2 flex gap-3">
            <button className="btn-primary" onClick={() => navigate('/farmer/transport')}>
              Track Transport
            </button>
            <button className="btn-secondary" onClick={() => navigate('/farmer/dashboard')}>
              Back to Dashboard
            </button>
          </div>
        </>
      ) : (
        <>
          <Loader2 className="h-10 w-10 text-amber-500" />
          <h1 className="text-xl font-extrabold text-kisan-900">Payment is still processing</h1>
          <p className="max-w-sm text-sm text-kisan-600">
            We'll confirm your transport as soon as the payment clears. You can check back on the
            Transport page.
          </p>
          <button className="btn-secondary mt-2" onClick={() => navigate('/farmer/transport')}>
            Go to Transport
          </button>
        </>
      )}
    </div>
  );
}
