import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bot,
  Clock,
  IndianRupee,
  MapPin,
  PackageCheck,
  Ticket,
  Users,
} from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore, selectSelectedCenter } from '../../store/appStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ProgressBar } from '../../components/common/ProgressBar';
import { CropSetupModal } from '../../components/farmer/CropSetupModal';
import { TransportSection } from '../../components/farmer/TransportSection';

export default function FarmerDashboard() {
  const { t } = useT();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const center = useAppStore(selectSelectedCenter);
  const token = useAppStore((s) => s.token);
  const procurement = useAppStore((s) => s.farmerProcurement) as
    | { crop?: { name?: string }; totalAmount?: number; payment?: { status?: string } | null }
    | null;
  const bookTokenNextSlot = useAppStore((s) => s.bookTokenNextSlot);
  const refreshFarmerProcurement = useAppStore((s) => s.refreshFarmerProcurement);
  const refreshFarmerQueue = useAppStore((s) => s.refreshFarmerQueue);
  const backendEnabled = useAppStore((s) => s.backendEnabled);

  const [booking, setBooking] = useState(false);

  useEffect(() => {
    void refreshFarmerProcurement();
    if (!backendEnabled) return;
    // Near-real-time: pick up officer actions (token processed, procurement
    // completed) and transport/payment changes without a manual refresh.
    const id = window.setInterval(() => {
      void refreshFarmerProcurement();
      void refreshFarmerQueue();
    }, 8000);
    return () => window.clearInterval(id);
  }, [refreshFarmerProcurement, refreshFarmerQueue, backendEnabled]);

  const name = user?.name || 'Farmer';
  const hasActiveToken = token?.status === 'ACTIVE';

  async function handleBook() {
    if (booking) return;
    setBooking(true);
    try {
      const tk = await bookTokenNextSlot();
      if (tk) navigate('/farmer/token');
    } finally {
      setBooking(false);
    }
  }

  return (
    <div className="space-y-5">
      <CropSetupModal />

      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-kisan-900">
          {t('dashboard.greeting', { name })}
        </h1>
        <p className="mt-0.5 text-kisan-600">{t('dashboard.subtitle')}</p>
      </div>

      {/* Main procurement card */}
      <div className="card overflow-hidden">
        <div className="bg-field px-5 py-4 text-white">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">
              🌾 {t('dashboard.cropProcurement', { crop: user?.crop ?? 'Wheat' })}
            </h2>
            <StatusBadge variant="active" label={t('status.ACTIVE')} />
          </div>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-kisan-800">
              <MapPin className="h-5 w-5 text-kisan-500" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-kisan-500">
                  {t('dashboard.procurementCenter')}
                </p>
                <p className="text-base font-bold">{center.name}</p>
              </div>
            </div>
            <Link
              to="/farmer/centers"
              className="text-sm font-semibold text-kisan-600 hover:underline"
            >
              Change
            </Link>
          </div>

          <div>
            <div className="flex items-center justify-between text-sm font-semibold text-kisan-700">
              <span>{t('dashboard.todaysCapacity')}</span>
              <span>
                {center.served} / {center.capacity} {t('common.farmers')}
              </span>
            </div>
            <ProgressBar className="mt-2" value={center.served} max={center.capacity} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-kisan-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-kisan-600">
                <Clock className="h-4 w-4" /> {t('dashboard.currentWait')}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-kisan-900">
                {center.predictedWaitMinutes} {t('common.min')}
              </p>
            </div>
            <div className="rounded-xl bg-kisan-50 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-kisan-600">
                <Users className="h-4 w-4" /> {t('dashboard.queueAhead')}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-kisan-900">{center.queueLength}</p>
            </div>
          </div>

          {hasActiveToken ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/farmer/token" className="btn-primary flex-1">
                <Ticket className="h-4 w-4" /> {t('common.viewToken')}
              </Link>
              <Link to="/farmer/queue" className="btn-secondary flex-1">
                {t('common.viewQueue')}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="btn-primary flex-1 text-lg"
                onClick={handleBook}
                disabled={booking}
              >
                {booking ? 'Booking your token…' : 'Book Token'}
              </button>
              <Link to="/farmer/procurement" className="btn-secondary flex-1">
                {t('common.viewProcurement')}
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Procurement + payment status */}
      <div className="card p-5">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-kisan-50 text-kisan-600">
            <PackageCheck className="h-5 w-5" />
          </span>
          <h2 className="text-lg font-extrabold text-kisan-900">Procurement status</h2>
        </div>
        {procurement ? (
          <div className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-kisan-600">Crop</span>
              <span className="font-bold text-kisan-900">{procurement.crop?.name ?? user?.crop}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-kisan-600">Status</span>
              <span className="font-bold text-kisan-700">Completed</span>
            </div>
            <div className="flex justify-between">
              <span className="flex items-center gap-1 text-kisan-600">
                <IndianRupee className="h-3.5 w-3.5" /> Payment
              </span>
              <span className="font-bold text-kisan-900">
                {procurement.payment?.status ?? 'Processing'}
                {procurement.totalAmount
                  ? ` · ₹${Math.round(procurement.totalAmount).toLocaleString('en-IN')}`
                  : ''}
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-kisan-600">
            No completed procurement yet. Book a token and visit your centre to begin.
          </p>
        )}
      </div>

      {/* Transport (only after a completed procurement) */}
      <TransportSection />

      <Link
        to="/farmer/assistant"
        className="card flex items-center gap-3 p-4 text-kisan-800 hover:bg-kisan-50"
      >
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-kisan-50 text-kisan-600">
          <Bot className="h-5 w-5" />
        </span>
        <div className="flex-1">
          <p className="font-bold">{t('assistant.title')}</p>
          <p className="text-sm text-kisan-600">{t('assistant.subtitle')}</p>
        </div>
        <ArrowRight className="h-5 w-5 text-kisan-400" />
      </Link>
    </div>
  );
}
