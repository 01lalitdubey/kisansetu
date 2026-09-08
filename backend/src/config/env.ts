import 'dotenv/config';
import { z } from 'zod';

/**
 * Validate process.env once at boot. Fail fast with a readable message
 * instead of letting `undefined` leak into the app.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(10, 'JWT_SECRET must be at least 10 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  DEMO_PASSWORD: z.string().default('demo1234'),

  // --- Phase 4: Supabase Auth (all optional — demo JWT still works without it) ---
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // --- Phase 4: Stripe (optional — Demo Payment fallback when unset) ---
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_SUCCESS_URL: z.string().url().optional(),
  STRIPE_CANCEL_URL: z.string().url().optional(),

  // --- Phase 4: platform fee ---
  PLATFORM_FEE_RATE: z.coerce.number().min(0).max(0.5).default(0.01),

  // --- Gemini AI assistant (optional — mock/fallback assistant used when unset) ---
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
});

// Treat empty-string env vars (common in .env files) as "not set".
const cleaned = Object.fromEntries(
  Object.entries(process.env).filter(([, v]) => v !== undefined && v !== ''),
);

const parsed = schema.safeParse(cleaned);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
