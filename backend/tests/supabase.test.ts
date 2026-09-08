/**
 * REAL Supabase auth — end-to-end verification.
 *
 *   frontend client  ->  Supabase  ->  access token  ->  backend /api/auth/me
 *   ->  resolve/create User + Farmer in PostgreSQL  ->  no duplicates on re-login
 *
 * Skips cleanly (exit 0) when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are not
 * configured. Requires network access to the Supabase project.
 *
 * Run:  npm run test:supabase
 */
import type { Server } from 'http';
import { createClient } from '@supabase/supabase-js';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

const PORT = 18097;
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

async function api(method: string, path: string, token?: string, body?: unknown) {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json: any = {};
  try {
    json = await res.json();
  } catch {
    /* empty */
  }
  return { status: res.status, body: json };
}

async function run() {
  console.log('\n──────────── KisanSetu AI · REAL Supabase auth E2E ────────────\n');

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.SUPABASE_ANON_KEY) {
    console.log('  ⏭  SUPABASE_* not fully configured — skipping (this is fine in demo mode).');
    return;
  }

  const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = () =>
    createClient(env.SUPABASE_URL!, env.SUPABASE_ANON_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

  const stamp = Date.now();
  const email = `kisansetu.e2e+${stamp}@example.com`;
  const password = 'e2e-Passw0rd!';
  const name = 'E2E Farmer';
  let supabaseId = '';
  let farmerId = '';
  let appUserId = '';

  try {
    // 1. create a confirmed Supabase user (simulates a farmer who signed up + confirmed email)
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, mobile: `90000${stamp % 100000}`, village: 'Bassi', location: 'Bassi, Jaipur', language: 'hi' },
    });
    check('Supabase admin.createUser -> user', !created.error && !!created.data.user, created.error?.message);
    supabaseId = created.data.user!.id;

    // 2. sign in with the ANON client -> real access token (what the frontend gets)
    const signin = await anon().auth.signInWithPassword({ email, password });
    check('Supabase signInWithPassword -> session + access_token', !signin.error && !!signin.data.session?.access_token, signin.error?.message);
    const accessToken = signin.data.session!.access_token;

    // 3. backend accepts the Supabase access token
    const app = createApp();
    server = await new Promise<Server>((resolve) => {
      const s = app.listen(PORT, () => resolve(s));
    });

    const noAuth = await api('GET', '/auth/me');
    check('GET /api/auth/me without token -> 401', noAuth.status === 401);

    const junk = await api('GET', '/auth/me', 'clearly.not.a.jwt');
    check('GET /api/auth/me with junk token -> 401 (not silently demo)', junk.status === 401);

    const me = await api('GET', '/auth/me', accessToken);
    check('GET /api/auth/me with Supabase token -> 200 + FARMER', me.status === 200 && me.body.data?.role === 'FARMER', me.body);
    check('resolved application profile has a Farmer', !!me.body.data?.farmer?.id, me.body.data);
    check('name carried from Supabase user_metadata', me.body.data?.name === name, me.body.data?.name);
    farmerId = me.body.data.farmer.id;
    appUserId = me.body.data.id;

    // 4. protected farmer endpoints work with the Supabase token
    const profile = await api('GET', `/farmers/${farmerId}`, accessToken);
    check('GET /api/farmers/:id (Supabase-authed) -> profile', profile.status === 200 && profile.body.data?.village === 'Bassi', profile.body.data);

    const centers = await api('GET', '/centers', accessToken);
    check('authed farmer can read /centers', centers.status === 200 && Array.isArray(centers.body.data));

    // 5. crop/quantity update after auth
    const cropRows = (await api('GET', `/centers/${centers.body.data[0].id}/schedules`, accessToken)).body.data as { cropId: string }[];
    const patch = await api('PATCH', `/farmers/${farmerId}`, accessToken, {
      primaryCropId: cropRows[0].cropId,
      approxQuantity: 27,
    });
    check('PATCH /api/farmers/:id crop + quantity -> 200', patch.status === 200 && patch.body.data?.quantity === 27, patch.body);

    // 6. sign in AGAIN -> must resolve the SAME farmer (no duplicates)
    const signin2 = await anon().auth.signInWithPassword({ email, password });
    const token2 = signin2.data.session!.access_token;
    const me2 = await api('GET', '/auth/me', token2);
    check('re-login resolves the SAME farmer id', me2.body.data?.farmer?.id === farmerId, { first: farmerId, second: me2.body.data?.farmer?.id });

    // 7. verify in PostgreSQL directly — exactly one User + one Farmer
    const userCount = await prisma.user.count({ where: { supabaseId } });
    const farmerCount = await prisma.farmer.count({ where: { userId: appUserId } });
    check('PostgreSQL: exactly ONE user for this supabaseId', userCount === 1, userCount);
    check('PostgreSQL: exactly ONE farmer for that user', farmerCount === 1, farmerCount);
    const dbUser = await prisma.user.findUnique({ where: { supabaseId } });
    check('PostgreSQL: user has no passwordHash (Supabase-managed)', dbUser?.passwordHash == null, dbUser?.passwordHash);
  } finally {
    // cleanup — remove the test farmer from both systems
    if (appUserId) await prisma.user.delete({ where: { id: appUserId } }).catch(() => undefined);
    if (supabaseId) await admin.auth.admin.deleteUser(supabaseId).catch(() => undefined);
  }

  console.log(`\n──────────── ${passed} passed, ${failed} failed ────────────`);
  if (failed) console.log('Failed:\n  - ' + failures.join('\n  - '));
}

let server: Server | null = null;

async function main() {
  try {
    await run();
  } catch (err) {
    console.error('\n💥 crashed:', err);
    failed++;
  } finally {
    server?.close();
    await prisma.$disconnect();
  }
  process.exit(failed ? 1 : 0);
}

void main();
