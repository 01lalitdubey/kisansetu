/**
 * Google Sign-In (via Supabase OAuth) — backend mapping verification.
 *
 * A Google login produces a normal Supabase access token whose user_metadata
 * carries { full_name, avatar_url, email } but NO mobile / village. This test
 * proves the EXISTING backend resolves it to exactly one KisanSetu User +
 * Farmer, links to a pre-existing account by email (no duplicates), and never
 * fabricates farmer identity from Google data alone.
 *
 * Skips cleanly when SUPABASE_* is not configured. Run: npm run test:google
 */
import type { Server } from 'http';
import { createClient } from '@supabase/supabase-js';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';
import { hashPassword } from '../src/services/authService';

const PORT = 18094;
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
async function api(method: string, path: string, token?: string) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
const sbToDelete: string[] = [];
const usersToDelete: string[] = [];

async function run() {
  console.log('\n──────────── KisanSetu AI · Google Sign-In mapping ────────────\n');
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    console.log('  ⏭  SUPABASE_* not fully configured — skipping.');
    return;
  }
  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = () =>
    createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });

  server = await new Promise<Server>((resolve) => {
    const s = createApp().listen(PORT, () => resolve(s));
  });

  const stamp = Date.now();

  // ---- Case 1: brand-new Google user ----
  const g1email = `kisansetu.google1+${stamp}@example.com`;
  const g1 = await admin.auth.admin.createUser({
    email: g1email,
    password: 'irrelevant-Passw0rd!', // only so the test can obtain a token
    email_confirm: true,
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: {
      // exactly what Google/Supabase populate — note: no `name`, no `mobile`
      full_name: 'Anita Google',
      avatar_url: 'https://lh3.googleusercontent.com/a/demo',
      email: g1email,
      email_verified: true,
      iss: 'https://accounts.google.com',
    },
  });
  check('Supabase admin.createUser (Google-shaped) ok', !g1.error, g1.error?.message);
  sbToDelete.push(g1.data.user!.id);

  const s1 = await anon().auth.signInWithPassword({ email: g1email, password: 'irrelevant-Passw0rd!' });
  const t1 = s1.data.session!.access_token;

  const me1 = await api('GET', '/auth/me', t1);
  check('GET /auth/me -> 200 FARMER', me1.status === 200 && me1.body.data?.role === 'FARMER', me1.body);
  check('name taken from Google full_name', me1.body.data?.name === 'Anita Google', me1.body.data?.name);
  check('Farmer profile created', !!me1.body.data?.farmer?.id);
  const f1 = me1.body.data.farmer.id;
  usersToDelete.push(me1.body.data.id);

  const dbFarmer1 = await prisma.farmer.findUnique({ where: { id: f1 } });
  check('mobile is a placeholder (NOT from Google) — farmer must still enter it', (await prisma.user.findUnique({ where: { id: me1.body.data.id } }))?.mobile?.startsWith('sb_') === true);
  check("village not assumed from Google -> 'Not set'", dbFarmer1?.village === 'Not set', dbFarmer1?.village);
  check('user has no passwordHash (Supabase-managed)', (await prisma.user.findUnique({ where: { id: me1.body.data.id } }))?.passwordHash == null);

  // ---- Case 2: SAME Google account logs in again -> SAME farmer ----
  const s1b = await anon().auth.signInWithPassword({ email: g1email, password: 'irrelevant-Passw0rd!' });
  const me1b = await api('GET', '/auth/me', s1b.data.session!.access_token);
  check('second Google login -> SAME farmer id (no duplicate)', me1b.body.data?.farmer?.id === f1, { first: f1, second: me1b.body.data?.farmer?.id });
  const userCount1 = await prisma.user.count({ where: { supabaseId: g1.data.user!.id } });
  check('exactly ONE User row for this Google identity', userCount1 === 1, userCount1);

  // ---- Case 3: Google account whose email matches an EXISTING app farmer ----
  const sharedEmail = `kisansetu.shared+${stamp}@example.com`;
  const existing = await prisma.user.create({
    data: {
      name: 'Existing Farmer',
      email: sharedEmail,
      mobile: `9${stamp % 1000000000}`.slice(0, 10),
      passwordHash: await hashPassword('demo1234'),
      role: 'FARMER',
      farmer: { create: { village: 'Bassi', location: 'Bassi, Jaipur' } },
    },
    include: { farmer: true },
  });
  usersToDelete.push(existing.id);
  const existingFarmerId = existing.farmer!.id;

  const g2 = await admin.auth.admin.createUser({
    email: sharedEmail,
    password: 'irrelevant-Passw0rd!',
    email_confirm: true,
    app_metadata: { provider: 'google', providers: ['google'] },
    user_metadata: { full_name: 'Existing Farmer (Google)', email: sharedEmail, email_verified: true },
  });
  sbToDelete.push(g2.data.user!.id);
  const s2 = await anon().auth.signInWithPassword({ email: sharedEmail, password: 'irrelevant-Passw0rd!' });
  const me2 = await api('GET', '/auth/me', s2.data.session!.access_token);
  check('Google login LINKS to the existing farmer by email (same id)', me2.body.data?.farmer?.id === existingFarmerId, { existing: existingFarmerId, got: me2.body.data?.farmer?.id });
  const farmerRows = await prisma.farmer.count({ where: { userId: existing.id } });
  check('still exactly ONE Farmer for that user (no duplicate created)', farmerRows === 1, farmerRows);
  const linked = await prisma.user.findUnique({ where: { id: existing.id } });
  check('existing user now carries the Google supabaseId', linked?.supabaseId === g2.data.user!.id);

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
    if (env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
      for (const id of sbToDelete) await admin.auth.admin.deleteUser(id).catch(() => undefined);
    }
    server?.close();
    await prisma.$disconnect();
  }
  process.exit(failed ? 1 : 0);
}
void main();
