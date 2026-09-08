import { prisma } from '../config/database';
import { ApiError } from '../utils/response';

/**
 * Centre History (Phase 4) — completed procurement activity for ONE centre.
 * The centre is derived from the authenticated officer; an officer can never
 * see another centre's history.
 */

const RANGE_DAYS: Record<string, number> = {
  today: 1,
  '1d': 1,
  yesterday: 2,
  '7d': 7,
  '30d': 30,
};

export async function getCenterHistory(
  centerId: string,
  opts: { dateRange?: string; search?: string; crop?: string } = {},
) {
  const center = await prisma.procurementCenter.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Procurement centre not found');

  const days = RANGE_DAYS[opts.dateRange ?? '7d'] ?? 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const search = opts.search?.trim().toLowerCase();

  const procurements = await prisma.procurement.findMany({
    where: {
      centerId,
      status: 'COMPLETED',
      createdAt: { gte: since },
      ...(opts.crop ? { crop: { name: { equals: opts.crop, mode: 'insensitive' } } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      crop: true,
      token: true,
      farmer: { include: { user: true } },
      payment: true,
      transport: true,
    },
  });

  const rows = procurements
    .map((p) => ({
      id: p.id,
      date: p.createdAt,
      completedAt: p.updatedAt,
      token: p.token.tokenNumber,
      farmer: p.farmer.user.name,
      farmerMobile: p.farmer.user.mobile,
      crop: p.crop.name,
      quantity: p.actualQuantity ?? p.declaredQuantity,
      declaredQuantity: p.declaredQuantity,
      qualityGrade: p.qualityGrade,
      amount: p.totalAmount,
      status: p.status,
      paymentStatus: p.payment?.status ?? 'PENDING',
      transportStatus: p.transport?.status ?? null,
    }))
    .filter((r) => {
      if (!search) return true;
      return (
        r.farmer.toLowerCase().includes(search) ||
        r.token.toLowerCase().includes(search) ||
        r.crop.toLowerCase().includes(search)
      );
    });

  return {
    center: { id: center.id, name: center.name },
    dateRange: opts.dateRange ?? '7d',
    count: rows.length,
    totalQuantity: Math.round(rows.reduce((s, r) => s + r.quantity, 0)),
    totalValue: Math.round(rows.reduce((s, r) => s + (r.amount ?? 0), 0)),
    records: rows,
  };
}
