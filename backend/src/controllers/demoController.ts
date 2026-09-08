import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok } from '../utils/response';
import { validate } from '../utils/validation';
import {
  resetDemo,
  simulateHighDemand,
  simulateProcessToken,
  simulateQueueReduction,
  simulateScheduleChange,
} from '../services/demoService';

export const postHighDemand = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await simulateHighDemand()),
);

export const postQueueReduction = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await simulateQueueReduction()),
);

export const postScheduleChange = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await simulateScheduleChange()),
);

const processSchema = z.object({ centerId: z.string().optional() });

export const postProcessToken = asyncHandler(async (req: Request, res: Response) => {
  const { centerId } = validate(processSchema, req.body ?? {});
  return ok(res, await simulateProcessToken(centerId));
});

export const postReset = asyncHandler(async (_req: Request, res: Response) =>
  ok(res, await resetDemo()),
);
