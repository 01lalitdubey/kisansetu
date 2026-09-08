import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok, ApiError } from '../utils/response';
import { validate, idSchema } from '../utils/validation';
import { prisma } from '../config/database';
import {
  createProcurement,
  listProcurements,
  updateProcurementStatus,
} from '../services/procurementService';

const createSchema = z.object({
  tokenId: z.string().min(1),
  declaredQuantity: z.number().positive(),
  actualQuantity: z.number().positive().optional(),
  qualityGrade: z.enum(['A', 'B', 'C']).optional(),
  status: z.enum(['PENDING', 'QUALITY_CHECK', 'WEIGHMENT', 'COMPLETED']).optional(),
});

export const postProcurement = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(createSchema, req.body);

  if (req.user?.role === 'CENTER_OFFICER') {
    const token = await prisma.token.findUnique({ where: { id: body.tokenId }, select: { centerId: true } });
    if (!token) throw ApiError.notFound('Token not found');
    if (token.centerId !== req.user.centerId) {
      throw ApiError.forbidden('You can only process tokens at your own centre');
    }
  }

  return ok(res, await createProcurement(body), 201);
});

export const getProcurements = asyncHandler(async (req: Request, res: Response) => {
  const filter: { centerId?: string; farmerId?: string } = {};
  if (typeof req.query.centerId === 'string') filter.centerId = req.query.centerId;
  if (typeof req.query.farmerId === 'string') filter.farmerId = req.query.farmerId;

  // Data isolation: a farmer can only ever see their own procurements;
  // an officer is scoped to their own centre.
  if (req.user?.role === 'FARMER') filter.farmerId = req.user.profileId;
  else if (req.user?.role === 'CENTER_OFFICER') filter.centerId = req.user.centerId;

  return ok(res, await listProcurements(filter));
});

/** GET /api/farmers/:id/procurements — the authenticated farmer's records. */
export const getFarmerProcurements = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  if (req.user?.role === 'FARMER' && req.user.profileId !== id) {
    return ok(res, []); // never leak another farmer's data
  }
  return ok(res, await listProcurements({ farmerId: id }));
});

const statusSchema = z.object({
  status: z.enum(['PENDING', 'QUALITY_CHECK', 'WEIGHMENT', 'COMPLETED']),
});

export const patchProcurementStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  const { status } = validate(statusSchema, req.body);

  // An officer may only update a procurement that belongs to THEIR centre —
  // requireRole('CENTER_OFFICER') alone doesn't check which centre.
  if (req.user?.role === 'CENTER_OFFICER') {
    const existing = await prisma.procurement.findUnique({ where: { id }, select: { centerId: true } });
    if (!existing) throw ApiError.notFound('Procurement not found');
    if (existing.centerId !== req.user.centerId) {
      throw ApiError.forbidden('You can only update procurements at your own centre');
    }
  }

  return ok(res, await updateProcurementStatus(id, status));
});
