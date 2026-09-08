import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ApiError, ok } from '../utils/response';
import { validate, idSchema } from '../utils/validation';
import {
  bookTransport,
  cancelTransport,
  getTransport,
  getVehicleOptions,
  listFarmerTransports,
  quoteTransport,
  updateTransportStatus,
} from '../services/transportService';

const vehicleEnum = z.enum(['SMALL', 'MEDIUM', 'LARGE']);

export const getOptions = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, getVehicleOptions());
});

const quoteSchema = z.object({
  procurementId: z.string().min(1),
  vehicleType: vehicleEnum,
  destination: z.string().min(1).optional(),
});

export const postQuote = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(quoteSchema, req.body);
  return ok(res, await quoteTransport(body));
});

const bookSchema = z.object({
  procurementId: z.string().min(1),
  vehicleType: vehicleEnum,
  destination: z.string().min(1).optional(),
});

export const postBook = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(bookSchema, req.body);
  const farmerId = req.user?.profileId;
  if (!farmerId || req.user?.role !== 'FARMER') {
    throw ApiError.forbidden('Only a farmer can book transport');
  }
  const transport = await bookTransport({ farmerId, ...body });
  return ok(res, transport, 201);
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  const transport = await getTransport(id);
  if (req.user?.role === 'FARMER' && transport.farmerId !== req.user.profileId) {
    throw ApiError.forbidden('Not your transport booking');
  }
  return ok(res, transport);
});

export const getFarmerTransports = asyncHandler(async (req: Request, res: Response) => {
  const farmerId = validate(idSchema, req.params.farmerId);
  if (req.user?.role === 'FARMER' && req.user.profileId !== farmerId) {
    throw ApiError.forbidden('Not your transport history');
  }
  return ok(res, await listFarmerTransports(farmerId));
});

export const postCancel = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  const farmerId = req.user?.profileId;
  if (!farmerId || req.user?.role !== 'FARMER') throw ApiError.forbidden('Only a farmer can cancel');
  return ok(res, await cancelTransport(id, farmerId));
});

const statusSchema = z.object({
  status: z
    .enum(['REQUESTED', 'ASSIGNED', 'ON_THE_WAY', 'PICKED_UP', 'DELIVERED', 'CANCELLED'])
    .optional(),
});

export const postStatus = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  const { status } = validate(statusSchema, req.body ?? {});
  return ok(res, await updateTransportStatus(id, status));
});
