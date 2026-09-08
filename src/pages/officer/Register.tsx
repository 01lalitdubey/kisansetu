import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { AddressPicker, isAddressComplete, type AddressValue } from '../../components/common/AddressPicker';
import { centerApi, ApiError } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { LanguageSelector } from '../../components/common/LanguageSelector';

const CROPS = ['Wheat', 'Rice', 'Maize', 'Mustard', 'Soybean', 'Cotton', 'Other'];

export default function OfficerRegister() {
  const navigate = useNavigate();
  const authStatus = useAuthStore((s) => s.status);

  const [officerName, setOfficerName] = useState('');
  const [name, setName] = useState('');
  const [contactNumber, setContact] = useState('');
  const [capacity, setCapacity] = useState('100');
  const [counters, setCounters] = useState('3');
  const [crops, setCrops] = useState<string[]>(['Wheat']);
  const [address, setAddress] = useState<AddressValue | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready =
    name.trim().length > 2 &&
    /^[0-9+\- ]{6,15}$/.test(contactNumber) &&
    Number(capacity) >= 10 &&
    Number(counters) >= 1 &&
    crops.length > 0 &&
    address != null &&
    isAddressComplete(address);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ready || !address) return;
    setBusy(true);
    setError(null);
    try {
      await centerApi.register({
        name: name.trim(),
        officerName: officerName.trim() || undefined,
        contactNumber: contactNumber.trim(),
        addressLine: address.addressLine,
        city: address.city,
        district: address.district,
        state: address.state,
        pincode: address.pincode,
        latitude: address.latitude!,
        longitude: address.longitude!,
        capacity: Number(capacity),
        activeCounters: Number(counters),
        supportedCrops: crops,
      });
      navigate('/officer/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Please sign in first, then register your centre.');
      } else {
        setError(err instanceof Error ? err.message : 'Registration failed');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-grain">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-kisan-500 text-xl">🌾</span>
          <span className="text-lg font-extrabold text-kisan-900">Register a Procurement Centre</span>
        </div>
        <LanguageSelector />
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-16">
        {authStatus !== 'signed-in' && (
          <div className="card mb-4 border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            You need an account to register a centre.{' '}
            <button onClick={() => navigate('/farmer/auth')} className="font-bold underline">
              Sign in / create account
            </button>{' '}
            first — then come back here.
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          <section className="card p-5">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-kisan-900">
              <Building2 className="h-5 w-5 text-kisan-500" /> Centre details
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label">Your name (officer)</label>
                <input className="field-input" value={officerName} onChange={(e) => setOfficerName(e.target.value)} placeholder="e.g. S. Verma" />
              </div>
              <div className="sm:col-span-2">
                <label className="field-label">Centre name</label>
                <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kotputli Grain Mandi" />
              </div>
              <div>
                <label className="field-label">Contact number</label>
                <input className="field-input" value={contactNumber} onChange={(e) => setContact(e.target.value)} placeholder="0141-XXXXXXX" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Capacity</label>
                  <input className="field-input" inputMode="numeric" value={capacity} onChange={(e) => setCapacity(e.target.value.replace(/\D/g, ''))} />
                </div>
                <div>
                  <label className="field-label">Counters</label>
                  <input className="field-input" inputMode="numeric" value={counters} onChange={(e) => setCounters(e.target.value.replace(/\D/g, ''))} />
                </div>
              </div>
            </div>

            <label className="field-label mt-4">Supported crops</label>
            <div className="flex flex-wrap gap-2">
              {CROPS.map((c) => {
                const on = crops.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setCrops((cur) => (on ? cur.filter((x) => x !== c) : [...cur, c]))}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${
                      on ? 'border-kisan-500 bg-kisan-500 text-white' : 'border-kisan-200 text-kisan-700 hover:bg-kisan-50'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card p-5">
            <h2 className="text-lg font-extrabold text-kisan-900">Centre address &amp; location</h2>
            <p className="mt-1 text-sm text-kisan-600">Search, or drop a pin on the map. A real location is required.</p>
            <div className="mt-3">
              <AddressPicker onChange={setAddress} />
            </div>
          </section>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
          )}

          <div className="rounded-xl bg-kisan-50 p-3 text-sm text-kisan-700">
            New centres are submitted for <b>admin approval</b>. Once approved your centre goes live and
            you can manage its live queue, farmers, history and analytics.
          </div>

          <button type="submit" className="btn-primary w-full text-lg" disabled={!ready || busy}>
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit for approval'}
          </button>
          <button type="button" onClick={() => navigate('/officer/dashboard')} className="btn-secondary w-full">
            I already have an approved centre
          </button>
        </form>
      </main>
    </div>
  );
}
