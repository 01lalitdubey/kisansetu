import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ApiError, ok } from '../utils/response';
import { validate, idSchema } from '../utils/validation';
import {
  demoConfirmPayment,
  getPayment,
  handleStripeWebhook,
  listFarmerPayments,
  paymentsOverview,
  startTransportPayment,
  stripeConfigured,
  verifyCheckoutSession,
} from '../services/paymentService';

const startSchema = z.object({ transportId: z.string().min(1) });

export const postStartTransportPayment = asyncHandler(async (req: Request, res: Response) => {
  const { transportId } = validate(startSchema, req.body);
  const farmerId = req.user?.profileId;
  if (!farmerId || req.user?.role !== 'FARMER') throw ApiError.forbidden('Only a farmer can pay');
  return ok(res, await startTransportPayment({ transportId, farmerId }));
});

export const getVerify = asyncHandler(async (req: Request, res: Response) => {
  const sessionId = typeof req.query.session_id === 'string' ? req.query.session_id : '';
  if (!sessionId) throw ApiError.badRequest('session_id is required');
  return ok(res, await verifyCheckoutSession(sessionId));
});

const demoSchema = z.object({ paymentId: z.string().min(1) });
export const postDemoConfirm = asyncHandler(async (req: Request, res: Response) => {
  const { paymentId } = validate(demoSchema, req.body);
  const farmerId = req.user?.profileId;
  if (!farmerId || req.user?.role !== 'FARMER') throw ApiError.forbidden('Only a farmer can pay');
  return ok(res, await demoConfirmPayment(paymentId, farmerId));
});

export const getById = asyncHandler(async (req: Request, res: Response) => {
  const id = validate(idSchema, req.params.id);
  const payment = await getPayment(id);
  if (req.user?.role === 'FARMER' && payment.farmerId !== req.user.profileId) {
    throw ApiError.forbidden('Not your payment');
  }
  return ok(res, payment);
});

export const getFarmerPayments = asyncHandler(async (req: Request, res: Response) => {
  const farmerId = validate(idSchema, req.params.farmerId);
  if (req.user?.role === 'FARMER' && req.user.profileId !== farmerId) {
    throw ApiError.forbidden('Not your payments');
  }
  return ok(res, await listFarmerPayments(farmerId));
});

export const getConfig = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, { stripeConfigured, currency: 'inr' });
});

export const getAdminOverview = asyncHandler(async (_req: Request, res: Response) => {
  return ok(res, await paymentsOverview());
});

/**
 * Stripe webhook. Mounted with express.raw() so `req.body` is a Buffer.
 * Never trust the frontend — this is the authoritative "PAID" signal.
 */
export const postWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];
  if (typeof signature !== 'string') throw ApiError.badRequest('Missing stripe-signature header');
  try {
    const result = await handleStripeWebhook(req.body as Buffer, signature);
    return res.status(200).json(result);
  } catch (err) {
    return res
      .status(400)
      .json({ success: false, message: err instanceof Error ? err.message : 'Webhook error' });
  }
});
