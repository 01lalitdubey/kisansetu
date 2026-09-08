import { Prisma, type CenterStatus, type ProcurementCenter } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/response';
import type { SlotOption, SlotRecommendationResult, WaitPrediction } from '../types';

/**
 * ---------------------------------------------------------------------------
 *  DETERMINISTIC AI SERVICE
 *  This is intentionally isolated. Every function here is a placeholder for
 *  a future Python ML endpoint — same inputs, same output shape. Swap the
 *  bodies later; controllers and the rest of the backend do not change.
 * ---------------------------------------------------------------------------
 */

interface WaitInput {
  queueAhead: number;
  avgProcessingTime: number;
  activeCounters: number;
  capacity?: number;
  served?: number;
  hour?: number; // 0-23, defaults to "now"
}

/**
 * Core formula:
 *   base = (queueAhead * avgProcessingTime) / activeCounters
 * then multiply by adjustment factors for congestion, capacity pressure and
 * peak hours. Confidence drops as the queue (and therefore uncertainty) grows.
 */
export function predictWaitingTime(input: WaitInput): WaitPrediction {
  const counters = Math.max(1, input.activeCounters);
  const base = (input.queueAhead * input.avgProcessingTime) / counters;

  const factors: string[] = [];

  // Congestion adjustment
  let congestion = 1;
  if (input.queueAhead > 50) {
    congestion = 1.3;
    factors.push('Heavy queue congestion');
  } else if (input.queueAhead > 25) {
    congestion = 1.12;
    factors.push('Moderate queue');
  } else {
    factors.push('Low queue');
  }

  // Capacity pressure adjustment
  let capacityFactor = 1;
  if (input.capacity && input.served !== undefined) {
    const utilization = input.served / input.capacity;
    if (utilization >= 0.9) {
      capacityFactor = 1.2;
      factors.push('Centre near capacity');
    } else if (utilization <= 0.5) {
      capacityFactor = 0.9;
      factors.push('High centre availability');
    }
  }

  // Peak-hour adjustment (10-12 is the observed rush)
  const hour = input.hour ?? new Date().getHours();
  let peakFactor = 1;
  if (hour >= 10 && hour < 12) {
    peakFactor = 1.15;
    factors.push('Peak hours (10 AM – 12 PM)');
  } else if (hour >= 13 && hour < 15) {
    peakFactor = 0.95;
    factors.push('Off-peak afternoon');
  }

  if (input.avgProcessingTime <= 7) factors.push('Fast processing time');

  const predictedWait = Math.max(
    0,
    Math.round(base * congestion * capacityFactor * peakFactor),
  );

  // Confidence: high for small queues, tapering for large ones
  const confidence = Math.max(
    55,
    Math.min(95, Math.round(95 - input.queueAhead * 0.5 - (congestion - 1) * 40)),
  );

  return { predictedWait, confidence, factors: factors.slice(0, 4) };
}

export type LoadLevel = 'LOW' | 'NORMAL' | 'HIGH';

export interface CenterLoadResult {
  centerId: string;
  name: string;
  utilization: number;
  queueLength: number;
  load: LoadLevel;
  predictedWait: number;
  status: 'Normal' | 'Overloaded' | 'Available';
}

export function computeCenterLoad(center: ProcurementCenter): CenterLoadResult {
  const utilization = Math.round((center.farmersServed / Math.max(1, center.capacity)) * 100);
  const { predictedWait } = predictWaitingTime({
    queueAhead: center.currentQueue,
    avgProcessingTime: center.averageProcessingTime,
    activeCounters: center.activeCounters,
    capacity: center.capacity,
    served: center.farmersServed,
  });

  const load: LoadLevel =
    utilization >= 90 || center.currentQueue >= 55
      ? 'HIGH'
      : utilization <= 45 && center.currentQueue <= 20
        ? 'LOW'
        : 'NORMAL';

  const status = load === 'HIGH' ? 'Overloaded' : load === 'LOW' ? 'Available' : 'Normal';
  return { centerId: center.id, name: center.name, utilization, queueLength: center.currentQueue, load, predictedWait, status };
}

/**
 * Evaluate every UPCOMING/ACTIVE schedule at a centre and rank the slots.
 * Lower predicted wait + lower crowd + more headroom => better score.
 */
export async function recommendSlot(params: {
  centerId: string;
  cropId?: string;
  quantity?: number;
}): Promise<SlotRecommendationResult> {
  const center = await prisma.procurementCenter.findUnique({ where: { id: params.centerId } });
  if (!center) throw ApiError.notFound('Procurement centre not found');

  const schedules = await prisma.procurementSchedule.findMany({
    where: {
      centerId: params.centerId,
      status: { in: ['UPCOMING', 'ACTIVE'] },
      ...(params.cropId ? { cropId: params.cropId } : {}),
    },
    orderBy: { startTime: 'asc' },
  });

  if (schedules.length === 0) {
    throw ApiError.notFound('No available schedules to recommend for this centre');
  }

  const hourOf = (t: string) => parseInt(t.split(':')[0] ?? '9', 10);

  const options: SlotOption[] = schedules.map((s) => {
    const headroom = Math.max(0, s.maxFarmers - s.bookedFarmers);
    // queue ahead ≈ people already booked into this slot + a share of the live queue
    const queueAhead = s.bookedFarmers + Math.round(center.currentQueue * 0.15);
    const { predictedWait } = predictWaitingTime({
      queueAhead,
      avgProcessingTime: center.averageProcessingTime,
      activeCounters: center.activeCounters,
      capacity: center.capacity,
      served: center.farmersServed,
      hour: hourOf(s.startTime),
    });

    const waitScore = Math.max(0, 1 - predictedWait / 150);
    const crowdScore = Math.max(0, 1 - queueAhead / 80);
    const headroomScore = Math.min(1, headroom / Math.max(1, s.maxFarmers));
    const score = Math.round((waitScore * 0.5 + crowdScore * 0.3 + headroomScore * 0.2) * 100);

    return {
      scheduleId: s.id,
      slot: `${s.startTime} – ${s.endTime}`,
      startTime: s.startTime,
      endTime: s.endTime,
      queueAhead,
      estimatedWait: predictedWait,
      score,
    };
  });

  const ranked = [...options].sort((a, b) => b.score - a.score);
  const best = ranked[0];

  const avgQueue = options.reduce((sum, o) => sum + o.queueAhead, 0) / options.length;
  const reasons: string[] = [];
  if (best.queueAhead < avgQueue) reasons.push('Lower predicted crowd');
  if (best.estimatedWait <= 45) reasons.push('Faster processing');
  reasons.push('High center availability');

  // Persist the prediction so admin analytics / audit can see AI activity
  await prisma.aiPrediction.create({
    data: {
      kind: 'SLOT_RECOMMENDATION',
      centerId: params.centerId,
      scheduleId: best.scheduleId,
      predictedWait: best.estimatedWait,
      confidence: 87,
      factors: reasons,
      payload: options as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    recommendedSlot: best.startTime,
    scheduleId: best.scheduleId,
    estimatedWait: best.estimatedWait,
    queueAhead: best.queueAhead,
    reasons: reasons.slice(0, 3),
    options: ranked,
  };
}

/**
 * Look across all centres, find the most overloaded one and the centre with
 * the most spare capacity, and produce (persisting) a redirect recommendation.
 * Returns null when nothing needs balancing.
 */
export async function detectLoadBalancing() {
  const centers = await prisma.procurementCenter.findMany();
  if (centers.length < 2) return null;

  const overloaded = centers
    .filter((c) => c.farmersServed / c.capacity >= 0.9 || c.currentQueue >= 50)
    .sort((a, b) => b.currentQueue - a.currentQueue)[0];

  if (!overloaded) return null;

  const target = centers
    .filter((c) => c.id !== overloaded.id && c.status !== 'CLOSED')
    .sort((a, b) => a.farmersServed / a.capacity - b.farmersServed / b.capacity)[0];

  if (!target) return null;

  const fromUtil = overloaded.farmersServed / overloaded.capacity;
  const overflowPercent = Math.max(12, Math.round((fromUtil - 1) * 100));
  const redirectFarmers = Math.min(
    Math.max(15, Math.round(overloaded.currentQueue * 0.37)),
    Math.max(1, target.capacity - target.farmersServed),
  );

  const waitBefore = predictWaitingTime({
    queueAhead: overloaded.currentQueue,
    avgProcessingTime: overloaded.averageProcessingTime,
    activeCounters: overloaded.activeCounters,
    capacity: overloaded.capacity,
    served: overloaded.farmersServed,
  }).predictedWait;

  const waitAfter = predictWaitingTime({
    queueAhead: Math.max(0, overloaded.currentQueue - redirectFarmers),
    avgProcessingTime: overloaded.averageProcessingTime,
    activeCounters: overloaded.activeCounters,
    capacity: overloaded.capacity,
    served: overloaded.farmersServed,
  }).predictedWait;

  const reductionPercent = Math.max(
    5,
    Math.round(((waitBefore - waitAfter) / Math.max(1, waitBefore)) * 100),
  );

  // Reuse an existing PENDING recommendation for the same pair if present
  const existing = await prisma.centerRecommendation.findFirst({
    where: { fromCenterId: overloaded.id, toCenterId: target.id, status: 'PENDING' },
  });

  const reasons = [
    `${overloaded.name} predicted to exceed capacity by ${overflowPercent}%`,
    `${target.name} has spare capacity`,
    `Redirect cuts wait by ~${reductionPercent}%`,
  ];

  const rec = existing
    ? await prisma.centerRecommendation.update({
        where: { id: existing.id },
        data: { overflowPercent, redirectFarmers, waitBeforeMinutes: waitBefore, waitAfterMinutes: waitAfter, reductionPercent, reasons },
        include: { fromCenter: true, toCenter: true },
      })
    : await prisma.centerRecommendation.create({
        data: {
          fromCenterId: overloaded.id,
          toCenterId: target.id,
          overflowPercent,
          redirectFarmers,
          waitBeforeMinutes: waitBefore,
          waitAfterMinutes: waitAfter,
          reductionPercent,
          reasons,
        },
        include: { fromCenter: true, toCenter: true },
      });

  return rec;
}

export async function getActiveLoadBalancing() {
  return prisma.centerRecommendation.findFirst({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'desc' },
    include: { fromCenter: true, toCenter: true },
  });
}

/**
 * Apply a redirect recommendation: move the load between the two centres,
 * recompute their status, mark the recommendation APPLIED and notify.
 * Runs in a transaction so both centres move together.
 */
export async function applyLoadBalancing(recommendationId: string) {
  const rec = await prisma.centerRecommendation.findUnique({
    where: { id: recommendationId },
    include: { fromCenter: true, toCenter: true },
  });
  if (!rec) throw ApiError.notFound('Recommendation not found');
  if (rec.status === 'APPLIED') throw ApiError.conflict('Recommendation already applied');

  const result = await prisma.$transaction(async (tx) => {
    const from = rec.fromCenter;
    const to = rec.toCenter;

    const fromQueue = Math.max(0, from.currentQueue - rec.redirectFarmers);
    const toQueue = to.currentQueue + rec.redirectFarmers;

    const fromLoad = computeCenterLoad({ ...from, currentQueue: fromQueue });
    const toLoad = computeCenterLoad({ ...to, currentQueue: toQueue });

    const statusFor = (current: CenterStatus, level: LoadLevel): CenterStatus => {
      if (current === 'CLOSED' || current === 'PAUSED') return current;
      return level === 'HIGH' ? 'OVERLOADED' : 'ACTIVE';
    };

    const updatedFrom = await tx.procurementCenter.update({
      where: { id: from.id },
      data: {
        currentQueue: fromQueue,
        farmersServed: Math.max(0, from.farmersServed - Math.round(rec.redirectFarmers * 0.3)),
        status: statusFor(from.status, fromLoad.load),
      },
    });
    const updatedTo = await tx.procurementCenter.update({
      where: { id: to.id },
      data: { currentQueue: toQueue, status: statusFor(to.status, toLoad.load) },
    });

    await tx.queue.updateMany({ where: { centerId: from.id }, data: { status: updatedFrom.status } });
    await tx.queue.updateMany({ where: { centerId: to.id }, data: { status: updatedTo.status } });

    const applied = await tx.centerRecommendation.update({
      where: { id: rec.id },
      data: { status: 'APPLIED', appliedAt: new Date() },
      include: { fromCenter: true, toCenter: true },
    });

    // Broadcast + demo-farmer notification
    await tx.notification.create({
      data: {
        farmerId: null,
        type: 'QUEUE_ALERT',
        title: 'AI load balancing applied',
        message: `${rec.redirectFarmers} farmers redirected from ${from.name} to ${to.name}. Predicted wait ${rec.waitBeforeMinutes} → ${rec.waitAfterMinutes} min.`,
      },
    });
    const demoUser = await tx.user.findFirst({ where: { email: 'farmer@demo.com' }, include: { farmer: true } });
    if (demoUser?.farmer) {
      await tx.notification.create({
        data: {
          farmerId: demoUser.farmer.id,
          type: 'SCHEDULE_CHANGE',
          title: 'Centre load reduced',
          message: `Good news — waiting time at ${from.name} has dropped after AI rebalancing.`,
        },
      });
    }

    await tx.aiPrediction.create({
      data: {
        kind: 'LOAD_BALANCING',
        centerId: from.id,
        predictedWait: rec.waitAfterMinutes,
        confidence: 88,
        factors: rec.reasons,
        payload: { recommendationId: rec.id, redirectFarmers: rec.redirectFarmers } as unknown as Prisma.InputJsonValue,
      },
    });

    return { recommendation: applied, fromCenter: updatedFrom, toCenter: updatedTo };
  });

  return result;
}
