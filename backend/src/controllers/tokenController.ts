import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok } from '../utils/response';
import { validate, idSchema, quantitySchema } from '../utils/validation';
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
  const token = await createToken(body);
  return ok(res, token, 201);
});

export const getToken = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  return ok(res, await getTokenById(id));
});

export const deleteToken = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  return ok(res, await cancelToken(id));
});
