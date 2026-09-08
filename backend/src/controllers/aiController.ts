import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok, ApiError } from '../utils/response';
import { validate, languageSchema } from '../utils/validation';
import { prisma } from '../config/database';
import {
  applyLoadBalancing,
  computeCenterLoad,
  detectLoadBalancing,
  getActiveLoadBalancing,
  predictWaitingTime,
  recommendSlot,
} from '../services/recommendationService';
import { buildChatContext, SYSTEM_PROMPT, languageInstruction } from '../services/chatContextService';
import { buildFallbackReply } from '../services/chatFallbackService';
import { generateAgentReply, geminiConfigured } from '../services/geminiService';

/** POST /api/ai/waiting-time — deterministic wait prediction. */
const waitSchema = z.object({
  centerId: z.string().optional(),
  queueAhead: z.number().int().min(0).optional(),
  avgProcessingTime: z.number().positive().optional(),
  activeCounters: z.number().int().positive().optional(),
  hour: z.number().int().min(0).max(23).optional(),
});

export const postWaitingTime = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(waitSchema, { ...req.body, ...req.query });

  if (body.centerId) {
    const center = await prisma.procurementCenter.findUnique({ where: { id: body.centerId } });
    if (!center) throw ApiError.notFound('Procurement centre not found');
    const prediction = predictWaitingTime({
      queueAhead: body.queueAhead ?? center.currentQueue,
      avgProcessingTime: body.avgProcessingTime ?? center.averageProcessingTime,
      activeCounters: body.activeCounters ?? center.activeCounters,
      capacity: center.capacity,
      served: center.farmersServed,
      hour: body.hour,
    });
    await prisma.aiPrediction.create({
      data: { kind: 'WAIT_TIME', centerId: center.id, predictedWait: prediction.predictedWait, confidence: prediction.confidence, factors: prediction.factors },
    });
    return ok(res, prediction);
  }

  if (body.queueAhead === undefined || body.avgProcessingTime === undefined || body.activeCounters === undefined) {
    throw ApiError.badRequest('Provide centerId, or queueAhead + avgProcessingTime + activeCounters');
  }
  return ok(
    res,
    predictWaitingTime({
      queueAhead: body.queueAhead,
      avgProcessingTime: body.avgProcessingTime,
      activeCounters: body.activeCounters,
      hour: body.hour,
    }),
  );
});

/** POST /api/ai/recommend-slot */
const slotSchema = z.object({
  centerId: z.string().min(1),
  farmerId: z.string().optional(),
  cropId: z.string().optional(),
  quantity: z.number().positive().optional(),
});

export const postRecommendSlot = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(slotSchema, req.body);
  return ok(res, await recommendSlot(body));
});

/** GET /api/ai/center-load */
export const getCenterLoad = asyncHandler(async (req: Request, res: Response) => {
  if (typeof req.query.centerId === 'string') {
    const center = await prisma.procurementCenter.findUnique({ where: { id: req.query.centerId } });
    if (!center) throw ApiError.notFound('Procurement centre not found');
    return ok(res, computeCenterLoad(center));
  }
  const centers = await prisma.procurementCenter.findMany({ orderBy: { name: 'asc' } });
  return ok(res, centers.map(computeCenterLoad));
});

/** GET /api/ai/load-balancing — detect + return the current recommendation. */
export const getLoadBalancing = asyncHandler(async (_req: Request, res: Response) => {
  const detected = await detectLoadBalancing();
  const active = detected ?? (await getActiveLoadBalancing());
  return ok(res, active);
});

/** POST /api/ai/load-balancing/apply */
const applySchema = z.object({ recommendationId: z.string().min(1) });

export const postApplyLoadBalancing = asyncHandler(async (req: Request, res: Response) => {
  const { recommendationId } = validate(applySchema, req.body);
  const result = await applyLoadBalancing(recommendationId);
  return ok(res, result);
});

/**
 * POST /api/ai/chat — the KisanSetu AI Assistant.
 *
 * farmerId comes ONLY from the authenticated session (req.user), never from
 * the request body. Tries Gemini first (when configured); on any failure —
 * missing key, quota, network, timeout — falls back to a deterministic
 * reply built from the same real KisanSetu data, so the assistant is never
 * broken even when Gemini is unavailable.
 */
const chatHistorySchema = z
  .array(
    z.object({
      role: z.enum(['user', 'assistant']),
      text: z.string().trim().min(1).max(800),
    }),
  )
  .max(10)
  .default([]);

const chatSchema = z.object({
  message: z.string().trim().min(1, 'message is required').max(800, 'message is too long'),
  history: chatHistorySchema,
  language: languageSchema.optional(),
});

export const postChat = asyncHandler(async (req: Request, res: Response) => {
  const farmerId = req.user!.profileId;
  if (!farmerId) throw ApiError.forbidden('No farmer profile is linked to this account');

  const body = validate(chatSchema, req.body);
  const language = body.language ?? 'en';

  const respond = (message: string, source: 'gemini' | 'fallback') => ok(res, { message, language, source });

  // Deterministic, still real-data-grounded reply used whenever the Gemini
  // agent is unavailable or fails — computed lazily so the happy path (agent
  // succeeds) never pays for this extra DB round-trip.
  const fallback = async () => {
    const context = await buildChatContext(farmerId, body.message);
    const farmerName = (context.data.farmer as { name?: string } | undefined)?.name;
    return respond(buildFallbackReply(context, language, farmerName), 'fallback');
  };

  if (!geminiConfigured) {
    // eslint-disable-next-line no-console
    console.warn('[gemini] GEMINI_API_KEY not configured — using fallback assistant');
    return fallback();
  }

  try {
    const systemInstruction = `${SYSTEM_PROMPT}\n\n${languageInstruction(language)}`;
    const history = (body.history ?? []).slice(-8).map((h) => ({
      role: h.role === 'assistant' ? ('model' as const) : ('user' as const),
      text: h.text,
    }));

    const reply = await generateAgentReply({
      systemInstruction,
      history,
      message: body.message,
      ctx: { farmerId },
    });
    return respond(reply, 'gemini');
  } catch (err) {
    // Never leak the API key or raw provider errors to the client — the
    // detailed reason is already logged server-side by geminiService.
    return fallback();
  }
});
