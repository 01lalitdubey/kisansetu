import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/response';
import { predictWaitingTime } from './recommendationService';
import { attachToken, ensureQueue, recalcQueue } from './queueService';

type Tx = Prisma.TransactionClient;

/** Next token number for a centre: A113, A114, … (letter + running integer). */
async function nextTokenNumber(tx: Tx, centerId: string): Promise<string> {
  const tokens = await tx.token.findMany({
    where: { centerId },
    select: { tokenNumber: true },
  });
  let max = 100;
  for (const t of tokens) {
    const n = parseInt(t.tokenNumber.replace(/\D/g, ''), 10);
    if (!Number.isNaN(n) && n > max) max = n;
  }
  return `A${max + 1}`;
}

export interface CreateTokenInput {
  farmerId: string;
  centerId: string;
  scheduleId: string;
  cropId: string;
  quantity: number;
}

/**
 * Book a slot. All 11 steps from the spec run inside one transaction so the
 * queue, schedule count and token stay consistent even under concurrency.
 */
export async function createToken(input: CreateTokenInput) {
  return prisma.$transaction(async (tx) => {
    // 1. farmer
    const farmer = await tx.farmer.findUnique({
      where: { id: input.farmerId },
      include: { user: true },
    });
    if (!farmer) throw ApiError.notFound('Farmer not found');

    // 2. centre
    const center = await tx.procurementCenter.findUnique({ where: { id: input.centerId } });
    if (!center) throw ApiError.notFound('Procurement centre not found');
    if (center.status === 'CLOSED') throw ApiError.conflict('Procurement centre is closed');

    // 3. schedule
    const schedule = await tx.procurementSchedule.findUnique({ where: { id: input.scheduleId } });
    if (!schedule) throw ApiError.notFound('Schedule not found');
    if (schedule.centerId !== input.centerId) {
      throw ApiError.badRequest('Schedule does not belong to this centre');
    }
    if (schedule.status === 'COMPLETED' || schedule.status === 'CANCELLED') {
      throw ApiError.conflict(`Schedule is ${schedule.status.toLowerCase()}`);
    }

    // crop must exist
    const crop = await tx.crop.findUnique({ where: { id: input.cropId } });
    if (!crop) throw ApiError.notFound('Crop not found');

    // prevent duplicate active booking for the same farmer + schedule
    const dupe = await tx.token.findFirst({
      where: {
        farmerId: input.farmerId,
        scheduleId: input.scheduleId,
        status: { in: ['BOOKED', 'WAITING', 'SERVING'] },
      },
    });
    if (dupe) throw ApiError.conflict('You already have an active token for this slot');

    // 4. capacity
    if (schedule.bookedFarmers >= schedule.maxFarmers) {
      throw ApiError.conflict('This slot is fully booked');
    }

    // 5 + 6. queue position + estimated wait
    await ensureQueue(input.centerId, tx);
    const queue = await tx.queue.findUniqueOrThrow({ where: { centerId: input.centerId } });
    const ahead = await tx.queueEntry.count({
      where: { queueId: queue.id, status: { in: ['WAITING', 'SERVING'] } },
    });
    const { predictedWait } = predictWaitingTime({
      queueAhead: ahead,
      avgProcessingTime: center.averageProcessingTime,
      activeCounters: center.activeCounters,
      capacity: center.capacity,
      served: center.farmersServed,
      hour: parseInt(schedule.startTime.split(':')[0] ?? '9', 10),
    });

    // 7. token number
    const tokenNumber = await nextTokenNumber(tx, input.centerId);

    // 8. insert token
    const token = await tx.token.create({
      data: {
        tokenNumber,
        farmerId: input.farmerId,
        centerId: input.centerId,
        scheduleId: input.scheduleId,
        cropId: input.cropId,
        quantity: input.quantity,
        date: schedule.date,
        slotStart: schedule.startTime,
        slotEnd: schedule.endTime,
        queuePosition: ahead + 1,
        estimatedWait: predictedWait,
        status: 'BOOKED',
      },
    });

    // 9. insert queue entry
    const position = await attachToken(tx, input.centerId, token.id);

    // 10. update schedule booked count
    await tx.procurementSchedule.update({
      where: { id: input.scheduleId },
      data: { bookedFarmers: { increment: 1 } },
    });

    // keep positions / waits coherent
    await recalcQueue(tx, input.centerId);

    // notification
    await tx.notification.create({
      data: {
        farmerId: input.farmerId,
        type: 'TOKEN_UPDATE',
        title: 'Token confirmed',
        message: `Your token ${tokenNumber} for ${crop.name} is confirmed at ${center.name}.`,
        meta: { tokenNumber, slot: `${schedule.startTime} – ${schedule.endTime}` } as Prisma.InputJsonValue,
      },
    });

    const fresh = await tx.token.findUniqueOrThrow({ where: { id: token.id } });

    // 11. return token
    return {
      id: fresh.id,
      tokenNumber: fresh.tokenNumber,
      farmerName: farmer.user.name,
      centerId: center.id,
      centerName: center.name,
      cropName: crop.name,
      quantity: fresh.quantity,
      date: fresh.date,
      slotStart: fresh.slotStart,
      slotEnd: fresh.slotEnd,
      queuePosition: position,
      queueAhead: Math.max(0, position - 1),
      estimatedWait: fresh.estimatedWait,
      status: fresh.status,
    };
  });
}

export async function getTokenById(id: string) {
  const token = await prisma.token.findUnique({
    where: { id },
    include: {
      farmer: { include: { user: true } },
      center: true,
      schedule: true,
      crop: true,
      queueEntry: true,
    },
  });
  if (!token) throw ApiError.notFound('Token not found');

  // queueAhead relative to the person currently being served
  const queueAhead =
    token.status === 'WAITING' || token.status === 'BOOKED'
      ? Math.max(0, token.queuePosition - 1)
      : 0;

  return {
    id: token.id,
    tokenNumber: token.tokenNumber,
    farmer: {
      id: token.farmer.id,
      name: token.farmer.user.name,
      village: token.farmer.village,
      mobile: token.farmer.user.mobile,
    },
    center: { id: token.center.id, name: token.center.name, location: token.center.location },
    schedule: {
      id: token.schedule.id,
      date: token.schedule.date,
      startTime: token.schedule.startTime,
      endTime: token.schedule.endTime,
    },
    crop: token.crop.name,
    quantity: token.quantity,
    date: token.date,
    slotStart: token.slotStart,
    slotEnd: token.slotEnd,
    queuePosition: token.queuePosition,
    queueAhead,
    estimatedWait: token.estimatedWait,
    status: token.status,
    createdAt: token.createdAt,
  };
}

export async function listFarmerTokens(farmerId: string) {
  return prisma.token.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'desc' },
    include: { center: true, crop: true },
  });
}

/**
 * Cancel a token: never hard-delete. Set CANCELLED, drop the queue entry,
 * pull positions forward, release the schedule seat. Transactional.
 */
export async function cancelToken(id: string) {
  return prisma.$transaction(async (tx) => {
    const token = await tx.token.findUnique({ where: { id }, include: { queueEntry: true } });
    if (!token) throw ApiError.notFound('Token not found');
    if (token.status === 'CANCELLED') throw ApiError.conflict('Token already cancelled');
    if (token.status === 'COMPLETED') throw ApiError.conflict('Completed tokens cannot be cancelled');

    await tx.token.update({ where: { id }, data: { status: 'CANCELLED' } });

    if (token.queueEntry) {
      await tx.queueEntry.delete({ where: { id: token.queueEntry.id } });
    }

    await tx.procurementSchedule.update({
      where: { id: token.scheduleId },
      data: { bookedFarmers: { decrement: 1 } },
    }).catch(() => undefined);

    await recalcQueue(tx, token.centerId);

    await tx.notification.create({
      data: {
        farmerId: token.farmerId,
        type: 'TOKEN_UPDATE',
        title: 'Token cancelled',
        message: `Token ${token.tokenNumber} has been cancelled.`,
      },
    });

    return { id: token.id, tokenNumber: token.tokenNumber, status: 'CANCELLED' as const };
  });
}
