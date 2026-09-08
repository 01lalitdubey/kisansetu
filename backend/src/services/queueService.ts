import { Prisma } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/response';
import { predictWaitingTime } from './recommendationService';

type Tx = Prisma.TransactionClient;

/** Ensure a Queue row exists for the centre and return it. */
export async function ensureQueue(centerId: string, client: Tx | typeof prisma = prisma) {
  const center = await client.procurementCenter.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Procurement centre not found');
  const existing = await client.queue.findUnique({ where: { centerId } });
  if (existing) return existing;
  return client.queue.create({ data: { centerId, status: center.status } });
}

/**
 * Re-number every active (WAITING/SERVING) entry at a centre and refresh each
 * token's queuePosition + estimatedWait. Call inside a transaction after any
 * change to the queue.
 */
async function recalcQueue(tx: Tx, centerId: string): Promise<void> {
  const center = await tx.procurementCenter.findUniqueOrThrow({ where: { id: centerId } });
  const queue = await tx.queue.findUniqueOrThrow({ where: { centerId } });

  const active = await tx.queueEntry.findMany({
    where: { queueId: queue.id, status: { in: ['WAITING', 'SERVING'] } },
    orderBy: [{ status: 'asc' }, { position: 'asc' }, { joinedAt: 'asc' }],
  });

  let position = 1;
  for (const entry of active) {
    const queueAhead = Math.max(0, position - 1);
    const { predictedWait } = predictWaitingTime({
      queueAhead,
      avgProcessingTime: center.averageProcessingTime,
      activeCounters: center.activeCounters,
      capacity: center.capacity,
      served: center.farmersServed,
    });

    await tx.queueEntry.update({ where: { id: entry.id }, data: { position } });
    await tx.token.update({
      where: { id: entry.tokenId },
      data: { queuePosition: position, estimatedWait: predictedWait },
    });
    position += 1;
  }

  const waitingCount = active.filter((e) => e.status === 'WAITING').length;
  await tx.procurementCenter.update({
    where: { id: centerId },
    data: { currentQueue: waitingCount + active.filter((e) => e.status === 'SERVING').length },
  });
}

export interface QueueSnapshot {
  centerId: string;
  centerName: string;
  status: string;
  running: boolean;
  currentlyServing: string | null;
  currentTokenId: string | null;
  nextToken: string | null;
  nextTokenId: string | null;
  farmersAhead: number;
  farmersWaiting: number;
  estimatedWait: number;
  averageProcessingTime: number;
  activeCounters: number;
  queueEntries: {
    tokenId: string;
    tokenNumber: string;
    farmerName: string;
    position: number;
    status: string;
    estimatedWait: number;
  }[];
}

export async function getQueueSnapshot(centerId: string): Promise<QueueSnapshot> {
  const center = await prisma.procurementCenter.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Procurement centre not found');
  const queue = await ensureQueue(centerId);

  const entries = await prisma.queueEntry.findMany({
    where: { queueId: queue.id, status: { in: ['WAITING', 'SERVING'] } },
    orderBy: [{ status: 'asc' }, { position: 'asc' }],
    include: { token: { include: { farmer: { include: { user: true } } } } },
  });

  const serving = entries.find((e) => e.status === 'SERVING') ?? null;
  const waiting = entries.filter((e) => e.status === 'WAITING');
  const farmersAhead = waiting.length;

  const { predictedWait } = predictWaitingTime({
    queueAhead: farmersAhead,
    avgProcessingTime: center.averageProcessingTime,
    activeCounters: center.activeCounters,
    capacity: center.capacity,
    served: center.farmersServed,
  });

  return {
    centerId: center.id,
    centerName: center.name,
    status: queue.status,
    running: queue.running,
    currentlyServing: serving?.token.tokenNumber ?? null,
    currentTokenId: serving?.tokenId ?? null,
    nextToken: waiting[0]?.token.tokenNumber ?? null,
    nextTokenId: waiting[0]?.tokenId ?? null,
    farmersAhead,
    farmersWaiting: farmersAhead,
    estimatedWait: predictedWait,
    averageProcessingTime: center.averageProcessingTime,
    activeCounters: center.activeCounters,
    queueEntries: entries.map((e) => ({
      tokenId: e.tokenId,
      tokenNumber: e.token.tokenNumber,
      farmerName: e.token.farmer.user.name,
      position: e.position,
      status: e.status,
      estimatedWait: e.token.estimatedWait,
    })),
  };
}

/**
 * Finish the farmer currently being served and call the next token.
 * Transactional so the queue can never be left half-updated.
 */
export async function processNext(centerId: string): Promise<QueueSnapshot> {
  await prisma.$transaction(async (tx) => {
    const queue = await ensureQueue(centerId, tx);
    if (!queue.running) throw ApiError.conflict('Queue is paused');

    const serving = await tx.queueEntry.findFirst({
      where: { queueId: queue.id, status: 'SERVING' },
    });

    if (serving) {
      await tx.queueEntry.update({
        where: { id: serving.id },
        data: { status: 'COMPLETED', completedAt: new Date() },
      });
      await tx.token.update({ where: { id: serving.tokenId }, data: { status: 'COMPLETED' } });
      await tx.procurementCenter.update({
        where: { id: centerId },
        data: { farmersServed: { increment: 1 } },
      });
    }

    const next = await tx.queueEntry.findFirst({
      where: { queueId: queue.id, status: 'WAITING' },
      orderBy: [{ position: 'asc' }, { joinedAt: 'asc' }],
      include: { token: { include: { farmer: true } } },
    });

    if (next) {
      await tx.queueEntry.update({
        where: { id: next.id },
        data: { status: 'SERVING', startedAt: new Date() },
      });
      await tx.token.update({ where: { id: next.tokenId }, data: { status: 'SERVING' } });
      await tx.queue.update({ where: { id: queue.id }, data: { nowServingTokenId: next.tokenId } });

      await tx.notification.create({
        data: {
          farmerId: next.token.farmerId,
          type: 'TOKEN_UPDATE',
          title: 'It is your turn soon',
          message: `Token ${next.token.tokenNumber} is now being served at the counter.`,
          meta: { tokenNumber: next.token.tokenNumber } as Prisma.InputJsonValue,
        },
      });
    } else {
      await tx.queue.update({ where: { id: queue.id }, data: { nowServingTokenId: null } });
    }

    await recalcQueue(tx, centerId);
  });

  return getQueueSnapshot(centerId);
}

/** Mark a specific WAITING token SKIPPED and pull the queue forward. */
export async function skipToken(centerId: string, tokenId: string): Promise<QueueSnapshot> {
  await prisma.$transaction(async (tx) => {
    const queue = await ensureQueue(centerId, tx);
    const entry = await tx.queueEntry.findFirst({
      where: { queueId: queue.id, tokenId },
      include: { token: true },
    });
    if (!entry) throw ApiError.notFound('Token is not in this queue');
    if (entry.status === 'COMPLETED' || entry.status === 'SKIPPED') {
      throw ApiError.conflict(`Token already ${entry.status.toLowerCase()}`);
    }

    await tx.queueEntry.update({
      where: { id: entry.id },
      data: { status: 'SKIPPED', completedAt: new Date() },
    });
    await tx.token.update({ where: { id: tokenId }, data: { status: 'SKIPPED' } });

    // If we skipped the person being served, promote the next waiting token
    if (entry.status === 'SERVING') {
      const next = await tx.queueEntry.findFirst({
        where: { queueId: queue.id, status: 'WAITING' },
        orderBy: [{ position: 'asc' }, { joinedAt: 'asc' }],
      });
      if (next) {
        await tx.queueEntry.update({
          where: { id: next.id },
          data: { status: 'SERVING', startedAt: new Date() },
        });
        await tx.token.update({ where: { id: next.tokenId }, data: { status: 'SERVING' } });
        await tx.queue.update({ where: { id: queue.id }, data: { nowServingTokenId: next.tokenId } });
      }
    }

    await tx.notification.create({
      data: {
        farmerId: entry.token.farmerId,
        type: 'TOKEN_UPDATE',
        title: 'Token skipped',
        message: `Token ${entry.token.tokenNumber} was skipped. Please contact the centre desk.`,
      },
    });

    await recalcQueue(tx, centerId);
  });

  return getQueueSnapshot(centerId);
}

export async function setRunning(centerId: string, running: boolean): Promise<QueueSnapshot> {
  const queue = await ensureQueue(centerId);
  await prisma.queue.update({ where: { id: queue.id }, data: { running } });
  return getQueueSnapshot(centerId);
}

/** Add a booked token to the centre queue (used by tokenService.createToken). */
export async function attachToken(tx: Tx, centerId: string, tokenId: string): Promise<number> {
  const queue = await ensureQueue(centerId, tx);
  const lastActive = await tx.queueEntry.count({
    where: { queueId: queue.id, status: { in: ['WAITING', 'SERVING'] } },
  });
  const position = lastActive + 1;
  await tx.queueEntry.create({
    data: { queueId: queue.id, tokenId, position, status: 'WAITING' },
  });
  await tx.token.update({ where: { id: tokenId }, data: { status: 'WAITING', queuePosition: position } });
  return position;
}

export { recalcQueue };
