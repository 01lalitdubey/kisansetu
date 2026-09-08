import type Stripe from 'stripe';
import { prisma } from '../config/database';
import { ApiError } from '../utils/response';
import {
  constructEvent,
  createCheckoutSession,
  retrieveSession,
  stripeConfigured,
} from './stripeService';

/**
 * ---------------------------------------------------------------------------
 *  PAYMENT SERVICE  (Phase 4 — Stripe transport payments + 1% platform fee)
 *
 *  SAFETY:
 *   - The Stripe secret never leaves the server.
 *   - A payment is marked PAID only after the backend verifies it with Stripe
 *     (webhook or a server-side session retrieve). The frontend's word is
 *     never trusted.
 *   - When Stripe is not configured the flow degrades to an explicit
 *     Demo Payment that clearly charges no real money.
 * ---------------------------------------------------------------------------
 */

const round2 = (n: number) => Math.round(n * 100) / 100;
const toPaise = (rupees: number) => Math.round(rupees * 100);

export { stripeConfigured };

async function advanceTransportAfterPayment(transportId: string) {
  const transport = await prisma.transport.findUnique({ where: { id: transportId } });
  if (!transport) return;
  if (transport.status === 'REQUESTED') {
    // reuse the transport status machine (assigns a demo driver)
    const { updateTransportStatus } = await import('./transportService');
    await updateTransportStatus(transportId, 'ASSIGNED');
  }
}

async function markPaymentPaid(paymentId: string, stripePaymentIntentId?: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) return;
  if (payment.status === 'PAID') return;

  await prisma.payment.update({
    where: { id: paymentId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
    },
  });

  if (payment.transportId) {
    await advanceTransportAfterPayment(payment.transportId);
    await prisma.notification.create({
      data: {
        farmerId: payment.farmerId,
        type: 'PAYMENT_UPDATE',
        title: 'Payment successful',
        message: 'Your transport booking has been confirmed.',
        meta: { amount: String(payment.amount) },
      },
    });
  }
}

export interface StartPaymentResult {
  mode: 'stripe' | 'demo';
  payment: {
    id: string;
    amount: number;
    transportAmount: number;
    platformFee: number;
    currency: string;
    status: string;
  };
  checkoutUrl?: string;
  sessionId?: string;
  stripeConfigured: boolean;
}

/** Begin payment for a transport booking. */
export async function startTransportPayment(params: {
  transportId: string;
  farmerId: string;
}): Promise<StartPaymentResult> {
  const transport = await prisma.transport.findUnique({
    where: { id: params.transportId },
    include: { payment: true, farmer: { include: { user: true } }, center: true },
  });
  if (!transport) throw ApiError.notFound('Transport not found');
  if (transport.farmerId !== params.farmerId) throw ApiError.forbidden('Not your transport booking');
  if (transport.status === 'CANCELLED') throw ApiError.conflict('Transport booking is cancelled');
  if (transport.payment?.status === 'PAID') throw ApiError.conflict('This transport is already paid');

  const transportAmount = round2(transport.estimatedCost);
  const platformFee = round2(transport.platformFee);
  const amount = round2(transportAmount + platformFee);

  // reuse an in-flight payment row or create one
  const payment =
    transport.payment ??
    (await prisma.payment.create({
      data: {
        kind: 'TRANSPORT',
        transportId: transport.id,
        farmerId: params.farmerId,
        amount,
        transportAmount,
        platformFee,
        currency: 'inr',
        status: 'PENDING',
      },
    }));

  const summary = {
    id: payment.id,
    amount,
    transportAmount,
    platformFee,
    currency: 'inr',
    status: payment.status,
  };

  if (!stripeConfigured) {
    return { mode: 'demo', payment: summary, stripeConfigured: false };
  }

  const session = await createCheckoutSession({
    amountPaise: toPaise(amount),
    currency: 'inr',
    description: `KisanSetu AI transport — ${transport.center.name} → ${transport.destination}`,
    customerEmail: transport.farmer.user.email,
    metadata: {
      paymentId: payment.id,
      transportId: transport.id,
      farmerId: params.farmerId,
      transportAmount: String(transportAmount),
      platformFee: String(platformFee),
    },
  });

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'PROCESSING', stripeCheckoutSessionId: session.id },
  });

  return {
    mode: 'stripe',
    payment: { ...summary, status: 'PROCESSING' },
    checkoutUrl: session.url ?? undefined,
    sessionId: session.id,
    stripeConfigured: true,
  };
}

/** Server-side verify of a completed Checkout session (fallback to webhook). */
export async function verifyCheckoutSession(sessionId: string) {
  if (!stripeConfigured) throw ApiError.badRequest('Stripe is not configured');
  const session = await retrieveSession(sessionId);
  const payment = await prisma.payment.findFirst({ where: { stripeCheckoutSessionId: sessionId } });
  if (!payment) throw ApiError.notFound('Payment not found for this session');

  if (session.payment_status === 'paid') {
    await markPaymentPaid(payment.id, (session.payment_intent as string) ?? undefined);
  }
  return prisma.payment.findUnique({ where: { id: payment.id }, include: { transport: true } });
}

/** Stripe webhook — the authoritative confirmation path. */
export async function handleStripeWebhook(rawBody: Buffer, signature: string) {
  const event = constructEvent(rawBody, signature);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const payment = await prisma.payment.findFirst({
      where: { stripeCheckoutSessionId: session.id },
    });
    if (payment && session.payment_status === 'paid') {
      await markPaymentPaid(payment.id, (session.payment_intent as string) ?? undefined);
    }
  }

  if (event.type === 'checkout.session.expired' || event.type === 'payment_intent.payment_failed') {
    const obj = event.data.object as { id?: string; metadata?: Record<string, string> };
    const paymentId = obj.metadata?.paymentId;
    if (paymentId) {
      await prisma.payment
        .update({ where: { id: paymentId }, data: { status: 'FAILED' } })
        .catch(() => undefined);
    }
  }

  return { received: true, type: event.type };
}

/**
 * Demo Payment — ONLY available when Stripe is not configured.
 * Clearly marked; charges no real money.
 */
export async function demoConfirmPayment(paymentId: string, farmerId: string) {
  if (stripeConfigured) {
    throw ApiError.badRequest('Demo Payment is disabled because Stripe is configured. Use Stripe Checkout.');
  }
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw ApiError.notFound('Payment not found');
  if (payment.farmerId !== farmerId) throw ApiError.forbidden('Not your payment');
  if (payment.status === 'PAID') return payment;

  await prisma.payment.update({
    where: { id: paymentId },
    data: { status: 'PAID', paidAt: new Date(), stripePaymentIntentId: `demo_${paymentId}` },
  });
  if (payment.transportId) await advanceTransportAfterPayment(payment.transportId);
  await prisma.notification.create({
    data: {
      farmerId,
      type: 'PAYMENT_UPDATE',
      title: 'Payment successful (demo)',
      message: 'Demo payment — no real money was charged. Your transport booking is confirmed.',
    },
  });
  return prisma.payment.findUnique({ where: { id: paymentId }, include: { transport: true } });
}

export async function getPayment(id: string) {
  const payment = await prisma.payment.findUnique({
    where: { id },
    include: { transport: { include: { center: true } }, procurement: { include: { crop: true } } },
  });
  if (!payment) throw ApiError.notFound('Payment not found');
  return payment;
}

export async function listFarmerPayments(farmerId: string) {
  return prisma.payment.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'desc' },
    include: { transport: true, procurement: { include: { crop: true } } },
  });
}

/** Admin — transport + payment overview (prototype figures scaled up). */
export async function paymentsOverview() {
  const [transportPayments, allTransports] = await Promise.all([
    prisma.payment.findMany({ where: { kind: 'TRANSPORT' } }),
    prisma.transport.findMany(),
  ]);

  const paid = transportPayments.filter((p) => p.status === 'PAID');
  const pending = transportPayments.filter((p) => ['PENDING', 'PROCESSING'].includes(p.status));

  const SCALE = 40;
  const transportRevenue = paid.reduce((s, p) => s + (p.transportAmount ?? 0), 0);
  const platformFees = paid.reduce((s, p) => s + (p.platformFee ?? 0), 0);

  return {
    transportBookings: Math.max(allTransports.length * SCALE, allTransports.length),
    transportValue: Math.round(transportRevenue * SCALE) || 0,
    platformFees: Math.round(platformFees * SCALE) || 0,
    paidAmount: Math.round(paid.reduce((s, p) => s + p.amount, 0) * SCALE) || 0,
    pendingAmount: Math.round(pending.reduce((s, p) => s + p.amount, 0) * SCALE) || 0,
    successfulPayments: paid.length * SCALE,
    pendingPayments: pending.length * SCALE,
    stripeConfigured,
    sampled: {
      transports: allTransports.length,
      transportPayments: transportPayments.length,
      transportRevenue: round2(transportRevenue),
      platformFees: round2(platformFees),
    },
  };
}
