import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok } from '../utils/response';
import { validate, idSchema } from '../utils/validation';
import { getQueueSnapshot, processNext, setRunning, skipToken } from '../services/queueService';
import { completeToken } from '../services/procurementService';

export const getQueue = asyncHandler(async (req: Request, res: Response) => {
  const centerId = validate(idSchema, req.params.centerId);
  return ok(res, await getQueueSnapshot(centerId));
});

export const postProcessNext = asyncHandler(async (req: Request, res: Response) => {
  const centerId = validate(idSchema, req.params.centerId);
  return ok(res, await processNext(centerId));
});

const tokenBody = z.object({ tokenId: z.string().min(1) });

export const postSkip = asyncHandler(async (req: Request, res: Response) => {
  const centerId = validate(idSchema, req.params.centerId);
  const { tokenId } = validate(tokenBody, req.body);
  return ok(res, await skipToken(centerId, tokenId));
});

const completeBody = z.object({
  tokenId: z.string().min(1),
  actualQuantity: z.number().positive().optional(),
  qualityGrade: z.enum(['A', 'B', 'C']).optional(),
});

export const postComplete = asyncHandler(async (req: Request, res: Response) => {
  const centerId = validate(idSchema, req.params.centerId);
  const body = validate(completeBody, req.body);
  const procurement = await completeToken(centerId, body.tokenId, {
    actualQuantity: body.actualQuantity,
    qualityGrade: body.qualityGrade,
  });
  const queue = await getQueueSnapshot(centerId);
  return ok(res, { procurement, queue });
});

const pauseBody = z.object({ running: z.boolean() });

export const postSetRunning = asyncHandler(async (req: Request, res: Response) => {
  const centerId = validate(idSchema, req.params.centerId);
  const { running } = validate(pauseBody, req.body);
  return ok(res, await setRunning(centerId, running));
});
