import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ApiError, ok } from '../utils/response';
import { validate, idSchema } from '../utils/validation';
import {
  getCenter,
  getCenterSchedules,
  getMyCenter,
  listAllSchedules,
  listCenters,
  registerCenter,
  setCenterApproval,
  updateCenter,
  updateCenterStatus,
} from '../services/centerService';
import { listCenterFarmers } from '../services/farmerService';
import { recommendSlot } from '../services/recommendationService';
import { centerAnalytics } from '../services/analyticsService';
import { getCenterHistory } from '../services/centerHistoryService';

/**
 * GET /api/center/history — completed procurement activity for the
 * authenticated officer's own centre (admins may pass ?centerId=).
 */
export const getOfficerCenterHistory = asyncHandler(async (req: Request, res: Response) => {
  let centerId = req.user?.centerId;
  if (req.user?.role === 'ADMIN' && typeof req.query.centerId === 'string') {
    centerId = req.query.centerId;
  }
  if (!centerId) throw ApiError.forbidden('No centre is associated with this account');

  const dateRange = typeof req.query.dateRange === 'string' ? req.query.dateRange : undefined;
  const search = typeof req.query.search === 'string' ? req.query.search : undefined;
  const crop = typeof req.query.crop === 'string' ? req.query.crop : undefined;
  return ok(res, await getCenterHistory(centerId, { dateRange, search, crop }));
});

export const getCenters = asyncHandler(async (req: Request, res: Response) => {
  // Admins may request every centre (incl. PENDING/REJECTED) with ?all=1
  const all = req.user?.role === 'ADMIN' && req.query.all === '1';
  return ok(res, await listCenters({ all }));
});

const registerSchema = z.object({
  name: z.string().min(3),
  contactNumber: z.string().trim().regex(/^[0-9+\- ]{6,15}$/, 'invalid contact number'),
  addressLine: z.string().min(3),
  city: z.string().min(2),
  district: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().regex(/^\d{6}$/, 'PIN code must be 6 digits'),
  latitude: z.number().gte(-90).lte(90),
  longitude: z.number().gte(-180).lte(180),
  capacity: z.number().int().min(10).max(2000),
  activeCounters: z.number().int().min(1).max(30),
  supportedCrops: z.array(z.string()).min(1),
  officerName: z.string().min(2).optional(),
});

export const postRegisterCenter = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const body = validate(registerSchema, req.body);
  return ok(res, await registerCenter(req.user.userId, body), 201);
});

export const getMyCenterController = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.centerId) throw ApiError.forbidden('No procurement centre is associated with this account');
  return ok(res, await getMyCenter(req.user.centerId));
});

const patchCenterSchema = z.object({
  name: z.string().min(3).optional(),
  contactNumber: z.string().optional(),
  addressLine: z.string().optional(),
  city: z.string().optional(),
  district: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  capacity: z.number().int().min(10).optional(),
  activeCounters: z.number().int().min(1).optional(),
  supportedCrops: z.array(z.string()).optional(),
});

export const patchCenter = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw ApiError.unauthorized();
  const id = validate(idSchema, req.params.id);
  const body = validate(patchCenterSchema, req.body);
  return ok(res, await updateCenter(id, body, req.user));
});

const approvalSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REINSTATE']),
});

export const postCenterApproval = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  const { action } = validate(approvalSchema, req.body);
  return ok(res, await setCenterApproval(id, action));
});

export const getCenterById = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  return ok(res, await getCenter(id));
});

export const getSchedulesForCenter = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  return ok(res, await getCenterSchedules(id));
});

export const getAllSchedules = asyncHandler(async (req: Request, res: Response) => {
  // /api/schedules or /api/schedules/:centerId (param optional)
  if (req.params.centerId) {
    return ok(res, await getCenterSchedules(req.params.centerId));
  }
  return ok(res, await listAllSchedules());
});

const recommendedQuery = z.object({
  centerId: z.string().min(1),
  cropId: z.string().optional(),
  quantity: z.coerce.number().positive().optional(),
});

export const getRecommendedSchedule = asyncHandler(async (req: Request, res: Response) => {
  const q = validate(recommendedQuery, req.query);
  return ok(res, await recommendSlot(q));
});

export const getCenterFarmers = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  return ok(res, await listCenterFarmers(id));
});

export const getCenterAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.centerId ?? req.params.id);
  return ok(res, await centerAnalytics(id));
});

const statusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'CLOSED', 'OVERLOADED']),
});

export const patchCenterStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  const { status } = validate(statusSchema, req.body);
  return ok(res, await updateCenterStatus(id, status));
});
