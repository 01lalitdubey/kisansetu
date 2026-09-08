import type { ProcurementCenter } from '../../types';
import { CentersMap } from '../common/MapsLink';

/**
 * Officer/admin centre map — now Leaflet + OpenStreetMap (Phase 5).
 */
export function CenterMap({ centers }: { centers: ProcurementCenter[] }) {
  return (
    <div className="card overflow-hidden p-2">
      <CentersMap
        centers={centers.map((c) => ({
          id: c.id,
          name: c.name,
          latitude: c.lat,
          longitude: c.lng,
          load: c.load,
          status: c.status,
          queueLength: c.queueLength,
          capacity: c.capacity,
          predictedWaitMinutes: c.predictedWaitMinutes,
          district: c.district,
        }))}
        height={340}
      />
    </div>
  );
}
