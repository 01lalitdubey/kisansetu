/**
 * GET /api/auth/config-status — Google Sign-In configuration diagnostic.
 * Verifies it reports safe booleans only and never leaks a secret value.
 * Run: npm run test:auth-config
 */
import type { Server } from 'http';
import { createApp } from '../src/app';
import { prisma } from '../src/config/database';
import { env } from '../src/config/env';

const PORT = 18092;
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

async function run() {
  console.log('\n──────────── KisanSetu AI · Auth config-status ────────────\n');
  const server = await new Promise<Server>((resolve) => {
    const s = createApp().listen(PORT, () => resolve(s));
  });

  try {
    const res = await fetch(`${BASE}/auth/config-status`);
    const body: any = await res.json();

    check('200 ok', res.status === 200, body);
    check('supabaseConfigured is boolean', typeof body.data?.supabaseConfigured === 'boolean', body.data);
    check('googleProviderExpected === true', body.data?.googleProviderExpected === true, body.data);
    check(
      'frontendRedirect points at /farmer/auth',
      typeof body.data?.frontendRedirect === 'string' && body.data.frontendRedirect.endsWith('/farmer/auth'),
      body.data,
    );

    const raw = JSON.stringify(body);
    check('no SUPABASE_SERVICE_ROLE_KEY value in response', !env.SUPABASE_SERVICE_ROLE_KEY || !raw.includes(env.SUPABASE_SERVICE_ROLE_KEY));
    check('no SUPABASE_ANON_KEY value in response', !env.SUPABASE_ANON_KEY || !raw.includes(env.SUPABASE_ANON_KEY));
    check('no JWT_SECRET value in response', !raw.includes(env.JWT_SECRET));
    check('no "secret" or "key" field names leaked', !/"[a-zA-Z]*(secret|apiKey|clientSecret)"\s*:/i.test(raw), raw);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.$disconnect();
  }

  console.log(`\n──────────── ${passed} passed, ${failed} failed ────────────`);
  if (failed) console.log('Failed:\n  - ' + failures.join('\n  - '));
  process.exitCode = failed ? 1 : 0;
}

void run();
