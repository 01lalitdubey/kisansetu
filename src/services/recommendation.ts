/**
 * Unified "best slot" recommendation used by the Farmer Dashboard.
 * Backend (POST /schedules/recommended) when available, mock AI otherwise.
 */
import type { SlotRecommendation } from '../types';
import { recommendBestSlot } from './mockAI';
import { isBackendLive, centerApi } from './api';
import { toSlotRecommendation } from './adapters';
import { useAppStore } from '../store/appStore';

interface RecommendedResponse {
  recommendedSlot: string;
  scheduleId: string;
  estimatedWait: number;
  queueAhead: number;
  reasons: string[];
  options: { scheduleId: string; slot: string; startTime: string; endTime: string; score: number }[];
}

export async function getRecommendedSlot(): Promise<SlotRecommendation> {
  const store = useAppStore.getState();
  if (store.backendEnabled && (await isBackendLive())) {
    const cuid = store.backendIds.centerIds[store.selectedCenterId];
    if (cuid) {
      try {
        const r = (await centerApi.recommendedSchedule(cuid)) as RecommendedResponse;
        const schedules = (await centerApi.schedules(cuid)) as { id: string; cropId: string }[];
        const cropId = schedules.find((s) => s.id === r.scheduleId)?.cropId ?? schedules[0]?.cropId;
        return toSlotRecommendation(r, cropId);
      } catch {
        /* fall through to mock */
      }
    }
  }
  return recommendBestSlot();
}
