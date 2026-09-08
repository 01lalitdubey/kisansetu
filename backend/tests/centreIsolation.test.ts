/**
 * Centre / farmer data isolation — backend authorization checks.
 *
 * Verifies fixes made during the beta-readiness pass:
 *   - an officer can only mutate their OWN centre's queue (requireOwnCenter)
 *   - an officer can only update/create procurements at their OWN centre
 *   - a farmer can never book or cancel a token "as" a different farmer
 *   - an officer can only cancel a token booked at their OWN centre
 *
 * requireRole('CENTER_OFFICER') alone checks the ROLE but not WHICH centre
 * the URL points at — these tests exist because that gap was real and
 * exploitable before this pass (any officer could mutate any other centre's
 * live queue by URL, regardless of which centre they belonged to).
 *
 * Run: npm run test:centre-isolation   (DB must be reachable; seeds itself)
 */
import type { Server } from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { hashPassword } from '../src/services/authService';

const PORT = 18091;
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

async function api(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
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

let server: Server | null = null;
const usersToDelete: string[] = [];

async function run() {
  console.log('\n──────────── KisanSetu AI · Centre / farmer data isolation ────────────\n');

  server = await new Promise<Server>((resolve) => {
    const s = createApp().listen(PORT, () => resolve(s));
  });

  const stamp = Date.now();

  // ---- Officer A: the seeded demo officer ----
  const officerALogin = (await api('POST', '/auth/login', { body: { identifier: 'officer@demo.com', password: 'demo1234' } })).body.data;
  check('officer A (demo) login ok', !!officerALogin?.token, officerALogin);
  const officerACenterId = officerALogin.user.centerId;

  // ---- Officer B: a freshly registered, DIFFERENT centre ----
  const pw = await hashPassword('demo1234');
  const officerBUser = await prisma.user.create({
    data: {
      name: 'Isolation Test Officer B',
      mobile: `9${stamp % 1000000000}`.slice(0, 10),
      email: `isolation.officerb+${stamp}@example.com`,
      passwordHash: pw,
      role: 'FARMER',
      farmer: { create: { village: 'Test Village', location: 'Test Village, Jaipur' } },
    },
  });
  usersToDelete.push(officerBUser.id);
  const officerBFarmerLogin = (await api('POST', '/auth/login', { body: { identifier: officerBUser.email!, password: 'demo1234' } })).body.data;
  const regB = await api('POST', '/centers/register', {
    token: officerBFarmerLogin.token,
    body: {
      name: `Isolation Test Centre B ${stamp}`,
      officerName: 'Officer B',
      contactNumber: '0141-9990000',
      addressLine: 'Test Road',
      city: 'Kotputli',
      district: 'Jaipur',
      state: 'Rajasthan',
      pincode: '303108',
      latitude: 27.7,
      longitude: 76.2,
      capacity: 80,
      activeCounters: 2,
      supportedCrops: ['Wheat'],
    },
  });
  check('centre B registered', regB.status === 201, regB.body);
  const officerBCenterId = regB.body.data.id;
  const officerBLogin = (await api('POST', '/auth/login', { body: { identifier: officerBUser.email!, password: 'demo1234' } })).body.data;
  check('officer B is now CENTER_OFFICER bound to centre B', officerBLogin.user.role === 'CENTER_OFFICER' && officerBLogin.user.centerId === officerBCenterId, officerBLogin.user);

  const adminLogin = (await api('POST', '/auth/login', { body: { identifier: 'admin@demo.com', password: 'demo1234' } })).body.data;

  // ==== Queue: officer A must NOT be able to mutate centre B's queue ====
  console.log('\nQueue isolation');
  const crossProcessNext = await api('POST', `/queue/${officerBCenterId}/process-next`, { token: officerALogin.token });
  check('officer A process-next on centre B -> 403', crossProcessNext.status === 403, crossProcessNext.body);

  const crossPause = await api('POST', `/queue/${officerBCenterId}/running`, { token: officerALogin.token, body: { running: false } });
  check('officer A pause centre B -> 403', crossPause.status === 403, crossPause.body);

  const ownPause = await api('POST', `/queue/${officerACenterId}/running`, { token: officerALogin.token, body: { running: true } });
  check('officer A pause OWN centre -> not 403', ownPause.status !== 403, ownPause.body);

  const adminPause = await api('POST', `/queue/${officerBCenterId}/running`, { token: adminLogin.token, body: { running: true } });
  check('admin can act on any centre -> not 403', adminPause.status !== 403, adminPause.body);

  // ==== Procurement: officer B must NOT be able to patch a procurement at centre A ====
  console.log('\nProcurement isolation');
  const centerAProcurements = await api('GET', '/procurements', { token: officerALogin.token });
  const existingProcurement = centerAProcurements.body.data?.[0];
  if (existingProcurement) {
    const crossPatch = await api('PATCH', `/procurements/${existingProcurement.id}/status`, {
      token: officerBLogin.token,
      body: { status: existingProcurement.status },
    });
    check('officer B cannot patch centre A procurement -> 403', crossPatch.status === 403, crossPatch.body);
  } else {
    console.log('  ⏭  no seeded procurement at centre A to test against — skipped');
  }

  // ==== Token: a farmer must never book/cancel "as" another farmer ====
  console.log('\nToken ownership (farmers)');
  const farmerALogin = (await api('POST', '/auth/login', { body: { identifier: 'farmer@demo.com', password: 'demo1234' } })).body.data;
  const farmerBUser = await prisma.user.create({
    data: {
      name: 'Isolation Test Farmer B',
      mobile: `8${stamp % 1000000000}`.slice(0, 10),
      email: `isolation.farmerb+${stamp}@example.com`,
      passwordHash: pw,
      role: 'FARMER',
      farmer: { create: { village: 'Test Village', location: 'Test Village, Jaipur' } },
    },
    include: { farmer: true },
  });
  usersToDelete.push(farmerBUser.id);

  const spoofedBooking = await api('POST', '/tokens', {
    token: farmerALogin.token,
    body: {
      farmerId: farmerBUser.farmer!.id, // farmer A trying to book AS farmer B
      centerId: officerACenterId,
      scheduleId: 'does-not-matter-blocked-before-lookup',
      cropId: 'does-not-matter',
      quantity: 10,
    },
  });
  check('farmer A cannot book a token as farmer B -> 403', spoofedBooking.status === 403, spoofedBooking.body);

  // A raw token owned by farmer B, at centre B, for the cancel-ownership checks.
  const cropForToken = await prisma.crop.findFirst();
  const scheduleForCentreB = await prisma.procurementSchedule.create({
    data: {
      centerId: officerBCenterId,
      cropId: cropForToken!.id,
      date: new Date(),
      startTime: '09:00',
      endTime: '10:00',
      maxFarmers: 10,
    },
  });
  const rawToken = await prisma.token.create({
    data: {
      tokenNumber: `ISO${stamp % 100000}`,
      farmerId: farmerBUser.farmer!.id,
      centerId: officerBCenterId,
      scheduleId: scheduleForCentreB.id,
      cropId: cropForToken!.id,
      quantity: 10,
      date: new Date(),
      slotStart: '09:00',
      slotEnd: '10:00',
      queuePosition: 1,
      estimatedWait: 10,
      status: 'BOOKED',
    },
  });

  const farmerACancelsFarmerBToken = await api('DELETE', `/tokens/${rawToken.id}`, { token: farmerALogin.token });
  check('farmer A cannot cancel farmer B token -> 403', farmerACancelsFarmerBToken.status === 403, farmerACancelsFarmerBToken.body);

  const officerAcancelsCentreBToken = await api('DELETE', `/tokens/${rawToken.id}`, { token: officerALogin.token });
  check('officer A (wrong centre) cannot cancel centre B token -> 403', officerAcancelsCentreBToken.status === 403, officerAcancelsCentreBToken.body);

  const officerBCancelsOwnToken = await api('DELETE', `/tokens/${rawToken.id}`, { token: officerBLogin.token });
  check('officer B (own centre) CAN cancel the token -> not 403', officerBCancelsOwnToken.status !== 403, officerBCancelsOwnToken.body);

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
    for (const id of usersToDelete) await prisma.user.delete({ where: { id } }).catch(() => undefined);
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await prisma.$disconnect();
  }
  process.exitCode = failed ? 1 : 0;
}
void main();
