/**
 * End-to-end smoke test for the KisanSetu AI backend.
 * Boots the Express app in-process and drives the full
 *   Farmer  ->  Centre  ->  Admin
 * demo flow over HTTP, asserting the important results.
 *
 * Run:  npm run test:api      (server does NOT need to be running separately;
 *                              the DB does — `npm run prisma:seed` first)
 */
import type { Server } from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';

const PORT = 18099;
const BASE = `http://localhost:${PORT}/api`;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}${detail !== undefined ? ` -> ${JSON.stringify(detail)}` : ''}`);
  }
}

interface ApiResponse<T = any> {
  status: number;
  body: { success: boolean; data?: T; message?: string; errors?: unknown };
}

async function api(
  method: string,
  path: string,
  opts: { token?: string; body?: unknown } = {},
): Promise<ApiResponse> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
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
  console.log('\n──────────── KisanSetu AI · API smoke test ────────────\n');

  // ---- Health ----
  console.log('Health');
  const health = await api('GET', '/health');
  check('GET /health -> 200 ok', health.status === 200 && health.body.data?.status === 'ok', health.body);

  // ---- Auth (all three roles) ----
  console.log('\nAuthentication');
  const farmerLogin = await api('POST', '/auth/login', {
    body: { identifier: 'farmer@demo.com', password: 'demo1234' },
  });
  check('Farmer login -> token', !!farmerLogin.body.data?.token, farmerLogin.body);
  const farmerToken = farmerLogin.body.data.token as string;
  const farmerId = farmerLogin.body.data.user.profileId as string;
  check('Farmer login -> role FARMER', farmerLogin.body.data.user.role === 'FARMER');

  const officerLogin = await api('POST', '/auth/login', {
    body: { identifier: 'officer@demo.com', password: 'demo1234' },
  });
  check('Officer login -> token', !!officerLogin.body.data?.token, officerLogin.body);
  const officerToken = officerLogin.body.data.token as string;
  const officerCenterId = officerLogin.body.data.user.centerId as string;

  const adminLogin = await api('POST', '/auth/login', {
    body: { identifier: 'admin@demo.com', password: 'demo1234' },
  });
  check('Admin login -> token', !!adminLogin.body.data?.token, adminLogin.body);
  const adminToken = adminLogin.body.data.token as string;

  const badLogin = await api('POST', '/auth/login', {
    body: { identifier: 'farmer@demo.com', password: 'wrong' },
  });
  check('Bad password -> 401', badLogin.status === 401);

  const noAuth = await api('GET', '/auth/me');
  check('Protected route without token -> 401', noAuth.status === 401);

  // ---- Centres ----
  console.log('\nCentres');
  const centers = await api('GET', '/centers');
  check('GET /centers -> at least 5 centres', Array.isArray(centers.body.data) && centers.body.data.length >= 5, centers.body.data?.length);
  const primary = centers.body.data.find((c: any) => c.name === 'Jaipur Grain Center');
  check('Primary centre found', !!primary);
  check('Officer is bound to a centre', !!officerCenterId && officerCenterId === primary.id);

  const centerDetail = await api('GET', `/centers/${primary.id}`);
  check('GET /centers/:id -> predictedWait present', typeof centerDetail.body.data?.predictedWait === 'number', centerDetail.body.data);

  // ---- Schedules + AI recommendation ----
  console.log('\nSchedules & AI recommendation');
  const schedules = await api('GET', `/centers/${primary.id}/schedules`);
  check('GET /centers/:id/schedules -> list', Array.isArray(schedules.body.data) && schedules.body.data.length > 0);
  const bookable = schedules.body.data.find(
    (s: any) => s.status === 'UPCOMING' && s.remaining > 0,
  );
  check('Bookable schedule found', !!bookable, schedules.body.data);
  const cropId = bookable.cropId as string;

  const recommended = await api('GET', `/schedules/recommended?centerId=${primary.id}`);
  check('GET /schedules/recommended -> slot + reasons', !!recommended.body.data?.recommendedSlot && Array.isArray(recommended.body.data?.reasons), recommended.body.data);

  const aiSlot = await api('POST', '/ai/recommend-slot', { body: { centerId: primary.id, cropId } });
  check('POST /ai/recommend-slot -> recommendedSlot', !!aiSlot.body.data?.recommendedSlot, aiSlot.body.data);
  check('AI recommendation -> estimatedWait is a number', typeof aiSlot.body.data?.estimatedWait === 'number');

  const aiWait = await api('POST', '/ai/waiting-time', { body: { centerId: primary.id } });
  check('POST /ai/waiting-time -> predictedWait + confidence + factors', typeof aiWait.body.data?.predictedWait === 'number' && typeof aiWait.body.data?.confidence === 'number' && Array.isArray(aiWait.body.data?.factors), aiWait.body.data);

  // ---- Farmer profile ----
  console.log('\nFarmer');
  const farmer = await api('GET', `/farmers/${farmerId}`, { token: farmerToken });
  check('GET /farmers/:id -> Rajesh', farmer.body.data?.name === 'Rajesh', farmer.body.data);

  const history = await api('GET', `/farmers/${farmerId}/history`, { token: farmerToken });
  check('GET /farmers/:id/history -> seeded records', Array.isArray(history.body.data) && history.body.data.length >= 2, history.body.data?.length);

  // ---- Book a token ----
  console.log('\nToken booking');
  const created = await api('POST', '/tokens', {
    token: farmerToken,
    body: { farmerId, centerId: primary.id, scheduleId: bookable.id, cropId, quantity: 25 },
  });
  check('POST /tokens -> 201', created.status === 201, created.body);
  check('POST /tokens -> token number A127', created.body.data?.tokenNumber === 'A127', created.body.data?.tokenNumber);
  check('POST /tokens -> has queuePosition', typeof created.body.data?.queuePosition === 'number');
  check('POST /tokens -> has estimatedWait', typeof created.body.data?.estimatedWait === 'number');
  const tokenId = created.body.data.id as string;

  const dupe = await api('POST', '/tokens', {
    token: farmerToken,
    body: { farmerId, centerId: primary.id, scheduleId: bookable.id, cropId, quantity: 25 },
  });
  check('Duplicate booking same slot -> 409', dupe.status === 409, dupe.body);

  const tokenGet = await api('GET', `/tokens/${tokenId}`);
  check('GET /tokens/:id -> crop Wheat', tokenGet.body.data?.crop === 'Wheat', tokenGet.body.data);
  check('GET /tokens/:id -> queueAhead number', typeof tokenGet.body.data?.queueAhead === 'number');

  const tokenNoAuth = await api('POST', '/tokens', {
    body: { farmerId, centerId: primary.id, scheduleId: bookable.id, cropId, quantity: 25 },
  });
  check('POST /tokens without auth -> 401', tokenNoAuth.status === 401);

  // ---- Live queue + officer processing ----
  console.log('\nQueue & officer processing');
  const queue1 = await api('GET', `/queue/${primary.id}`);
  check('GET /queue/:centerId -> currently serving A113', queue1.body.data?.currentlyServing === 'A113', queue1.body.data?.currentlyServing);
  check('GET /queue/:centerId -> farmersAhead is a number', typeof queue1.body.data?.farmersAhead === 'number');

  const pn1 = await api('POST', `/queue/${primary.id}/process-next`, { token: officerToken });
  check('process-next #1 -> serving A114', pn1.body.data?.currentlyServing === 'A114', pn1.body.data?.currentlyServing);
  const pn2 = await api('POST', `/queue/${primary.id}/process-next`, { token: officerToken });
  check('process-next #2 -> serving A115 (A113 -> A114 -> A115)', pn2.body.data?.currentlyServing === 'A115', pn2.body.data?.currentlyServing);

  const pnNoRole = await api('POST', `/queue/${primary.id}/process-next`, { token: farmerToken });
  check('process-next as FARMER -> 403', pnNoRole.status === 403, pnNoRole.body);

  // skip a waiting token
  const qForSkip = await api('GET', `/queue/${primary.id}`);
  const waitingEntry = qForSkip.body.data.queueEntries.find((e: any) => e.status === 'WAITING');
  const skip = await api('POST', `/queue/${primary.id}/skip`, {
    token: officerToken,
    body: { tokenId: waitingEntry.tokenId },
  });
  check('POST /queue/:centerId/skip -> ok', skip.status === 200, skip.body);
  const skippedGone = !skip.body.data.queueEntries.some((e: any) => e.tokenId === waitingEntry.tokenId);
  check('Skipped token removed from active queue', skippedGone);

  // complete the currently serving token -> creates a procurement
  const qForComplete = await api('GET', `/queue/${primary.id}`);
  const completeRes = await api('POST', `/queue/${primary.id}/complete`, {
    token: officerToken,
    body: { tokenId: qForComplete.body.data.currentTokenId },
  });
  check('POST /queue/:centerId/complete -> procurement COMPLETED', completeRes.body.data?.procurement?.status === 'COMPLETED', completeRes.body.data?.procurement);
  check('complete -> returns updated queue', !!completeRes.body.data?.queue);

  // ---- Notifications ----
  console.log('\nNotifications');
  const notifs = await api('GET', `/farmers/${farmerId}/notifications`, { token: farmerToken });
  check('GET farmer notifications -> includes token confirmation', Array.isArray(notifs.body.data) && notifs.body.data.some((n: any) => /confirm/i.test(n.title)), notifs.body.data?.map((n: any) => n.title));

  const postNotif = await api('POST', '/notifications', {
    token: officerToken,
    body: { farmerId, title: 'Test alert', message: 'Hello', type: 'QUEUE_ALERT' },
  });
  check('POST /notifications -> 201', postNotif.status === 201, postNotif.body);

  // ---- DEMO: high demand -> AI recommendation ----
  console.log('\nDemo mode: high demand -> load balancing');
  const highDemand = await api('POST', '/demo/high-demand', { token: officerToken });
  check('POST /demo/high-demand -> Amer OVERLOADED', highDemand.body.data?.center?.status === 'OVERLOADED', highDemand.body.data?.center);
  check('POST /demo/high-demand -> Amer queue = 75', highDemand.body.data?.center?.currentQueue === 75, highDemand.body.data?.center?.currentQueue);
  check('POST /demo/high-demand -> recommendation created', !!highDemand.body.data?.recommendation, highDemand.body.data?.recommendation);
  const recommendationId = highDemand.body.data.recommendation.id as string;
  check('Recommendation is Amer -> another centre', highDemand.body.data.recommendation.fromCenter.name === 'Amer Procurement Center', highDemand.body.data.recommendation.fromCenter?.name);

  const lb = await api('GET', '/ai/load-balancing');
  check('GET /ai/load-balancing -> pending recommendation', lb.body.data?.status === 'PENDING' || !!lb.body.data?.id, lb.body.data);

  const amerBefore = (await api('GET', '/centers')).body.data.find((c: any) => c.name === 'Amer Procurement Center');
  const targetName = highDemand.body.data.recommendation.toCenter.name;
  const targetBefore = (await api('GET', '/centers')).body.data.find((c: any) => c.name === targetName);

  const applied = await api('POST', '/ai/load-balancing/apply', {
    token: adminToken,
    body: { recommendationId },
  });
  check('POST /ai/load-balancing/apply -> APPLIED', applied.body.data?.recommendation?.status === 'APPLIED', applied.body.data?.recommendation?.status);

  const centersAfter = (await api('GET', '/centers')).body.data;
  const amerAfter = centersAfter.find((c: any) => c.name === 'Amer Procurement Center');
  const targetAfter = centersAfter.find((c: any) => c.name === targetName);
  check('Apply -> Amer queue decreased', amerAfter.currentQueue < amerBefore.currentQueue, { before: amerBefore.currentQueue, after: amerAfter.currentQueue });
  check('Apply -> target queue increased', targetAfter.currentQueue > targetBefore.currentQueue, { before: targetBefore.currentQueue, after: targetAfter.currentQueue });

  const applyAgain = await api('POST', '/ai/load-balancing/apply', { token: adminToken, body: { recommendationId } });
  check('Re-apply same recommendation -> 409', applyAgain.status === 409, applyAgain.body);

  // farmer sees a notification after rebalancing
  const notifsAfter = await api('GET', `/farmers/${farmerId}/notifications`, { token: farmerToken });
  check('Farmer notified after load balancing', notifsAfter.body.data.length > notifs.body.data.length, { before: notifs.body.data.length, after: notifsAfter.body.data.length });

  // ---- ADMIN dashboard ----
  console.log('\nAdmin dashboard');
  const overview = await api('GET', '/admin/overview', { token: adminToken });
  check('GET /admin/overview -> metrics', typeof overview.body.data?.totalCenters === 'number' && typeof overview.body.data?.totalPaymentValue === 'number', overview.body.data);
  check('GET /admin/overview -> overloadedCenters >= 1', overview.body.data?.overloadedCenters >= 1, overview.body.data?.overloadedCenters);

  const adminCentersRes = await api('GET', '/admin/centers', { token: adminToken });
  check('GET /admin/centers -> centres with utilization', Array.isArray(adminCentersRes.body.data) && adminCentersRes.body.data.length >= 5 && typeof adminCentersRes.body.data[0].utilization === 'number');

  const adminForbidden = await api('GET', '/admin/overview', { token: farmerToken });
  check('Admin route as FARMER -> 403', adminForbidden.status === 403);

  const insights = await api('GET', '/admin/insights', { token: adminToken });
  check('GET /admin/insights -> insight strings', Array.isArray(insights.body.data?.insights) && insights.body.data.insights.length > 0);

  // ---- Analytics (Recharts-ready) ----
  console.log('\nAnalytics');
  for (const [name, path, len] of [
    ['farmers-served', '/analytics/farmers-served', 7],
    ['waiting-time', '/analytics/waiting-time', 7],
    ['center-utilization', '/analytics/center-utilization', 5], // one row per centre (>=)
    ['peak-hours', '/analytics/peak-hours', 8],
  ] as const) {
    const r = await api('GET', path);
    const exact = name !== 'center-utilization';
    const good = Array.isArray(r.body.data) && (exact ? r.body.data.length === len : r.body.data.length >= len);
    check(`GET /analytics/${name} -> array[${exact ? len : `>=${len}`}]`, good, r.body.data?.length);
  }
  const crop = await api('GET', '/analytics/crop-procurement');
  check('GET /analytics/crop-procurement -> has crop + value + color', Array.isArray(crop.body.data) && crop.body.data.length > 0 && 'color' in crop.body.data[0]);

  const centerAnalytics = await api('GET', `/analytics/center/${primary.id}`);
  check('GET /analytics/center/:centerId -> centre numbers', typeof centerAnalytics.body.data?.utilization === 'number', centerAnalytics.body.data);

  // ---- Cancel token ----
  console.log('\nToken cancellation');
  const cancelled = await api('DELETE', `/tokens/${tokenId}`, { token: farmerToken });
  check('DELETE /tokens/:id -> CANCELLED', cancelled.body.data?.status === 'CANCELLED', cancelled.body);
  const afterCancel = await api('GET', `/tokens/${tokenId}`);
  check('Cancelled token still exists (soft delete)', afterCancel.status === 200 && afterCancel.body.data.status === 'CANCELLED');

  // ---- Validation ----
  console.log('\nValidation');
  const badToken = await api('POST', '/tokens', {
    token: farmerToken,
    body: { farmerId, centerId: primary.id, scheduleId: bookable.id, cropId, quantity: -5 },
  });
  check('POST /tokens quantity=-5 -> 400', badToken.status === 400, badToken.body);
  check('Validation error envelope { success:false, message }', badToken.body.success === false && typeof badToken.body.message === 'string');

  // ---- DEMO reset ----
  console.log('\nDemo reset');
  const reset = await api('POST', '/demo/reset', { token: officerToken });
  check('POST /demo/reset -> ok', reset.status === 200, reset.body);
  const queueAfterReset = await api('GET', `/queue/${primary.id}`);
  check('Reset -> primary queue back to serving A113', queueAfterReset.body.data?.currentlyServing === 'A113', queueAfterReset.body.data?.currentlyServing);
  const centersReset = (await api('GET', '/centers')).body.data;
  const amerReset = centersReset.find((c: any) => c.name === 'Amer Procurement Center');
  check('Reset -> Amer back to seeded queue (67)', amerReset.currentQueue === 67, amerReset.currentQueue);

  // ---- summary ----
  console.log(`\n──────────── ${passed} passed, ${failed} failed ────────────`);
  if (failed > 0) {
    console.log('Failed checks:\n  - ' + failures.join('\n  - '));
  }
}

async function main() {
  const app = createApp();
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(PORT, () => resolve(s));
  });
  try {
    await run();
  } catch (err) {
    console.error('\n💥 Test run crashed:', err);
    failed++;
  } finally {
    server.close();
    await prisma.$disconnect();
  }
  process.exit(failed > 0 ? 1 : 0);
}

void main();
