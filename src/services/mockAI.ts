import type {
  CenterLoad,
  LoadBalancingRecommendation,
  ProcurementCenter,
  SlotPrediction,
  SlotRecommendation,
} from '../types';
import { candidateSlots } from '../data/schedules';

/**
 * ---------------------------------------------------------------------------
 *  MOCK AI SERVICE
 *  Every export here is a stand-in for a backend AI endpoint. The function
 *  signatures are the contract — when the real service lands, replace the
 *  bodies with `fetch(import.meta.env.VITE_API_BASE_URL + ...)` and callers
 *  keep working unchanged.
 * ---------------------------------------------------------------------------
 */

/** Simulate a small network delay so the UI can show loading states. */
export function withLatency<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

const crowdWeight: Record<CenterLoad, number> = {
  low: 1,
  normal: 0.6,
  high: 0.2,
};

/**
 * Score a single slot. Lower wait + lower crowd + higher availability +
 * faster processing => higher score (0-100).
 */
function scoreSlot(slot: SlotPrediction): number {
  const waitScore = Math.max(0, 1 - slot.waitMinutes / 150); // 0..1
  const queueScore = Math.max(0, 1 - slot.queueAhead / 80);
  const crowdScore = crowdWeight[slot.crowdLevel];
  const availabilityScore = slot.centerAvailability;
  const speedScore = Math.min(1, slot.processingSpeed / 1.3);

  const weighted =
    waitScore * 0.4 +
    queueScore * 0.2 +
    crowdScore * 0.15 +
    availabilityScore * 0.15 +
    speedScore * 0.1;

  return Math.round(weighted * 100);
}

function reasonsFor(slot: SlotPrediction, all: SlotPrediction[]): string[] {
  const avgQueue = all.reduce((s, x) => s + x.queueAhead, 0) / all.length;
  const reasons: string[] = [];
  if (slot.queueAhead < avgQueue) reasons.push('Lower predicted crowd');
  if (slot.centerAvailability >= 0.7) reasons.push('High center availability');
  if (slot.processingSpeed >= 1.1) reasons.push('Faster processing');
  if (slot.waitMinutes <= 40) reasons.push('Short waiting time');
  if (reasons.length === 0) reasons.push('Balanced crowd and wait time');
  return reasons.slice(0, 3);
}

/**
 * recommendBestSlot()
 * Evaluates the mock candidate slots and returns the best one with the
 * score and human-readable reasons the dashboard card renders.
 *
 * Later: `return fetch(`${API}/ai/recommend-slot`, { ... }).then(r => r.json())`
 */
export function recommendBestSlot(
  slots: SlotPrediction[] = candidateSlots,
): SlotRecommendation {
  const ranked = slots
    .map((slot) => ({
      ...slot,
      score: scoreSlot(slot),
      reasons: reasonsFor(slot, slots),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0];
}

export function recommendBestSlotAsync(
  slots: SlotPrediction[] = candidateSlots,
): Promise<SlotRecommendation> {
  return withLatency(recommendBestSlot(slots));
}

/**
 * predictWaitingTime()
 * Estimate wait (minutes) for a given queue length and processing speed.
 */
export function predictWaitingTime(
  queueAhead: number,
  avgProcessingMinutes: number,
  parallelCounters = 3,
): number {
  const raw = (queueAhead / parallelCounters) * avgProcessingMinutes;
  // add a congestion penalty as the queue grows
  const congestion = queueAhead > 40 ? 1.25 : queueAhead > 20 ? 1.1 : 1;
  return Math.round(raw * congestion);
}

/**
 * getCenterStatus()
 * Derive the live status snapshot for one center.
 */
export function getCenterStatus(center: ProcurementCenter): {
  center: ProcurementCenter;
  utilization: number;
  load: CenterLoad;
  statusLabel: 'Normal' | 'Overloaded' | 'Available';
  predictedWaitMinutes: number;
} {
  const utilization = Math.round((center.served / center.capacity) * 100);
  const load: CenterLoad =
    utilization >= 90 || center.queueLength >= 55
      ? 'high'
      : utilization <= 45 && center.queueLength <= 20
        ? 'low'
        : 'normal';
  const statusLabel =
    load === 'high' ? 'Overloaded' : load === 'low' ? 'Available' : 'Normal';
  return {
    center,
    utilization,
    load,
    statusLabel,
    predictedWaitMinutes: predictWaitingTime(
      center.queueLength,
      center.avgProcessingMinutes,
    ),
  };
}

export function getCenterStatusAsync(center: ProcurementCenter) {
  return withLatency(getCenterStatus(center));
}

/**
 * computeLoadBalancing()
 * Given an overloaded "from" center and an under-used "to" center, work out
 * how many farmers to redirect and the wait-time impact. Returns null when
 * no action is warranted.
 */
export function computeLoadBalancing(
  from: ProcurementCenter,
  to: ProcurementCenter,
): LoadBalancingRecommendation | null {
  const fromUtil = from.served / from.capacity;
  if (fromUtil < 0.9 && from.queueLength < 50) return null;

  const overflowPercent = Math.round((fromUtil - 1) * 100);
  const redirectFarmers = Math.min(
    Math.max(15, Math.round(from.queueLength * 0.4)),
    to.capacity - to.served,
  );

  const waitBefore = predictWaitingTime(from.queueLength, from.avgProcessingMinutes);
  const waitAfter = predictWaitingTime(
    Math.max(0, from.queueLength - redirectFarmers),
    from.avgProcessingMinutes,
  );
  const reductionPercent = Math.round(((waitBefore - waitAfter) / waitBefore) * 100);

  return {
    id: `lb-${from.id}-${to.id}`,
    fromCenterId: from.id,
    fromCenterName: from.name,
    toCenterId: to.id,
    toCenterName: to.name,
    overflowPercent: Math.max(overflowPercent, 12),
    redirectFarmers,
    waitBeforeMinutes: waitBefore,
    waitAfterMinutes: waitAfter,
    reductionPercent: Math.max(reductionPercent, 5),
    applied: false,
  };
}
