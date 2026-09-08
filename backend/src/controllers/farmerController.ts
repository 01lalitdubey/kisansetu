import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ApiError, ok } from '../utils/response';
import { validate, idSchema, languageSchema, mobileSchema } from '../utils/validation';
import {
  getFarmerHistory,
  getFarmerProfile,
  listAllFarmers,
  updateFarmerProfile,
} from '../services/farmerService';
import { listFarmerTokens } from '../services/tokenService';
import { listNotifications } from '../services/notificationService';

/** A farmer may only read/write their own record; officers + admin may read any. */
function assertCanAccessFarmer(req: Request, farmerId: string, write = false): void {
  const u = req.user;
  if (!u) throw ApiError.unauthorized();
  if (u.role === 'ADMIN') return;
  if (u.role === 'CENTER_OFFICER' && !write) return;
  if (u.role === 'FARMER' && u.profileId === farmerId) return;
  throw ApiError.forbidden('You can only access your own farmer profile');
}

export const getFarmer = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  assertCanAccessFarmer(req, id);
  return ok(res, await getFarmerProfile(id));
});

export const listFarmers = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await listAllFarmers());
});

const patchSchema = z.object({
  name: z.string().min(2).optional(),
  mobile: mobileSchema.optional(),
  village: z.string().min(1).optional(),
  location: z.string().min(1).optional(),
  preferredLanguage: languageSchema.optional(),
  primaryCropId: z.string().optional(),
  approxQuantity: z.number().positive().optional(),
  addressLine: z.string().min(1).optional(),
  city: z.string().min(1).optional(),
  district: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits').optional(),
  latitude: z.number().gte(-90).lte(90).optional(),
  longitude: z.number().gte(-180).lte(180).optional(),
});

export const patchFarmer = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  assertCanAccessFarmer(req, id, true);
  const body = validate(patchSchema, req.body);
  return ok(res, await updateFarmerProfile(id, body));
});

export const getFarmerTokens = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  assertCanAccessFarmer(req, id);
  return ok(res, await listFarmerTokens(id));
});

export const getFarmerHistoryController = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  assertCanAccessFarmer(req, id);
  return ok(res, await getFarmerHistory(id));
});

export const getFarmerNotifications = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  assertCanAccessFarmer(req, id);
  return ok(res, await listNotifications(id));
});
