/**
 * REAL Stripe wiring check.
 *   /payments/config -> stripeConfigured: true
 *   /payments/transport/start -> a real Stripe Checkout Session URL + id
 *   payment row stored PROCESSING with the session id (never PAID from the FE)
 *   webhook without a valid signature -> 400 (no crash, no fake PAID)
 *
 * Skips cleanly when STRIPE_SECRET_KEY is not set.
 * Run:  npm run test:stripe
 */
import type { Server } from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

const PORT = 18096;
const BASE = `http://localhost:${PORT}/api`;
let passed = 0;
let failed = 0;
const failures: string[] = [];
const check = (n: string, c: boolean, d?: unknown) => {
  if (c) {
    passed++;
    console.log(`  ✅ ${n}`);
  } else {
    failed++;
    failures.push(n);
    console.log(`  ❌ ${n}${d !== undefined ? ` -> ${JSON.stringify(d)}` : ''}`);
  }
};

async function api(method: string, path: string, opts: { token?: string; body?: unknown; raw?: string } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
    body: opts.raw ?? (opts.body ? JSON.stringify(opts.body) : undefined),
  });
  let body: any = {};
  try {
    body = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, body };
}

let server: Server | null = null;

async function run() {
  console.log('\n──────────── KisanSetu AI · REAL Stripe wiring ────────────\n');
  if (!env.STRIPE_SECRET_KEY) {
    console.log('  ⏭  STRIPE_SECRET_KEY not set — skipping (Demo Payment fallback is active).');
    return;
  }

  const app = createApp();
  server = await new Promise<Server>((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });

  const farmer = (await api('POST', '/auth/login', { body: { identifier: 'farmer@demo.com', password: 'demo1234' } })).body.data;
  const officer = (await api('POST', '/auth/login', { body: { identifier: 'officer@demo.com', password: 'demo1234' } })).body.data;
  void officer;

  const cfg = (await api('GET', '/payments/config')).body.data;
  check('GET /payments/config -> stripeConfigured: true', cfg?.stripeConfigured === true, cfg);

  // find a completed procurement with no transport, then book one
  const procs = (await api('GET', '/procurements', { token: farmer.token })).body.data as any[];
  const target = procs.find((p) => p.status === 'COMPLETED' && !p.transport);
  check('found a completed procurement to transport', !!target);
  const booked = await api('POST', '/transport/book', { token: farmer.token, body: { procurementId: target.id, vehicleType: 'MEDIUM' } });
  check('POST /transport/book -> 201', booked.status === 201, booked.body);
  const transportId = booked.body.data.id;

  const start = (await api('POST', '/payments/transport/start', { token: farmer.token, body: { transportId } })).body.data;
  check('start -> mode "stripe"', start?.mode === 'stripe', start?.mode);
  check('start -> real Stripe Checkout URL', typeof start?.checkoutUrl === 'string' && /checkout\.stripe\.com/.test(start.checkoutUrl), start?.checkoutUrl);
  check('start -> Checkout session id (cs_...)', typeof start?.sessionId === 'string' && start.sessionId.startsWith('cs_'), start?.sessionId);
  check('start -> fee breakdown present', typeof start?.payment?.transportAmount === 'number' && typeof start?.payment?.platformFee === 'number');

  const dbPayment = await prisma.payment.findFirst({ where: { stripeCheckoutSessionId: start.sessionId } });
  check('payment row stored PROCESSING (not PAID) with the session id', dbPayment?.status === 'PROCESSING', dbPayment?.status);

  const demoBlocked = await api('POST', '/payments/demo-confirm', { token: farmer.token, body: { paymentId: start.payment.id } });
  check('demo-confirm is blocked while Stripe is configured -> 400', demoBlocked.status === 400, demoBlocked.body);

  const whBad = await api('POST', '/payments/stripe/webhook', { raw: JSON.stringify({ type: 'checkout.session.completed' }) });
  check('webhook without valid signature -> 400 (no fake PAID)', whBad.status === 400, whBad.body);

  const stillProcessing = await prisma.payment.findUnique({ where: { id: start.payment.id } });
  check('payment still NOT paid after bogus webhook', stillProcessing?.status !== 'PAID', stillProcessing?.status);

  // cleanup this test's transport + payment
  await prisma.payment.deleteMany({ where: { transportId } });
  await prisma.transport.deleteMany({ where: { id: transportId } });

  console.log(`\n──────────── ${passed} passed, ${failed} failed ────────────`);
  if (failed) console.log('Failed:\n  - ' + failures.join('\n  - '));
}

async function main() {
  try {
    await run();
  } catch (e) {
    console.error('💥', e);
    failed++;
  } finally {
    server?.close();
    await prisma.$disconnect();
  }
  process.exit(failed ? 1 : 0);
}
void main();
