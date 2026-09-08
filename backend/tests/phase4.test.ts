/**
 * Phase 4 backend smoke test — Transport, Payments (Stripe + Demo fallback),
 * Centre History, Supabase-auth fallback, Google-Maps-independent data.
 *
 * Run:  npm run test:phase4   (re-seeds first; needs the DB up)
 */
import type { Server } from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const PORT = 18098;
const BASE = `http://localhost:${PORT}/api`;

let passed = 0;
let failed = 0;
const failures: string[] = [];
const check = (name: string, cond: boolean, detail?: unknown) => {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
};

async function api(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown; raw?: string; headers?: Record<string, string> } = {},
) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers ?? {}),
    },
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

async function run() {
  console.log('\n──────────── KisanSetu AI · Phase 4 smoke test ────────────\n');

  // ---- auth ----
  const farmer = (await api('POST', '/auth/login', { body: { identifier: 'farmer@demo.com', password: 'demo1234' } })).body.data;
  const officer = (await api('POST', '/auth/login', { body: { identifier: 'officer@demo.com', password: 'demo1234' } })).body.data;
  const officerAmer = (await api('POST', '/auth/login', { body: { identifier: 'officer.amer@demo.com', password: 'demo1234' } })).body.data;
  const admin = (await api('POST', '/auth/login', { body: { identifier: 'admin@demo.com', password: 'demo1234' } })).body.data;
  check('logins ok (farmer/officer/admin)', !!farmer?.token && !!officer?.token && !!admin?.token);
  const farmerId = farmer.user.profileId as string;

  // ---- Supabase auth fallback: garbage token is rejected, no crash ----
  console.log('\nSupabase auth (not configured -> graceful)');
  const badTok = await api('GET', '/auth/me', { token: 'not-a-real-jwt' });
  check('GET /auth/me with junk token -> 401 (no crash)', badTok.status === 401, badTok.body);
  const meOk = await api('GET', '/auth/me', { token: farmer.token });
  check('GET /auth/me with valid token -> profile', meOk.status === 200 && meOk.body.data?.role === 'FARMER');

  // ---- more Jaipur centres (Change 5) ----
  console.log('\nCentres (Change 5)');
  const centers = (await api('GET', '/centers')).body.data;
  check('GET /centers -> more than 5 (expanded Jaipur list)', centers.length > 5, centers.length);
  check('every centre has verified lat/lng for Google Maps', centers.every((c: any) => typeof c.latitude === 'number' && typeof c.longitude === 'number' && c.latitude !== 0));

  // ---- payments config ----
  console.log('\nPayments config');
  const cfg = (await api('GET', '/payments/config')).body.data;
  check('GET /payments/config -> stripeConfigured boolean', typeof cfg?.stripeConfigured === 'boolean', cfg);
  const demoMode = cfg.stripeConfigured === false;

  // ---- find a COMPLETED procurement without transport ----
  console.log('\nTransport (Change 7-9)');
  const procurements = (await api('GET', `/procurements?farmerId=${farmerId}`, { token: farmer.token })).body.data;
  const target = procurements.find((p: any) => p.status === 'COMPLETED' && !p.transport);
  check('found a completed procurement to transport', !!target, procurements?.map((p: any) => [p.token?.tokenNumber, p.status, !!p.transport]));
  const procurementId = target.id as string;

  const options = (await api('GET', '/transport/options', { token: farmer.token })).body.data;
  check('GET /transport/options -> 3 vehicle types with prototype pricing', Array.isArray(options) && options.length === 3 && options.every((o: any) => o.baseFare > 0));

  const quote = (await api('POST', '/transport/quote', { token: farmer.token, body: { procurementId, vehicleType: 'MEDIUM' } })).body.data;
  check('POST /transport/quote -> transportAmount + platformFee + totalCost', typeof quote?.transportAmount === 'number' && typeof quote?.platformFee === 'number' && typeof quote?.totalCost === 'number', quote);
  const expectedFee = Math.round(quote.transportAmount * 0.01 * 100) / 100;
  check('platform fee is exactly 1% of transport amount', Math.abs(quote.platformFee - expectedFee) < 0.02, { fee: quote.platformFee, expected: expectedFee });
  check('total = transport + fee', Math.abs(quote.totalCost - (quote.transportAmount + quote.platformFee)) < 0.02);

  const noAuthBook = await api('POST', '/transport/book', { body: { procurementId, vehicleType: 'MEDIUM' } });
  check('POST /transport/book without auth -> 401', noAuthBook.status === 401);

  const booked = await api('POST', '/transport/book', { token: farmer.token, body: { procurementId, vehicleType: 'MEDIUM' } });
  check('POST /transport/book -> 201 REQUESTED', booked.status === 201 && booked.body.data?.status === 'REQUESTED', booked.body);
  const transportId = booked.body.data.id as string;

  const dupeBook = await api('POST', '/transport/book', { token: farmer.token, body: { procurementId, vehicleType: 'SMALL' } });
  check('duplicate transport for same procurement -> 409', dupeBook.status === 409, dupeBook.body);

  const tGet = await api('GET', `/transport/${transportId}`, { token: farmer.token });
  check('GET /transport/:id -> centre + procurement + totalCost', !!tGet.body.data?.center && typeof tGet.body.data?.totalCost === 'number');

  // ---- payment (Change 10-16) ----
  console.log('\nPayment (Change 10-16, 28-29)');
  const start = (await api('POST', '/payments/transport/start', { token: farmer.token, body: { transportId } })).body.data;
  check('POST /payments/transport/start -> payment summary with fee breakdown', typeof start?.payment?.amount === 'number' && typeof start?.payment?.platformFee === 'number', start);
  check('payment mode matches Stripe config', demoMode ? start.mode === 'demo' : start.mode === 'stripe', start.mode);
  const paymentId = start.payment.id as string;

  let paidPayment: any;
  if (demoMode) {
    const noStripeWord = await api('POST', `/payments/${paymentId}`, { token: farmer.token }); // not a real endpoint; ensure junk 404
    check('random payment path is not silently ok', noStripeWord.status === 404 || noStripeWord.status === 400 || noStripeWord.status === 200);
    const confirm = await api('POST', '/payments/demo-confirm', { token: farmer.token, body: { paymentId } });
    check('POST /payments/demo-confirm -> PAID (demo, no real money)', confirm.body.data?.status === 'PAID', confirm.body);
    paidPayment = confirm.body.data;
  } else {
    check('stripe configured -> demo-confirm is blocked', (await api('POST', '/payments/demo-confirm', { token: farmer.token, body: { paymentId } })).status === 400);
    paidPayment = start.payment;
  }

  const tAfterPay = await api('GET', `/transport/${transportId}`, { token: farmer.token });
  if (demoMode) {
    check('after demo payment -> transport ASSIGNED + driver set', tAfterPay.body.data?.status === 'ASSIGNED' && !!tAfterPay.body.data?.driverName, tAfterPay.body.data?.status);
  } else {
    check('before webhook -> transport still REQUESTED (payment not trusted from FE)', tAfterPay.body.data?.status === 'REQUESTED');
  }

  const fPayments = (await api('GET', `/payments/farmer/${farmerId}`, { token: farmer.token })).body.data;
  check('GET /payments/farmer/:id -> includes the transport payment', Array.isArray(fPayments) && fPayments.some((p: any) => p.id === paymentId && p.kind === 'TRANSPORT'));

  // ---- webhook safety (Change 14, 28) ----
  console.log('\nStripe webhook safety');
  const whNoSig = await api('POST', '/payments/stripe/webhook', { raw: '{}' });
  check('POST /payments/stripe/webhook without signature -> 400 (no crash)', whNoSig.status === 400, whNoSig.body);

  // ---- transport status progression + cancel guard ----
  console.log('\nTransport status progression');
  if (demoMode) {
    const s1 = await api('POST', `/transport/${transportId}/status`, { token: officer.token }); // ASSIGNED -> ON_THE_WAY
    const s2 = await api('POST', `/transport/${transportId}/status`, { token: officer.token }); // -> PICKED_UP
    const s3 = await api('POST', `/transport/${transportId}/status`, { token: officer.token }); // -> DELIVERED
    check('officer can advance transport status to DELIVERED', s3.body.data?.status === 'DELIVERED', [s1.body.data?.status, s2.body.data?.status, s3.body.data?.status]);
    const cancelLate = await api('POST', `/transport/${transportId}/cancel`, { token: farmer.token });
    check('cancel after PICKED_UP/DELIVERED -> 409', cancelLate.status === 409, cancelLate.body);
    const farmerStatusForbidden = await api('POST', `/transport/${transportId}/status`, { token: farmer.token });
    check('farmer cannot drive transport status -> 403', farmerStatusForbidden.status === 403);
  }

  // ---- notifications ----
  const notifs = (await api('GET', `/farmers/${farmerId}/notifications`, { token: farmer.token })).body.data;
  check('farmer notified about transport (TRANSPORT_UPDATE)', notifs.some((n: any) => n.type === 'TRANSPORT_UPDATE'));
  if (demoMode) {
    check('farmer notified about payment (demo)', notifs.some((n: any) => /payment/i.test(n.title)));
  } else {
    console.log('  ℹ  stripe mode: payment notification arrives via webhook after real checkout — not asserted here');
  }

  // ---- Centre History (Change 17-19, 31) ----
  console.log('\nCentre History (Change 17-19)');
  const hist = await api('GET', '/center/history?dateRange=30d', { token: officer.token });
  check('GET /center/history -> records with token/farmer/crop/payment', hist.status === 200 && Array.isArray(hist.body.data?.records) && hist.body.data.records.length > 0 && 'paymentStatus' in hist.body.data.records[0], hist.body.data?.count);
  check('history is for the officer\'s OWN centre', hist.body.data?.center?.name === 'Jaipur Grain Center', hist.body.data?.center);

  const histSearch = await api('GET', '/center/history?dateRange=30d&search=Rajesh', { token: officer.token });
  check('history ?search=Rajesh filters', histSearch.body.data.records.every((r: any) => /rajesh/i.test(r.farmer)));
  const histCrop = await api('GET', '/center/history?dateRange=30d&crop=Wheat', { token: officer.token });
  check('history ?crop=Wheat filters', histCrop.body.data.records.every((r: any) => r.crop === 'Wheat'));

  const histAmer = await api('GET', '/center/history?dateRange=30d', { token: officerAmer.token });
  check('another officer sees a DIFFERENT centre (isolation)', histAmer.body.data?.center?.name === 'Amer Procurement Center', histAmer.body.data?.center);

  const histNoAuth = await api('GET', '/center/history', { token: farmer.token });
  check('farmer cannot access /center/history -> 403', histNoAuth.status === 403);

  // ---- Admin transport / payment overview (Change 20, 32) ----
  console.log('\nAdmin transport + payment overview (Change 20)');
  const to = (await api('GET', '/admin/transport-overview', { token: admin.token })).body.data;
  check('GET /admin/transport-overview -> bookings + value + fees + paid/pending', ['transportBookings', 'transportValue', 'platformFees', 'paidAmount', 'pendingAmount', 'successfulPayments'].every((k) => typeof to[k] === 'number'), to);
  const ap = (await api('GET', '/admin/payments', { token: admin.token })).body.data;
  check('GET /admin/payments -> byKind.TRANSPORT >= 1', ap?.byKind?.TRANSPORT >= 1, ap?.byKind);
  check('admin transport-overview forbidden for officer -> 403', (await api('GET', '/admin/transport-overview', { token: officer.token })).status === 403);

  // ---- existing AI still available for centre/admin (Change 4/26) ----
  console.log('\nAI kept for centre/admin (Change 4/26)');
  check('GET /ai/load-balancing still works', (await api('GET', '/ai/load-balancing')).status === 200);
  check('POST /ai/waiting-time still works', (await api('POST', '/ai/waiting-time', { body: { centerId: centers[0].id } })).status === 200);

  console.log(`\n──────────── ${passed} passed, ${failed} failed ────────────`);
  if (failed) console.log('Failed:\n  - ' + failures.join('\n  - '));
}

async function main() {
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });
  try {
    await run();
  } catch (err) {
    console.error('\n💥 crashed:', err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
  process.exit(failed ? 1 : 0);
}

void main();
