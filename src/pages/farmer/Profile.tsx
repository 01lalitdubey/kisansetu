import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Globe, Home, Info, Loader2, LogOut, MapPin, Pencil, Phone, Sprout, User, Wheat } from 'lucide-react';
import { LANGUAGES, useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';
import { farmerApi } from '../../services/api';
import { AddressPicker, isAddressComplete, type AddressValue } from '../../components/common/AddressPicker';

export default function FarmerProfile() {
  const { t, language } = useT();
  const navigate = useNavigate();
  const user = useAppStore((s) => s.user);
  const profile = useAppStore((s) => s.farmerProfile) as
    | ({ addressLine?: string; city?: string; district?: string; state?: string; pincode?: string; latitude?: number; longitude?: number; hasAddress?: boolean } & Record<string, unknown>)
    | null;
  const farmerId = useAppStore((s) => s.backendIds.farmerId);
  const hydrateFarmer = useAppStore((s) => s.hydrateFarmer);
  const setNeedsCropSetup = useAppStore.setState;
  const signOut = useAuthStore((s) => s.signOut);

  const [editAddr, setEditAddr] = useState(false);
  const [addr, setAddr] = useState<AddressValue | null>(null);
  const [savingAddr, setSavingAddr] = useState(false);

  async function saveAddress() {
    if (!farmerId || !addr || !isAddressComplete(addr)) return;
    setSavingAddr(true);
    try {
      await farmerApi.update(farmerId, {
        addressLine: addr.addressLine,
        city: addr.city,
        village: addr.city,
        district: addr.district,
        state: addr.state,
        pincode: addr.pincode,
        latitude: addr.latitude!,
        longitude: addr.longitude!,
        location: `${addr.city}, ${addr.district}`,
      });
      await hydrateFarmer();
      setEditAddr(false);
    } finally {
      setSavingAddr(false);
    }
  }

  const langLabel = LANGUAGES.find((l) => l.code === language)?.label ?? language;

  const addressText = profile?.addressLine
    ? [profile.addressLine, profile.city, profile.district, profile.state, profile.pincode].filter(Boolean).join(', ')
    : null;

  const personal = [
    { icon: User, label: t('profile.name'), value: user?.name ?? '—' },
    { icon: Phone, label: t('profile.mobile'), value: user?.mobile ?? '—' },
    { icon: MapPin, label: t('profile.village'), value: user?.village ?? '—' },
    { icon: MapPin, label: t('profile.district'), value: user?.district ?? '—' },
  ];
  const cropInfo = [
    { icon: Wheat, label: t('profile.crop'), value: user?.crop ?? '—' },
    {
      icon: Sprout,
      label: t('profile.quantity'),
      value: user ? `${user.quantityQuintals} quintals` : '—',
    },
    { icon: Info, label: t('profile.registeredOn'), value: user?.registeredOn ?? '—' },
  ];

  async function logout() {
    await signOut();
    navigate('/farmer/onboarding', { replace: true });
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-kisan-900">{t('profile.title')}</h1>

      <div className="card p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-kisan-500 text-2xl text-white">
            {(user?.name ?? 'F').charAt(0).toUpperCase()}
          </span>
          <div>
            <p className="text-xl font-extrabold text-kisan-900">{user?.name ?? 'Farmer'}</p>
            <p className="text-sm text-kisan-600">
              {user?.id} · {user?.village}
            </p>
          </div>
        </div>
      </div>

      <Section title={t('profile.personalDetails')} rows={personal} />

      {/* Address (Change 4) */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-kisan-600">
            <Home className="h-4 w-4" /> Address &amp; location
          </h2>
          {!editAddr && (
            <button
              onClick={() => setEditAddr(true)}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-kisan-600 hover:underline"
            >
              <Pencil className="h-3.5 w-3.5" /> {addressText ? 'Edit' : 'Add address'}
            </button>
          )}
        </div>

        {editAddr ? (
          <div className="mt-3 space-y-3">
            <AddressPicker
              value={{
                addressLine: profile?.addressLine ?? '',
                city: profile?.city ?? user?.village ?? '',
                district: profile?.district ?? 'Jaipur',
                state: profile?.state ?? 'Rajasthan',
                pincode: profile?.pincode ?? '',
                latitude: profile?.latitude ?? null,
                longitude: profile?.longitude ?? null,
              }}
              onChange={setAddr}
            />
            <div className="flex gap-3">
              <button className="btn-secondary" onClick={() => setEditAddr(false)} disabled={savingAddr}>
                Cancel
              </button>
              <button
                className="btn-primary flex-1"
                onClick={saveAddress}
                disabled={savingAddr || !addr || !isAddressComplete(addr)}
              >
                {savingAddr ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save address'}
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-2 text-sm text-kisan-800">
            {addressText ?? (
              <span className="text-kisan-500">
                No address saved yet. Add one for accurate transport distance.
              </span>
            )}
            {profile?.latitude != null && (
              <span className="mt-1 block text-xs text-kisan-500">
                📍 {profile.latitude.toFixed(5)}, {profile.longitude!.toFixed(5)}
              </span>
            )}
          </p>
        )}
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-kisan-600">
            {t('profile.cropDetails')}
          </h2>
          <button
            onClick={() => {
              setNeedsCropSetup({ needsCropSetup: true });
              navigate('/farmer/dashboard');
            }}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-kisan-600 hover:underline"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        </div>
        <dl className="mt-2 divide-y divide-kisan-100">
          {cropInfo.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 py-2.5">
              <Icon className="h-5 w-5 text-kisan-500" />
              <dt className="w-28 text-sm font-semibold text-kisan-600">{label}</dt>
              <dd className="flex-1 text-right text-base font-bold text-kisan-900">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-bold uppercase tracking-wide text-kisan-600">
          {t('profile.preferences')}
        </h2>
        <div className="mt-3 flex items-center gap-3 py-2">
          <Globe className="h-5 w-5 text-kisan-500" />
          <span className="w-28 text-sm font-semibold text-kisan-600">{t('common.language')}</span>
          <span className="flex-1 text-right text-base font-bold text-kisan-900">{langLabel}</span>
        </div>
        <p className="mt-2 flex items-start gap-2 rounded-xl bg-kisan-50 p-3 text-sm text-kisan-700">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          {t('profile.editNote')}
        </p>
      </div>

      <button
        onClick={logout}
        className="btn w-full border border-red-200 bg-white text-red-600 hover:bg-red-50"
      >
        <LogOut className="h-4 w-4" /> {t('common.logout')}
      </button>
    </div>
  );
}

function Section({
  title,
  rows,
}: {
  title: string;
  rows: { icon: typeof User; label: string; value: string }[];
}) {
  return (
    <div className="card p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-kisan-600">{title}</h2>
      <dl className="mt-2 divide-y divide-kisan-100">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 py-2.5">
            <Icon className="h-5 w-5 text-kisan-500" />
            <dt className="w-28 text-sm font-semibold text-kisan-600">{label}</dt>
            <dd className="flex-1 text-right text-base font-bold text-kisan-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
