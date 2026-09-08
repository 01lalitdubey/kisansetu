/**
 * Phase 5 — officer-registered centres + admin approval, real farmer address,
 * data isolation, Leaflet-independent centre data.
 *
 * Run:  npm run test:phase5   (re-seeds first; DB must be up)
 */
import type { Server } from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { hashPassword } from '../src/services/authService';

const PORT = 18095;
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

async function api(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}) },
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
const cleanup: string[] = []; // user ids to delete

async function run() {
  console.log('\n──────────── KisanSetu AI · Phase 5 (centre registration + isolation) ────────────\n');

  server = await new Promise<Server>((resolve) => {
    const s = createApp().listen(PORT, () => resolve(s));
  });

  const farmer = (await api('POST', '/auth/login', { body: { identifier: 'farmer@demo.com', password: 'demo1234' } })).body.data;
  const admin = (await api('POST', '/auth/login', { body: { identifier: 'admin@demo.com', password: 'demo1234' } })).body.data;
  const jaipurOfficer = (await api('POST', '/auth/login', { body: { identifier: 'officer@demo.com', password: 'demo1234' } })).body.data;

  // ---- 12 seeded centres are APPROVED + carry real coords + address ----
  const centers = (await api('GET', '/centers')).body.data;
  check('GET /centers -> only APPROVED (>=12 seeded)', centers.length >= 12 && centers.every((c: any) => c.approvalStatus === 'APPROVED'));
  check('centres carry verified lat/lng + address fields (Leaflet-ready)', centers.every((c: any) => typeof c.latitude === 'number' && c.latitude !== 0 && 'supportedCrops' in c && 'pincode' in c));
  check('seeded centres flagged isSeed', centers.filter((c: any) => c.isSeed).length >= 12);

  // ---- a fresh user registers a NEW centre ----
  const pw = await hashPassword('demo1234');
  const u = await prisma.user.create({
    data: { name: 'New Officer', mobile: '9111100000', email: 'p5.officer@example.com', passwordHash: pw, role: 'FARMER', farmer: { create: { village: 'Kotputli', location: 'Kotputli, Jaipur' } } },
  });
  cleanup.push(u.id);
  const login = (await api('POST', '/auth/login', { body: { identifier: 'p5.officer@example.com', password: 'demo1234' } })).body.data;
  check('new user logs in as FARMER', login.user.role === 'FARMER');

  const reg = await api('POST', '/centers/register', {
    token: login.token,
    body: {
      name: 'Kotputli Test Mandi ' + Date.now(),
      officerName: 'New Officer',
      contactNumber: '0141-9998887',
      addressLine: 'NH-48, Kotputli',
      city: 'Kotputli',
      district: 'Jaipur',
      state: 'Rajasthan',
      pincode: '303108',
      latitude: 27.7028,
      longitude: 76.1996,
      capacity: 90,
      activeCounters: 3,
      supportedCrops: ['Wheat', 'Mustard'],
    },
  });
  check('POST /centers/register -> 201 PENDING_APPROVAL', reg.status === 201 && reg.body.data?.approvalStatus === 'PENDING_APPROVAL', reg.body);
  const newCenterId = reg.body.data.id;

  // fresh token now carries the CENTER_OFFICER role
  const relog = (await api('POST', '/auth/login', { body: { identifier: 'p5.officer@example.com', password: 'demo1234' } })).body.data;
  check('after registration the user is CENTER_OFFICER bound to the new centre', relog.user.role === 'CENTER_OFFICER' && relog.user.centerId === newCenterId, relog.user);

  const meCenter = await api('GET', '/centers/mine', { token: relog.token });
  check('GET /centers/mine -> the pending centre', meCenter.body.data?.id === newCenterId && meCenter.body.data?.approvalStatus === 'PENDING_APPROVAL');

  // pending centre is NOT visible to farmers
  const farmerView = (await api('GET', '/centers', { token: farmer.token })).body.data;
  check('pending centre hidden from farmer /centers', !farmerView.some((c: any) => c.id === newCenterId));

  // officer cannot use queue/history before approval
  const earlyHist = await api('GET', '/center/history', { token: relog.token });
  check('officer history works but scoped to own (pending) centre', earlyHist.status === 200 && earlyHist.body.data?.center?.id === newCenterId, earlyHist.body?.center);

  const dupReg = await api('POST', '/centers/register', { token: relog.token, body: reg.body.data });
  check('registering a second centre from the same account -> 409', dupReg.status === 409);

  // ---- admin sees + approves ----
  const adminCenters = (await api('GET', '/admin/centers', { token: admin.token })).body.data;
  check('GET /admin/centers -> includes the PENDING centre', adminCenters.some((c: any) => c.id === newCenterId && c.approvalStatus === 'PENDING_APPROVAL'));
  check('officer cannot GET /admin/centers -> 403', (await api('GET', '/admin/centers', { token: relog.token })).status === 403);

  const approve = await api('POST', `/admin/centers/${newCenterId}/approval`, { token: admin.token, body: { action: 'APPROVE' } });
  check('POST /admin/centers/:id/approval APPROVE -> APPROVED + ACTIVE', approve.body.data?.approvalStatus === 'APPROVED' && approve.body.data?.status === 'ACTIVE', approve.body);

  const farmerViewAfter = (await api('GET', '/centers', { token: farmer.token })).body.data;
  check('approved centre now visible to farmers', farmerViewAfter.some((c: any) => c.id === newCenterId));

  const suspend = await api('POST', `/admin/centers/${newCenterId}/approval`, { token: admin.token, body: { action: 'SUSPEND' } });
  check('SUSPEND -> hidden from farmers again', suspend.body.data?.approvalStatus === 'SUSPENDED' && !(await api('GET', '/centers', { token: farmer.token })).body.data.some((c: any) => c.id === newCenterId));
  await api('POST', `/admin/centers/${newCenterId}/approval`, { token: admin.token, body: { action: 'REINSTATE' } });

  // ---- centre editing: owner only, seeded centres admin-only ----
  const edit = await api('PATCH', `/centers/${newCenterId}`, { token: relog.token, body: { capacity: 150 } });
  check('officer edits OWN centre -> 200', edit.status === 200 && edit.body.data?.capacity === 150, edit.body);
  const editSeed = await api('PATCH', `/centers/${centers[0].id}`, { token: relog.token, body: { capacity: 999 } });
  check('officer cannot edit a SEEDED centre -> 403', editSeed.status === 403);
  const editOther = await api('PATCH', `/centers/${newCenterId}`, { token: jaipurOfficer.token, body: { capacity: 50 } });
  check("officer cannot edit ANOTHER officer's centre -> 403", editOther.status === 403, editOther.body);

  // ---- real farmer address + distance ----
  const before = (await api('GET', `/farmers/${farmer.user.profileId}`, { token: farmer.token })).body.data;
  check('seeded demo farmer has a real address + coordinates', before.hasAddress === true && typeof before.latitude === 'number', before);

  const patched = await api('PATCH', `/farmers/${farmer.user.profileId}`, {
    token: farmer.token,
    body: { addressLine: 'Plot 7, Sirsi Road', city: 'Jaipur', district: 'Jaipur', state: 'Rajasthan', pincode: '302012', latitude: 26.9200, longitude: 75.7100 },
  });
  check('PATCH /farmers/:id with address -> persisted', patched.body.data?.pincode === '302012' && patched.body.data?.latitude === 26.92, patched.body);

  // transport quote now uses the farmer's real coords
  const proc = ((await api('GET', '/procurements', { token: farmer.token })).body.data as any[]).find((p) => p.status === 'COMPLETED' && !p.transport);
  if (proc) {
    const quote = (await api('POST', '/transport/quote', { token: farmer.token, body: { procurementId: proc.id, vehicleType: 'SMALL' } })).body.data;
    check('transport quote distance is a positive estimate from real coords', quote?.distanceKm > 0 && typeof quote?.platformFee === 'number');
  }

  // ---- DATA ISOLATION ----
  const f2user = await prisma.user.create({
    data: { name: 'Farmer Two', mobile: '9222200000', email: 'p5.farmer2@example.com', passwordHash: pw, role: 'FARMER', farmer: { create: { village: 'Chomu', location: 'Chomu, Jaipur' } } },
  });
  cleanup.push(f2user.id);
  const f2 = (await api('POST', '/auth/login', { body: { identifier: 'p5.farmer2@example.com', password: 'demo1234' } })).body.data;

  const crossProfile = await api('GET', `/farmers/${farmer.user.profileId}`, { token: f2.token });
  check('Farmer B cannot read Farmer A profile -> 403', crossProfile.status === 403, crossProfile.status);
  const crossHist = await api('GET', `/farmers/${farmer.user.profileId}/history`, { token: f2.token });
  check('Farmer B cannot read Farmer A history -> 403', crossHist.status === 403);
  const crossNotif = await api('GET', `/farmers/${farmer.user.profileId}/notifications`, { token: f2.token });
  check('Farmer B cannot read Farmer A notifications -> 403', crossNotif.status === 403);
  const crossProc = (await api('GET', `/procurements?farmerId=${farmer.user.profileId}`, { token: f2.token })).body.data;
  check('Farmer B procurements query is force-scoped to self (not A)', Array.isArray(crossProc) && crossProc.every((p: any) => p.farmer?.id !== farmer.user.profileId));
  const ownProfile = await api('GET', `/farmers/${f2.user.profileId}`, { token: f2.token });
  check('Farmer B CAN read own profile -> 200', ownProfile.status === 200);

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
    for (const id of cleanup) await prisma.user.delete({ where: { id } }).catch(() => undefined);
    await prisma.procurementCenter.deleteMany({ where: { isSeed: false } }).catch(() => undefined);
    server?.close();
    await prisma.$disconnect();
  }
  process.exit(failed ? 1 : 0);
}
void main();
