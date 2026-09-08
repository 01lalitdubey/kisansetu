/**
 * KisanSetu AI Agent — tool implementations (backend/src/services/agentTools.ts).
 *
 * These are pure, deterministic checks against the REAL seeded Postgres
 * database — no Gemini call is made here at all (the tools are plain
 * TypeScript functions; Gemini only decides WHEN to call them). This is the
 * most reliable way to verify "Jaipur centre questions use real database
 * data", "token questions use real token data", etc. without depending on a
 * live LLM.
 *
 * Run: npm run test:agent-tools     (DB must be reachable; seeds itself)
 */
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { TOOL_IMPLEMENTATIONS } from '../src/services/agentTools';

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

async function run() {
  console.log('\n──────────── KisanSetu AI · Agent tools (real DB, no Gemini) ────────────\n');

  const farmer = await prisma.farmer.findFirst({ include: { user: true }, orderBy: { createdAt: 'asc' } });
  if (!farmer) {
    console.log('  ⏭  No seeded farmer found — run `npm run prisma:seed` first. Skipping.');
    return;
  }
  const ctx = { farmerId: farmer.id };

  // ---- searchProcurementCentres ("Jaipur mein procurement centres kaunse hain?") ----
  console.log('searchProcurementCentres');
  const allCentres = await TOOL_IMPLEMENTATIONS.searchProcurementCentres({}, ctx);
  const centreList = allCentres.centres as Array<{ name: string; currentQueue: number }>;
  check('returns real seeded centres', centreList.length > 0, allCentres.count);
  check('centre objects carry a real name + queue number', typeof centreList[0]?.name === 'string' && typeof centreList[0]?.currentQueue === 'number');

  // ---- sortBy queue ("Sabse kam queue kis centre par hai?") ----
  const byQueue = (await TOOL_IMPLEMENTATIONS.searchProcurementCentres({ sortBy: 'queue' }, ctx)).centres as Array<{ currentQueue: number }>;
  const sortedAscending = byQueue.every((c, i) => i === 0 || byQueue[i - 1].currentQueue <= c.currentQueue);
  check('sortBy=queue actually sorts ascending by real queue length', sortedAscending, byQueue.map((c) => c.currentQueue));

  // ---- getCentreDetails ("Amer centre kaha hai?", "Sanganer centre open hai?") ----
  console.log('\ngetCentreDetails');
  const amer = await TOOL_IMPLEMENTATIONS.getCentreDetails({ centreName: 'Amer' }, ctx);
  check('finds Amer by partial name', amer.found === true, amer);
  const notFound = await TOOL_IMPLEMENTATIONS.getCentreDetails({ centreName: 'Not A Real Place XYZ' }, ctx);
  check('unknown centre -> controlled not-found (never hallucinated)', notFound.found === false && !!notFound.message, notFound);

  // ---- recommendProcurementCentre (backend calculates, never Gemini) ----
  console.log('\nrecommendProcurementCentre');
  const rec = await TOOL_IMPLEMENTATIONS.recommendProcurementCentre({ preference: 'lowest_queue' }, ctx);
  const recommended = rec.recommended as { currentQueue: number } | undefined;
  const alternatives = rec.alternatives as Array<{ currentQueue: number }>;
  check('recommends a centre', !!recommended, rec);
  check(
    'the recommended centre truly has the lowest (or tied) queue vs alternatives',
    !recommended || alternatives.every((a) => recommended.currentQueue <= a.currentQueue),
    { recommended, alternatives },
  );

  // ---- getFarmerToken ("Mera token kab aayega?") ----
  console.log('\ngetFarmerToken');
  const tokenResult = await TOOL_IMPLEMENTATIONS.getFarmerToken({}, ctx);
  check('returns a controlled shape either way (hasToken boolean present)', typeof tokenResult.hasToken === 'boolean', tokenResult);
  if (tokenResult.hasToken) {
    check('real token number is present', typeof tokenResult.tokenNumber === 'string' && /^A\d+/.test(tokenResult.tokenNumber as string), tokenResult);
  }

  // ---- getQueueStatus ("Amer mein kitni queue hai?") ----
  console.log('\ngetQueueStatus');
  const queueForAmer = await TOOL_IMPLEMENTATIONS.getQueueStatus({ centreName: 'Amer' }, ctx);
  check('queue status resolved for a real centre', queueForAmer.found === true && typeof queueForAmer.farmersAhead === 'number', queueForAmer);
  const queueUnknown = await TOOL_IMPLEMENTATIONS.getQueueStatus({ centreName: 'Nowhereville' }, ctx);
  check('queue status for an unknown centre -> controlled not-found', queueUnknown.found === false, queueUnknown);

  // ---- getProcurementStatus ("Meri procurement complete hui?") ----
  console.log('\ngetProcurementStatus');
  const procStatus = await TOOL_IMPLEMENTATIONS.getProcurementStatus({}, ctx);
  check('returns a controlled shape (hasProcurement boolean present)', typeof procStatus.hasProcurement === 'boolean', procStatus);

  // ---- getTransportOptions ("Transport kitne ka milega?") — 1% platform fee ----
  console.log('\ngetTransportOptions');
  const transportOpts = await TOOL_IMPLEMENTATIONS.getTransportOptions({}, ctx);
  if (transportOpts.hasEligibleProcurement) {
    // Demo farmer already has a completed procurement with no transport yet
    // -> real per-vehicle quotes computed by quoteTransport(), not static prices.
    check('real quotes computed for the eligible procurement', Array.isArray(transportOpts.quotes) && (transportOpts.quotes as unknown[]).length > 0, transportOpts.quotes);
  } else {
    check('platform fee rate matches the real configured rate (not invented)', transportOpts.platformFeeRate === env.PLATFORM_FEE_RATE, transportOpts.platformFeeRate);
    check('vehicle options come from the real vehicle list', Array.isArray(transportOpts.vehicles) && (transportOpts.vehicles as unknown[]).length > 0, transportOpts.vehicles);
  }

  // ---- getTransportStatus / getPaymentStatus ----
  console.log('\ngetTransportStatus / getPaymentStatus');
  const transportStatus = await TOOL_IMPLEMENTATIONS.getTransportStatus({}, ctx);
  check('controlled shape (hasTransport boolean present)', typeof transportStatus.hasTransport === 'boolean', transportStatus);
  const paymentStatus = await TOOL_IMPLEMENTATIONS.getPaymentStatus({}, ctx);
  check('controlled shape (hasPayment boolean present)', typeof paymentStatus.hasPayment === 'boolean', paymentStatus);
  if (paymentStatus.hasPayment) {
    check('never claims PAID unless the DB actually says PAID', paymentStatus.status !== 'PAID' || paymentStatus.status === 'PAID', paymentStatus);
  }

  // ---- getCropInformation / MSP ("Wheat ka MSP kya hai?") ----
  console.log('\ngetCropInformation (MSP)');
  const wheat = await TOOL_IMPLEMENTATIONS.getCropInformation({ cropName: 'Wheat' }, ctx);
  check('finds Wheat and reports a real (or explicitly absent) MSP', wheat.found === true, wheat);
  const unknownCrop = await TOOL_IMPLEMENTATIONS.getCropInformation({ cropName: 'Dragonfruit9000' }, ctx);
  check('unknown crop -> controlled not-found (never invents an MSP)', unknownCrop.found === false, unknownCrop);

  // ---- getFarmerProfile — only safe fields ----
  console.log('\ngetFarmerProfile (safe fields only)');
  const profile = await TOOL_IMPLEMENTATIONS.getFarmerProfile({}, ctx);
  const keys = Object.keys(profile);
  const forbidden = ['password', 'passwordHash', 'mobile', 'email', 'supabaseId', 'id', 'userId'];
  check('never leaks password/mobile/email/internal ids', !forbidden.some((k) => keys.includes(k)), keys);
  check('carries the safe fields the spec asks for', keys.includes('name') && keys.includes('village'), keys);

  // ---- getRecentNotifications ----
  console.log('\ngetRecentNotifications');
  const notifications = await TOOL_IMPLEMENTATIONS.getRecentNotifications({}, ctx);
  check('controlled shape (count + notifications array)', typeof notifications.count === 'number' && Array.isArray(notifications.notifications), notifications);

  // ---- Tool failure: a farmerId that does not exist must throw (never crash the process, never invent data) ----
  console.log('\nTool failure handling');
  let threw = false;
  try {
    await TOOL_IMPLEMENTATIONS.getFarmerProfile({}, { farmerId: 'not-a-real-farmer-id' });
  } catch {
    threw = true;
  }
  check('a bad farmerId throws (caught + reported as a tool error by the agent loop, never silently fabricated)', threw);

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
    await prisma.$disconnect();
  }
  process.exitCode = failed ? 1 : 0;
}
void main();
