/**
 * KisanSetu AI Assistant (/api/ai/chat) — backend verification.
 *
 * GEMINI_API_KEY is deliberately removed BEFORE any src import so every
 * request in this file exercises the deterministic fallback path — no real
 * Gemini network call is made. This proves: farmer-only access, request
 * validation, real farmer/token/queue context selection, multilingual
 * replies, and that no secret ever appears in a response, all without a
 * flaky dependency on a live LLM.
 *
 * Intent -> context wiring is covered separately as a pure unit test since
 * it needs no server/DB.
 *
 * Run: npm run test:ai      (DB must be reachable; `npm run prisma:seed` first)
 *
 * NOTE two things this file relies on:
 *  1. Static `import` statements are hoisted above any other code, so the
 *     src modules below are loaded with a dynamic `import()` AFTER the env
 *     override — otherwise config/env.ts would already have run.
 *  2. `config/env.ts` does `import 'dotenv/config'`, and dotenv only fills
 *     in vars that are NOT already present in process.env — so simply
 *     `delete`-ing the key doesn't work here, dotenv just re-adds it from
 *     backend/.env. Setting it to '' first makes dotenv see it as already
 *     present (and skip it); env.ts then treats the empty string as unset.
 */
process.env.GEMINI_API_KEY = '';

import type { Server } from 'http';

const PORT = 18093;
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

async function run() {
  console.log('\n──────────── KisanSetu AI · Assistant chat ────────────\n');

  // Dynamic import — loaded AFTER the delete above so env.GEMINI_API_KEY is
  // read as unset when config/env.ts parses process.env.
  const { createApp } = await import('../src/app');
  const { detectIntent } = await import('../src/services/chatContextService');

  // ---- Pure intent-detection unit checks (no server/DB needed) ----
  console.log('Intent detection');
  check('token question -> token intent', detectIntent('Mera token kab aayega?') === 'token');
  check('queue question -> queue intent', detectIntent('Meri queue mein kitne log hain?') === 'queue');
  check('transport question -> transport intent', detectIntent('Transport kitne ka hai?') === 'transport');
  check('payment question -> payment intent', detectIntent('Payment successful hua kya?') === 'payment');
  check('procurement question -> procurement intent', detectIntent('Mera procurement complete hua?') === 'procurement');
  check('MSP question -> crop intent', detectIntent('Wheat ka MSP kya hai?') === 'crop');
  check('greeting -> greeting intent', detectIntent('hello') === 'greeting');
  check('centre-open question -> centre intent', detectIntent('Amer centre open hai?') === 'centre');

  server = await new Promise<Server>((resolve) => {
    const s = createApp().listen(PORT, () => resolve(s));
  });

  console.log('\nAuth gating');
  const noAuth = await api('POST', '/ai/chat', { body: { message: 'hello' } });
  check('no token -> 401', noAuth.status === 401, noAuth.body);

  const officerLogin = await api('POST', '/auth/login', { body: { identifier: 'officer@demo.com', password: 'demo1234' } });
  const officerToken = officerLogin.body.data?.token;
  check('officer demo login ok', !!officerToken, officerLogin.body);
  const officerChat = await api('POST', '/ai/chat', { token: officerToken, body: { message: 'hello' } });
  check('officer (non-farmer) -> 403', officerChat.status === 403, officerChat.body);

  const farmerLogin = await api('POST', '/auth/login', { body: { identifier: 'farmer@demo.com', password: 'demo1234' } });
  const farmerToken = farmerLogin.body.data?.token;
  check('farmer demo login ok', !!farmerToken, farmerLogin.body);

  console.log('\nRequest validation');
  const missingMessage = await api('POST', '/ai/chat', { token: farmerToken, body: {} });
  check('missing message -> 400', missingMessage.status === 400, missingMessage.body);

  const oversized = await api('POST', '/ai/chat', { token: farmerToken, body: { message: 'a'.repeat(2000) } });
  check('oversized message -> 400', oversized.status === 400, oversized.body);

  const tooMuchHistory = await api('POST', '/ai/chat', {
    token: farmerToken,
    body: { message: 'hi', history: Array.from({ length: 11 }, () => ({ role: 'user', text: 'x' })) },
  });
  check('history over the limit -> 400', tooMuchHistory.status === 400, tooMuchHistory.body);

  const badHistoryItem = await api('POST', '/ai/chat', {
    token: farmerToken,
    body: { message: 'hi', history: [{ role: 'not-a-role', text: 'x' }] },
  });
  check('malformed history item -> 400', badHistoryItem.status === 400, badHistoryItem.body);

  console.log('\nFallback replies (GEMINI_API_KEY unset in this process)');
  const greet = await api('POST', '/ai/chat', { token: farmerToken, body: { message: 'hello' } });
  check('greeting -> 200', greet.status === 200, greet.body);
  check('source is fallback', greet.body.data?.source === 'fallback', greet.body.data);
  check('language defaults to en', greet.body.data?.language === 'en', greet.body.data);
  check('reply is non-empty text', typeof greet.body.data?.message === 'string' && greet.body.data.message.length > 0);
  check(
    'response envelope has exactly message/language/source',
    JSON.stringify(Object.keys(greet.body.data).sort()) === JSON.stringify(['language', 'message', 'source']),
    greet.body.data,
  );

  const hiReply = await api('POST', '/ai/chat', {
    token: farmerToken,
    body: { message: 'Mera token kab aayega?', language: 'hi' },
  });
  check('hi request -> language hi', hiReply.body.data?.language === 'hi', hiReply.body.data);
  check('hi reply contains Devanagari script', /[ऀ-ॿ]/.test(hiReply.body.data?.message ?? ''), hiReply.body.data);

  const hinglishReply = await api('POST', '/ai/chat', {
    token: farmerToken,
    body: { message: 'Meri queue mein kitne log hain?', language: 'hinglish' },
  });
  check('hinglish request -> language hinglish', hinglishReply.body.data?.language === 'hinglish', hinglishReply.body.data);

  const enTokenReply = await api('POST', '/ai/chat', {
    token: farmerToken,
    body: { message: 'Where is my token?', language: 'en' },
  });
  check('en reply is 200', enTokenReply.status === 200, enTokenReply.body);
  check('en reply mentions token wording', /token/i.test(enTokenReply.body.data?.message ?? ''), enTokenReply.body.data);

  console.log('\nSecret safety');
  const fullBody = JSON.stringify(greet.body) + JSON.stringify(hiReply.body) + JSON.stringify(enTokenReply.body);
  check('no GEMINI_API_KEY substring in any response', !fullBody.includes('GEMINI_API_KEY'));
  check('no "AIza" (Google key prefix) in any response', !fullBody.includes('AIza'));

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
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    const { prisma } = await import('../src/config/database');
    await prisma.$disconnect();
  }
  process.exitCode = failed ? 1 : 0;
}
void main();
