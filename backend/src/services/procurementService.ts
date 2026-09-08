import { Prisma, type ProcurementStatus } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/response';
import { recalcQueue, ensureQueue } from './queueService';

type Tx = Prisma.TransactionClient;

const GRADE_FACTOR: Record<string, number> = { A: 1, B: 0.95, C: 0.9 };

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

async function buildProcurement(
  tx: Tx,
  args: {
    tokenId: string;
    declaredQuantity: number;
    actualQuantity?: number;
    qualityGrade?: string;
    status?: ProcurementStatus;
  },
) {
  const token = await tx.token.findUnique({
    where: { id: args.tokenId },
    include: { crop: true },
  });
  if (!token) throw ApiError.notFound('Token not found');

  const existing = await tx.procurement.findUnique({ where: { tokenId: args.tokenId } });
  if (existing) throw ApiError.conflict('Procurement already recorded for this token');

  const msp = token.crop.msp ?? 2000;
  const grade = args.qualityGrade ?? 'A';
  const actual = args.actualQuantity ?? money(args.declaredQuantity * 0.995);
  const totalAmount = money(actual * msp * (GRADE_FACTOR[grade] ?? 1));
  const status = args.status ?? 'COMPLETED';

  const procurement = await tx.procurement.create({
    data: {
      tokenId: token.id,
      farmerId: token.farmerId,
      centerId: token.centerId,
      cropId: token.cropId,
      declaredQuantity: args.declaredQuantity,
      actualQuantity: actual,
      qualityGrade: grade,
      msp,
      totalAmount,
      status,
    },
  });

  const expected = new Date();
  expected.setDate(expected.getDate() + 3);

  await tx.payment.create({
    data: {
      procurementId: procurement.id,
      farmerId: token.farmerId,
      amount: totalAmount,
      status: 'PROCESSING',
      expectedDate: expected,
    },
  });

  await tx.notification.create({
    data: {
      farmerId: token.farmerId,
      type: 'PAYMENT_UPDATE',
      title: 'Procurement complete — payment initiated',
      message: `Payment of ₹${totalAmount.toLocaleString('en-IN')} for ${token.crop.name} is being processed.`,
      meta: { amount: String(totalAmount), grade } as Prisma.InputJsonValue,
    },
  });

  return procurement;
}

/** POST /api/procurements — record a procurement for a token. */
export async function createProcurement(input: {
  tokenId: string;
  declaredQuantity: number;
  actualQuantity?: number;
  qualityGrade?: string;
  status?: ProcurementStatus;
}) {
  return prisma.$transaction((tx) => buildProcurement(tx, input));
}

/**
 * Queue action "Mark Complete": close the token, advance the queue and
 * create the procurement + payment records in one transaction.
 */
export async function completeToken(centerId: string, tokenId: string, opts?: {
  actualQuantity?: number;
  qualityGrade?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const queue = await ensureQueue(centerId, tx);
    const entry = await tx.queueEntry.findFirst({
      where: { queueId: queue.id, tokenId },
      include: { token: true },
    });
    if (!entry) throw ApiError.notFound('Token is not in this queue');
    if (entry.status === 'COMPLETED') throw ApiError.conflict('Token already completed');

    const wasServing = entry.status === 'SERVING';

    await tx.queueEntry.update({
      where: { id: entry.id },
      data: { status: 'COMPLETED', startedAt: entry.startedAt ?? new Date(), completedAt: new Date() },
    });
    await tx.token.update({ where: { id: tokenId }, data: { status: 'COMPLETED' } });
    await tx.procurementCenter.update({
      where: { id: centerId },
      data: { farmersServed: { increment: 1 } },
    });

    if (wasServing) {
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
      } else {
        await tx.queue.update({ where: { id: queue.id }, data: { nowServingTokenId: null } });
      }
    }

    const procurement = await buildProcurement(tx, {
      tokenId,
      declaredQuantity: entry.token.quantity,
      actualQuantity: opts?.actualQuantity,
      qualityGrade: opts?.qualityGrade,
      status: 'COMPLETED',
    });

    await recalcQueue(tx, centerId);
    return procurement;
  });
}

export async function listProcurements(filter: { centerId?: string; farmerId?: string } = {}) {
  return prisma.procurement.findMany({
    where: filter,
    orderBy: { createdAt: 'desc' },
    include: {
      crop: true,
      center: true,
      farmer: { include: { user: true } },
      payment: true,
      token: true,
      transport: true,
    },
  });
}

export async function updateProcurementStatus(id: string, status: ProcurementStatus) {
  const existing = await prisma.procurement.findUnique({ where: { id } });
  if (!existing) throw ApiError.notFound('Procurement not found');
  return prisma.procurement.update({ where: { id }, data: { status } });
}
