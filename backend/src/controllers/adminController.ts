import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok } from '../utils/response';
import { adminCenters, adminOverview } from '../services/analyticsService';
import { listAllFarmers } from '../services/farmerService';
import { listProcurements } from '../services/procurementService';
import { getActiveLoadBalancing } from '../services/recommendationService';
import { paymentsOverview } from '../services/paymentService';
import { prisma } from '../config/database';

export const getTransportOverview = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await paymentsOverview());
});

export const getOverview = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await adminOverview());
});

export const getAdminCenters = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await adminCenters());
});

export const getAdminFarmers = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await listAllFarmers());
});

export const getAdminProcurements = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await listProcurements());
});

export const getAdminPayments = asyncHandler(async (_req: Request, res: Response) => {
  const payments = await prisma.payment.findMany({
    orderBy: { createdAt: 'desc' },
    include: { farmer: { include: { user: true } }, procurement: { include: { crop: true, center: true } } },
  });
  const sum = payments.reduce((s, p) => s + p.amount, 0);
  const countBy = (st: string) => payments.filter((p) => p.status === st).length;
  return ok(res, {
    totalValue: Math.round(sum),
    byStatus: {
      PENDING: countBy('PENDING'),
      PROCESSING: countBy('PROCESSING'),
      PAID: countBy('PAID'),
      FAILED: countBy('FAILED'),
      REFUNDED: countBy('REFUNDED'),
      DELAYED: countBy('DELAYED'),
    },
    byKind: {
      PROCUREMENT: payments.filter((p) => p.kind === 'PROCUREMENT').length,
      TRANSPORT: payments.filter((p) => p.kind === 'TRANSPORT').length,
    },
    payments,
  });
});

export const getAdminInsights = asyncHandler(async (_req: Request, res: Response) => {
  const rec = await getActiveLoadBalancing();
  const centers = await adminCenters();
  const overloaded = centers.filter((c) => c.load === 'HIGH');
  const insights: string[] = [];
  for (const c of overloaded) {
    insights.push(`${c.name} is at ${c.utilization}% utilisation with a predicted ${c.predictedWait} min wait.`);
  }
  if (rec) {
    insights.push(
      `AI suggests redirecting ${rec.redirectFarmers} farmers from ${rec.fromCenter.name} to ${rec.toCenter.name} (~${rec.reductionPercent}% wait reduction).`,
    );
  }
  if (insights.length === 0) insights.push('All centres are within capacity. No load-balancing action needed.');
  return ok(res, { insights, recommendation: rec });
});
