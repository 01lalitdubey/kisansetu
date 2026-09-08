import { useEffect } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation } from 'lucide-react';

/**
 * Maps for procurement centres — Leaflet + OpenStreetMap (no API key).
 * "View on Google Maps" / "Directions" remain as EXTERNAL navigation links
 * built from each centre's verified lat/lng (never invented coordinates).
 */

// Fix Leaflet's default marker icon paths under a bundler.
const icon = (color: string) =>
  L.divIcon({
    className: '',
    html: `<div style="background:${color};width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
    popupAnchor: [0, -20],
  });

const CENTER_ICON = icon('#16a34a');
const HIGH_ICON = icon('#dc2626');
const MODERATE_ICON = icon('#d97706');
const YOU_ICON = icon('#2563eb');

export function placeUrl(lat: number, lng: number, label?: string): string {
  const q = label ? encodeURIComponent(`${label} ${lat},${lng}`) : `${lat},${lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export function MapsButtons({
  lat,
  lng,
  label,
  className = '',
}: {
  lat: number;
  lng: number;
  label?: string;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a href={placeUrl(lat, lng, label)} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-2 text-sm">
        <MapPin className="h-4 w-4" /> View on Google Maps
      </a>
      <a href={directionsUrl(lat, lng)} target="_blank" rel="noreferrer" className="btn-secondary px-3 py-2 text-sm">
        <Navigation className="h-4 w-4" /> Directions
      </a>
    </div>
  );
}

function Recenter({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], zoom);
  }, [lat, lng, zoom, map]);
  return null;
}

export interface MapCenter {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  load?: 'low' | 'normal' | 'high' | string;
  status?: string;
  queueLength?: number;
  capacity?: number;
  predictedWaitMinutes?: number;
  addressLine?: string | null;
  city?: string | null;
  district?: string | null;
}

/** Single-centre panel (used on farmer centre detail + officer/admin). */
export function CenterMapPanel({
  center,
  farmer,
}: {
  center: MapCenter;
  farmer?: { latitude: number; longitude: number } | null;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-kisan-100">
      <MapContainer
        center={[center.latitude, center.longitude]}
        zoom={12}
        scrollWheelZoom={false}
        style={{ height: 280, width: '100%' }}
      >
        <Recenter lat={center.latitude} lng={center.longitude} zoom={12} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[center.latitude, center.longitude]} icon={CENTER_ICON}>
          <Popup>
            <b>{center.name}</b>
            <br />
            {[center.addressLine, center.city, center.district].filter(Boolean).join(', ')}
          </Popup>
        </Marker>
        {farmer && (
          <Marker position={[farmer.latitude, farmer.longitude]} icon={YOU_ICON}>
            <Popup>Your location</Popup>
          </Marker>
        )}
      </MapContainer>
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3">
        <p className="text-sm font-bold text-kisan-900">{center.name}</p>
        <MapsButtons lat={center.latitude} lng={center.longitude} label={center.name} />
      </div>
    </div>
  );
}

/** Multi-centre map (farmer centre list + admin overview). */
export function CentersMap({
  centers,
  farmer,
  selectedId,
  onSelect,
  height = 360,
}: {
  centers: MapCenter[];
  farmer?: { latitude: number; longitude: number } | null;
  selectedId?: string;
  onSelect?: (id: string) => void;
  height?: number;
}) {
  const first = centers[0];
  const focus = farmer ?? (first ? { latitude: first.latitude, longitude: first.longitude } : { latitude: 26.9124, longitude: 75.7873 });

  return (
    <div className="overflow-hidden rounded-2xl border border-kisan-100">
      <MapContainer center={[focus.latitude, focus.longitude]} zoom={10} scrollWheelZoom style={{ height, width: '100%' }}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {farmer && (
          <Marker position={[farmer.latitude, farmer.longitude]} icon={YOU_ICON}>
            <Popup>Your location</Popup>
          </Marker>
        )}
        {centers.map((c) => (
          <Marker
            key={c.id}
            position={[c.latitude, c.longitude]}
            icon={c.load === 'high' ? HIGH_ICON : c.load === 'normal' ? MODERATE_ICON : CENTER_ICON}
            eventHandlers={onSelect ? { click: () => onSelect(c.id) } : undefined}
          >
            <Popup>
              <b>{c.name}</b>
              {c.district ? <><br />{c.district}</> : null}
              <br />
              Status: {c.status ?? '—'}
              {c.queueLength != null && <><br />Queue: {c.queueLength}</>}
              {c.capacity != null && <><br />Capacity: {c.capacity}</>}
              {c.predictedWaitMinutes != null && <><br />Est. wait: {c.predictedWaitMinutes} min</>}
              <br />
              <a href={directionsUrl(c.latitude, c.longitude)} target="_blank" rel="noreferrer">
                Directions ↗
              </a>
              {selectedId === c.id ? ' · selected' : ''}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
