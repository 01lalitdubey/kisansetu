import Stripe from 'stripe';
import { env } from '../config/env';

/**
 * ---------------------------------------------------------------------------
 *  STRIPE
 *  The secret key lives only here (server-side). When it is not configured
 *  the payment flow falls back to an explicit Demo Payment (see
 *  paymentService.demoConfirm) — the app never crashes.
 * ---------------------------------------------------------------------------
 */

export const stripeConfigured = Boolean(env.STRIPE_SECRET_KEY);

let stripe: Stripe | null = null;
export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe is not configured (STRIPE_SECRET_KEY missing)');
  }
  if (!stripe) {
    // Use the Stripe account's default API version.
    stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

interface CheckoutArgs {
  amountPaise: number; // total, in the smallest currency unit
  currency: string;
  description: string;
  metadata: Record<string, string>;
  customerEmail?: string | null;
}

export async function createCheckoutSession(args: CheckoutArgs): Promise<Stripe.Checkout.Session> {
  const s = getStripe();
  const success =
    (env.STRIPE_SUCCESS_URL ?? `${env.FRONTEND_URL}/farmer/payment/success`) +
    '?session_id={CHECKOUT_SESSION_ID}';
  const cancel = env.STRIPE_CANCEL_URL ?? `${env.FRONTEND_URL}/farmer/transport`;

  return s.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: args.currency,
          unit_amount: args.amountPaise,
          product_data: { name: args.description },
        },
      },
    ],
    metadata: args.metadata,
    ...(args.customerEmail ? { customer_email: args.customerEmail } : {}),
    success_url: success,
    cancel_url: cancel,
  });
}

export async function retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return getStripe().checkout.sessions.retrieve(sessionId);
}

/** Verify a webhook signature and return the parsed event. */
export function constructEvent(payload: Buffer, signature: string): Stripe.Event {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('Stripe webhook secret is not configured');
  }
  return getStripe().webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
}
