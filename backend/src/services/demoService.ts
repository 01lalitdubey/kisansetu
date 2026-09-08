import { prisma } from '../config/database';
import { ApiError } from '../utils/response';
import { CENTERS, BASE_NOTIFICATIONS, SCHEDULE_SLOTS } from '../../prisma/seedData';
import type { ProcurementCenter } from '@prisma/client';
import { presentCenter, listCenters } from './centerService';
import { getQueueSnapshot, processNext } from './queueService';
import { computeCenterLoad, detectLoadBalancing, predictWaitingTime } from './recommendationService';

/** Estimated wait for a farmer `queueAhead` places back at a centre. */
function predictedWaitFor(center: ProcurementCenter, queueAhead: number): number {
  return predictWaitingTime({
    queueAhead,
    avgProcessingTime: center.averageProcessingTime,
    activeCounters: center.activeCounters,
    capacity: center.capacity,
    served: center.farmersServed,
  }).predictedWait;
}
import { notifyHighDemand, notifyLowCrowd, notifyScheduleChange } from './notificationService';

const AMER = 'Amer Procurement Center';
const PRIMARY = 'Jaipur Grain Center';

async function centerByName(name: string) {
  const c = await prisma.procurementCenter.findUnique({ where: { name } });
  if (!c) throw ApiError.notFound(`Centre "${name}" not found`);
  return c;
}

async function demoFarmerId(): Promise<string | null> {
  const user = await prisma.user.findFirst({ where: { email: 'farmer@demo.com' }, include: { farmer: true } });
  return user?.farmer?.id ?? null;
}

/** POST /api/demo/high-demand — Amer surges and the AI reacts. */
export async function simulateHighDemand() {
  const amer = await centerByName(AMER);
  const updated = await prisma.procurementCenter.update({
    where: { id: amer.id },
    data: {
      currentQueue: 75,
      farmersServed: Math.min(amer.capacity - 2, 118),
      averageProcessingTime: 9,
      status: 'OVERLOADED',
    },
  });
  await prisma.queue.updateMany({ where: { centerId: amer.id }, data: { status: 'OVERLOADED' } });

  const recommendation = await detectLoadBalancing();
  await notifyHighDemand(AMER);

  return {
    center: presentCenter(updated),
    load: computeCenterLoad(updated),
    recommendation,
  };
}

/** POST /api/demo/queue-reduction — queues drain across the board. */
export async function simulateQueueReduction() {
  const centers = await prisma.procurementCenter.findMany();
  for (const c of centers) {
    const currentQueue = Math.max(4, Math.round(c.currentQueue * 0.4));
    const load = computeCenterLoad({ ...c, currentQueue });
    await prisma.procurementCenter.update({
      where: { id: c.id },
      data: {
        currentQueue,
        status: load.load === 'HIGH' ? 'OVERLOADED' : 'ACTIVE',
      },
    });
  }
  await prisma.centerRecommendation.updateMany({
    where: { status: 'PENDING' },
    data: { status: 'DISMISSED' },
  });
  await notifyLowCrowd(null, 25);
  return { centers: await listCenters() };
}

/** POST /api/demo/schedule-change — the demo farmer's slot moves. */
export async function simulateScheduleChange() {
  const primary = await centerByName(PRIMARY);
  const farmerId = await demoFarmerId();

  const oldSlot = await prisma.procurementSchedule.findFirst({
    where: { centerId: primary.id, startTime: '11:30' },
  });
  const newSlot = await prisma.procurementSchedule.findFirst({
    where: { centerId: primary.id, startTime: '13:00' },
  });

  if (oldSlot) {
    await prisma.procurementSchedule.update({ where: { id: oldSlot.id }, data: { status: 'CANCELLED' } });
  }
  if (newSlot) {
    await prisma.procurementSchedule.update({ where: { id: newSlot.id }, data: { status: 'ACTIVE' } });
  }

  if (farmerId) {
    const token = await prisma.token.findFirst({
      where: { farmerId, status: { in: ['BOOKED', 'WAITING', 'SERVING'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (token && newSlot) {
      await prisma.token.update({
        where: { id: token.id },
        data: { slotStart: newSlot.startTime, slotEnd: newSlot.endTime, scheduleId: newSlot.id },
      });
    }
    await notifyScheduleChange(farmerId, '11:30 AM', '1:00 PM');
  }

  return {
    schedules: await prisma.procurementSchedule.findMany({
      where: { centerId: primary.id },
      orderBy: { startTime: 'asc' },
    }),
  };
}

/** POST /api/demo/process-token — advance the primary centre's queue by one. */
export async function simulateProcessToken(centerId?: string) {
  const center = centerId
    ? await prisma.procurementCenter.findUnique({ where: { id: centerId } })
    : await centerByName(PRIMARY);
  if (!center) throw ApiError.notFound('Procurement centre not found');
  return processNext(center.id);
}

/**
 * POST /api/demo/reset — restore the seeded demo state.
 * Centres, schedules, queue order, recommendations and notifications go back
 * to what `prisma db seed` produced. Completed procurements are kept.
 */
export async function resetDemo() {
  await prisma.$transaction(async (tx) => {
    // 1. centres -> seed scalars
    for (const seed of CENTERS) {
      await tx.procurementCenter.update({
        where: { name: seed.name },
        data: {
          capacity: seed.capacity,
          currentQueue: seed.currentQueue,
          farmersServed: seed.farmersServed,
          activeCounters: seed.activeCounters,
          averageProcessingTime: seed.averageProcessingTime,
          status: seed.status,
        },
      });
      await tx.queue.updateMany({
        where: { center: { name: seed.name } },
        data: { running: true, status: seed.status === 'OVERLOADED' ? 'OVERLOADED' : 'ACTIVE', nowServingTokenId: null },
      });
    }

    // 2. schedules -> seed booked counts / statuses
    const centers = await tx.procurementCenter.findMany();
    for (const center of centers) {
      for (const slot of SCHEDULE_SLOTS) {
        await tx.procurementSchedule.updateMany({
          where: { centerId: center.id, startTime: slot.startTime },
          data: { status: slot.status, bookedFarmers: slot.booked },
        });
      }
    }

    const seededRe = /^A(1(0[0-9]|1[0-9]|2[0-6]))$/;
    const num = (tn: string) => parseInt(tn.replace(/\D/g, ''), 10) || 0;

    // 2b. delete tokens booked during the demo (A127+) so the next run starts
    //     at A127 again. Cascades to queue entries, procurements and payments.
    const bookedDuringDemo = await tx.token.findMany({ select: { id: true, tokenNumber: true } });
    const demoTokenIds = bookedDuringDemo
      .filter((t) => num(t.tokenNumber) >= 127)
      .map((t) => t.id);
    if (demoTokenIds.length) {
      await tx.token.deleteMany({ where: { id: { in: demoTokenIds } } });
    }

    // 3. rebuild each centre's queue deterministically from the seeded tokens.
    //    Seeded live-queue tokens are A113..A126.

    for (const center of centers) {
      const queue = await tx.queue.findUnique({ where: { centerId: center.id } });
      if (!queue) continue;

      const allEntries = await tx.queueEntry.findMany({
        where: { queueId: queue.id },
        include: { token: true },
      });

      // Which entries should be active again after a reset:
      //  - every seeded token (regardless of current status)
      //  - any non-seeded token that is still BOOKED / WAITING / SERVING
      const active = allEntries
        .filter(
          (e) =>
            seededRe.test(e.token.tokenNumber) ||
            ['BOOKED', 'WAITING', 'SERVING'].includes(e.token.status),
        )
        .sort((a, b) => num(a.token.tokenNumber) - num(b.token.tokenNumber));

      const terminal = allEntries.filter((e) => !active.includes(e));

      // terminal (completed during a *previous* run of a non-seeded token) -> leave as is
      for (const e of terminal) {
        await tx.queueEntry.update({
          where: { id: e.id },
          data: { status: 'COMPLETED' },
        });
      }

      let pos = 1;
      for (const e of active) {
        const serving = pos === 1;
        const estimatedWait = predictedWaitFor(center, Math.max(0, pos - 1));
        await tx.queueEntry.update({
          where: { id: e.id },
          data: {
            position: pos,
            status: serving ? 'SERVING' : 'WAITING',
            startedAt: serving ? new Date() : null,
            completedAt: null,
          },
        });
        await tx.token.update({
          where: { id: e.tokenId },
          data: { status: serving ? 'SERVING' : 'WAITING', queuePosition: pos, estimatedWait },
        });
        pos += 1;
      }

      const first = active[0];
      await tx.queue.update({
        where: { id: queue.id },
        data: { nowServingTokenId: first?.tokenId ?? null },
      });

      // 4. centre.currentQueue: seeded scalar for empty centres,
      //    real active count for the primary (which has the seeded queue)
      const activeCount = active.length;
      await tx.procurementCenter.update({
        where: { id: center.id },
        data: { currentQueue: activeCount > 0 ? activeCount : center.currentQueue },
      });
    }

    // 5. recommendations + AI predictions -> clean slate
    await tx.centerRecommendation.deleteMany({});
    await tx.aiPrediction.deleteMany({});

    // 6. notifications -> base set for the demo farmer
    const demoUser = await tx.user.findFirst({ where: { email: 'farmer@demo.com' }, include: { farmer: true } });
    await tx.notification.deleteMany({});
    if (demoUser?.farmer) {
      for (const n of BASE_NOTIFICATIONS) {
        await tx.notification.create({
          data: {
            farmerId: demoUser.farmer.id,
            type: n.type,
            title: n.title,
            message: n.message,
            meta: n.meta,
            read: n.read,
          },
        });
      }
    }
  });

  return {
    centers: await listCenters(),
    primaryQueue: await getQueueSnapshot((await centerByName(PRIMARY)).id),
  };
}
