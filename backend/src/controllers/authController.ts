import type { Request, Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorMiddleware';
import { ok, ApiError } from '../utils/response';
import { validate, mobileSchema, languageSchema } from '../utils/validation';
import { getMe, login, registerFarmer } from '../services/authService';
import { env, isProd } from '../config/env';
import { supabaseEnabled } from '../services/supabaseAuthService';

const loginSchema = z.object({
  identifier: z.string().min(3, 'email or mobile is required'),
  password: z.string().min(4, 'password is required'),
});

const registerSchema = z.object({
  name: z.string().min(2),
  mobile: mobileSchema,
  email: z.string().email().optional(),
  password: z.string().min(6),
  language: languageSchema.optional(),
  village: z.string().min(1),
  location: z.string().min(1),
  primaryCropId: z.string().optional(),
  approxQuantity: z.number().positive().optional(),
});

export const postLogin = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(loginSchema, req.body);
  const result = await login(body.identifier.trim(), body.password);
  return ok(res, result);
});

export const postRegister = asyncHandler(async (req: Request, res: Response) => {
  const body = validate(registerSchema, req.body);
  const result = await registerFarmer(body);
  return ok(res, result, 201);
});

export const getProfile = asyncHandler(async (req: Request, res: Response) => {
  const user = await getMe(req.user!.userId);
  return ok(res, user);
});

/**
 * GET /api/auth/config-status — development-only diagnostic for the
 * "Continue with Google" flow. Reports ONLY whether things are wired up,
 * never any secret value (no client secret, no keys, no JWT secret).
 * Disabled in production to avoid exposing even this much to the internet.
 */
export const getAuthConfigStatus = asyncHandler(async (_req: Request, res: Response) => {
  if (isProd) throw ApiError.notFound();

  return ok(res, {
    supabaseConfigured: supabaseEnabled,
    supabaseUrlConfigured: Boolean(env.SUPABASE_URL),
    supabaseJwtSecretConfigured: Boolean(env.SUPABASE_JWT_SECRET),
    googleProviderExpected: true,
    frontendUrl: env.FRONTEND_URL,
    frontendRedirect: `${env.FRONTEND_URL}/farmer/auth`,
    note: supabaseEnabled
      ? 'Backend can verify Supabase sessions. If Google sign-in still fails with "invalid_client", the issue is in Google Cloud Console / Supabase Auth provider settings, not in this app.'
      : 'SUPABASE_URL / SUPABASE_ANON_KEY (or SUPABASE_JWT_SECRET) are not set — Google sign-in cannot work until Supabase Auth is configured.',
  });
});
