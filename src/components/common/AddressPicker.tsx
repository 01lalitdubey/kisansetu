import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Loader2, MapPin, Search } from 'lucide-react';

export interface AddressValue {
  addressLine: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number | null;
  longitude: number | null;
}

const EMPTY: AddressValue = {
  addressLine: '',
  city: '',
  district: 'Jaipur',
  state: 'Rajasthan',
  pincode: '',
  latitude: null,
  longitude: null,
};

const pin = L.divIcon({
  className: '',
  html: `<div style="background:#2563eb;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

function ClickCapture({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({ click: (e) => onPick(e.latlng.lat, e.latlng.lng) });
  return null;
}
function Fly({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 15);
  }, [lat, lng, map]);
  return null;
}

/**
 * Real address selection: OpenStreetMap Nominatim search + a draggable/clickable
 * Leaflet pin + manual fields. Emits latitude/longitude with the address.
 * Respects Nominatim usage policy (debounced, 1 req/keystroke burst max).
 */
export function AddressPicker({
  value,
  onChange,
}: {
  value?: Partial<AddressValue>;
  onChange: (v: AddressValue) => void;
}) {
  const [addr, setAddr] = useState<AddressValue>({ ...EMPTY, ...value });
  const [q, setQ] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const debRef = useRef<number | null>(null);

  useEffect(() => {
    onChange(addr);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addr]);

  function set<K extends keyof AddressValue>(k: K, v: AddressValue[K]) {
    setAddr((a) => ({ ...a, [k]: v }));
  }

  async function runSearch(text: string) {
    if (text.trim().length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(
        text,
      )}`;
      const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      setResults((await res.json()) as NominatimResult[]);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  function onQ(text: string) {
    setQ(text);
    if (debRef.current) window.clearTimeout(debRef.current);
    debRef.current = window.setTimeout(() => runSearch(text), 600);
  }

  function choose(r: NominatimResult) {
    const a = r.address ?? {};
    setAddr({
      addressLine: [a.road, a.neighbourhood, a.suburb].filter(Boolean).join(', ') || r.display_name.split(',')[0],
      city: a.city || a.town || a.village || a.municipality || addr.city,
      district: a.state_district || a.county || addr.district,
      state: a.state || addr.state,
      pincode: a.postcode || addr.pincode,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
    });
    setResults([]);
    setQ(r.display_name);
  }

  async function reverse(lat: number, lng: number) {
    set('latitude', lat);
    set('longitude', lng);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=${lat}&lon=${lng}`,
        { headers: { 'Accept-Language': 'en' } },
      );
      const j = (await res.json()) as NominatimResult;
      const a = j.address ?? {};
      setAddr((cur) => ({
        ...cur,
        latitude: lat,
        longitude: lng,
        addressLine: cur.addressLine || [a.road, a.suburb].filter(Boolean).join(', '),
        city: cur.city || a.city || a.town || a.village || cur.city,
        district: a.state_district || a.county || cur.district,
        state: a.state || cur.state,
        pincode: cur.pincode || a.postcode || cur.pincode,
      }));
    } catch {
      /* keep manual entry */
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        void reverse(p.coords.latitude, p.coords.longitude);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  const lat = addr.latitude ?? 26.9124;
  const lng = addr.longitude ?? 75.7873;

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-kisan-400" />
        <input
          className="field-input pl-10"
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder="Search your address (OpenStreetMap)"
        />
        {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-kisan-400" />}
        {results.length > 0 && (
          <ul className="absolute z-[1000] mt-1 max-h-60 w-full overflow-auto rounded-xl border border-kisan-100 bg-white shadow-lift">
            {results.map((r, i) => (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="block w-full px-3 py-2 text-left text-sm text-kisan-800 hover:bg-kisan-50"
                >
                  {r.display_name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={useMyLocation}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-kisan-600 hover:underline"
      >
        <MapPin className="h-4 w-4" /> {locating ? 'Locating…' : 'Use my current location'}
      </button>

      <div className="overflow-hidden rounded-xl border border-kisan-100">
        <MapContainer center={[lat, lng]} zoom={addr.latitude ? 15 : 11} style={{ height: 220, width: '100%' }}>
          <Fly lat={lat} lng={lng} />
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <ClickCapture onPick={(la, ln) => void reverse(la, ln)} />
          {addr.latitude != null && (
            <Marker
              position={[addr.latitude, addr.longitude!]}
              icon={pin}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const m = e.target as L.Marker;
                  const p = m.getLatLng();
                  void reverse(p.lat, p.lng);
                },
              }}
            />
          )}
        </MapContainer>
      </div>
      <p className="text-xs text-kisan-500">
        Tap the map or drag the pin to set your exact location. Coordinates:{' '}
        {addr.latitude != null ? `${addr.latitude.toFixed(5)}, ${addr.longitude!.toFixed(5)}` : 'not set'}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="field-label">Address line</label>
          <input className="field-input" value={addr.addressLine} onChange={(e) => set('addressLine', e.target.value)} />
        </div>
        <div>
          <label className="field-label">City / Village</label>
          <input className="field-input" value={addr.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div>
          <label className="field-label">District</label>
          <input className="field-input" value={addr.district} onChange={(e) => set('district', e.target.value)} />
        </div>
        <div>
          <label className="field-label">State</label>
          <input className="field-input" value={addr.state} onChange={(e) => set('state', e.target.value)} />
        </div>
        <div>
          <label className="field-label">PIN code</label>
          <input
            className="field-input"
            inputMode="numeric"
            maxLength={6}
            value={addr.pincode}
            onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))}
          />
        </div>
      </div>
    </div>
  );
}

export function isAddressComplete(a: Partial<AddressValue>): a is AddressValue {
  return Boolean(
    a.addressLine && a.city && a.district && a.state && /^\d{6}$/.test(a.pincode ?? '') && a.latitude != null && a.longitude != null,
  );
}
