import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ApiError, ok } from '../utils/response';
import { validate, idSchema } from '../utils/validation';
import {
  createNotification,
  listNotifications,
  markAllRead,
  markRead,
} from '../services/notificationService';

/**
 * GET /api/notifications           -> current farmer's feed
 * GET /api/notifications/:farmerId  -> that farmer's feed (must be the caller,
 *                                      or an officer/admin)
 */
export const getNotifications = asyncHandler(async (req: Request, res: Response) => {
  let farmerId = req.params.farmerId ? validate(idSchema, req.params.farmerId) : undefined;
  const u = req.user;

  if (u?.role === 'FARMER') {
    if (farmerId && farmerId !== u.profileId) throw ApiError.forbidden('Not your notifications');
    farmerId = u.profileId;
  }
  return ok(res, await listNotifications(farmerId));
});

const createSchema = z.object({
  farmerId: z.string().optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  type: z.enum([
    'SCHEDULE_CHANGE',
    'QUEUE_ALERT',
    'PROCUREMENT_STARTED',
    'TOKEN_UPDATE',
    'HIGH_DEMAND',
    'PAYMENT_UPDATE',
    'TRANSPORT_UPDATE',
  ]),
  meta: z.record(z.string()).optional(),
});

export const postNotification = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(createSchema, req.body);
  return ok(res, await createNotification(body), 201);
});

export const patchNotificationRead = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  return ok(res, await markRead(id));
});

export const postMarkAllRead = asyncHandler(async (req: Request, res: Response) => {
  const farmerId = validate(idSchema, req.params.farmerId);
  return ok(res, await markAllRead(farmerId));
});
