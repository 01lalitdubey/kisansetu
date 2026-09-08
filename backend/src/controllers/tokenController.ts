import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok, ApiError } from '../utils/response';
import { validate, idSchema, quantitySchema } from '../utils/validation';
import { prisma } from '../config/database';
import { cancelToken, createToken, getTokenById } from '../services/tokenService';

const createSchema = z.object({
  farmerId: z.string().min(1),
  centerId: z.string().min(1),
  scheduleId: z.string().min(1),
  cropId: z.string().min(1),
  quantity: quantitySchema,
});

export const postToken = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(createSchema, req.body);

  // A farmer must never be able to book a token "as" a different farmer by
  // passing someone else's farmerId in the body — the request body is never
  // trusted for identity, only for what's being booked.
  if (req.user?.role === 'FARMER' && req.user.profileId !== body.farmerId) {
    throw ApiError.forbidden('You can only book a token for your own account');
  }

  const token = await createToken(body);
  return ok(res, token, 201);
});

export const getToken = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  return ok(res, await getTokenById(id));
});

export const deleteToken = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);

  if (req.user?.role !== 'ADMIN') {
    const token = await prisma.token.findUnique({ where: { id }, select: { farmerId: true, centerId: true } });
    if (!token) throw ApiError.notFound('Token not found');
    const owns =
      (req.user?.role === 'FARMER' && token.farmerId === req.user.profileId) ||
      (req.user?.role === 'CENTER_OFFICER' && token.centerId === req.user.centerId);
    if (!owns) throw ApiError.forbidden('You can only cancel your own token');
  }

  return ok(res, await cancelToken(id));
});
