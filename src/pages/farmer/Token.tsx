import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Ban, CalendarDays, Clock, MapPin, Share2, Ticket, Users, Wheat } from 'lucide-react';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { StatusBadge } from '../../components/common/StatusBadge';
import { EmptyState } from '../../components/common/Feedback';

export default function FarmerToken() {
  const { t } = useT();
  const token = useAppStore((s) => s.token);
  const cancelToken = useAppStore((s) => s.cancelToken);
  const setToast = useAppStore((s) => s.setToast);

  if (!token || token.status === 'CANCELLED') {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-extrabold text-kisan-900">{t('token.title')}</h1>
        <EmptyState
          icon={<Ticket className="h-7 w-7" />}
          title={token?.status === 'CANCELLED' ? t('token.cancelled') : t('token.noToken')}
          body={t('token.noTokenCta')}
          action={
            <Link to="/farmer/dashboard" className="btn-primary mt-2">
              {t('nav.dashboard')}
            </Link>
          }
        />
      </div>
    );
  }

  const qrPayload = JSON.stringify({
    token: token.id,
    center: token.centerName,
    slot: token.slot,
    date: token.date,
    crop: token.crop,
    qty: token.quantityQuintals,
  });

  function share() {
    const text = `KisanSetu AI Token ${token!.id}\n${token!.centerName}\n${token!.date}, ${token!.slot}\nCrop: ${token!.crop} (${token!.quantityQuintals} q)`;
    if (navigator.share) {
      navigator.share({ title: `Token ${token!.id}`, text }).catch(() => undefined);
    } else {
      navigator.clipboard?.writeText(text);
    }
    setToast(t('token.shareCopied'));
  }

  const rows = [
    { icon: CalendarDays, label: t('token.date'), value: token.date },
    { icon: Clock, label: t('token.time'), value: token.slot },
    { icon: MapPin, label: t('token.center'), value: token.centerName },
    { icon: Wheat, label: t('token.crop'), value: token.crop },
    { icon: Ticket, label: t('token.quantity'), value: `${token.quantityQuintals} quintals` },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-kisan-900">{t('token.title')}</h1>

      <div className="card overflow-hidden">
        <div className="bg-field flex items-center justify-between px-5 py-4 text-white">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/70">
              {t('token.yourToken')}
            </p>
            <p className="text-3xl font-extrabold tracking-wider">TOKEN {token.id}</p>
          </div>
          <StatusBadge variant="active" label={token.status} />
        </div>

        <div className="grid gap-6 p-5 sm:grid-cols-[auto,1fr] sm:items-center">
          <div className="mx-auto rounded-2xl border border-kisan-100 bg-white p-4">
            <QRCodeSVG value={qrPayload} size={168} level="M" fgColor="#14532d" />
            <p className="mt-2 max-w-[168px] text-center text-[11px] font-medium text-kisan-600">
              {t('token.scanAtCenter')}
            </p>
          </div>

          <dl className="divide-y divide-kisan-100">
            {rows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 py-2.5">
                <Icon className="h-5 w-5 text-kisan-500" />
                <dt className="w-28 text-sm font-semibold text-kisan-600">{label}</dt>
                <dd className="flex-1 text-right text-base font-bold text-kisan-900">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-kisan-100 p-5 sm:grid-cols-4">
          <div className="rounded-xl bg-kisan-50 p-3 text-center">
            <p className="text-xs font-semibold text-kisan-600">{t('token.estimatedWait')}</p>
            <p className="mt-1 text-xl font-extrabold text-kisan-900">
              {token.estimatedWaitMinutes} {t('common.min')}
            </p>
          </div>
          <div className="rounded-xl bg-kisan-50 p-3 text-center">
            <p className="flex items-center justify-center gap-1 text-xs font-semibold text-kisan-600">
              <Users className="h-3.5 w-3.5" /> {t('token.queueAhead')}
            </p>
            <p className="mt-1 text-xl font-extrabold text-kisan-900">{token.queueAhead}</p>
          </div>
          <Link to="/farmer/queue" className="btn-secondary col-span-2 sm:col-span-1">
            {t('common.viewQueue')}
          </Link>
          <button className="btn-secondary col-span-2 sm:col-span-1" onClick={share}>
            <Share2 className="h-4 w-4" /> {t('common.share')}
          </button>
        </div>
      </div>

      <button
        className="btn w-full border border-red-200 bg-white text-red-600 hover:bg-red-50"
        onClick={cancelToken}
      >
        <Ban className="h-4 w-4" /> {t('common.cancelToken')}
      </button>
    </div>
  );
}
