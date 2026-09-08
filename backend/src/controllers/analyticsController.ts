import type { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok } from '../utils/response';
import { validate, idSchema } from '../utils/validation';
import {
  centerAnalytics,
  centerUtilizationSeries,
  cropProcurementSeries,
  farmersServedSeries,
  peakHoursSeries,
  waitingTimeSeries,
} from '../services/analyticsService';

export const getFarmersServed = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await farmersServedSeries()),
);

export const getWaitingTime = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await waitingTimeSeries()),
);

export const getCenterUtilization = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await centerUtilizationSeries()),
);

export const getCropProcurement = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await cropProcurementSeries()),
);

export const getPeakHours = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await peakHoursSeries()),
);

export const getCenterAnalytics = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.centerId);
  return ok(res, await centerAnalytics(id));
});
