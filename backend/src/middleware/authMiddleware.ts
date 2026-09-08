import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { ApiError } from '../utils/response';
import type { AuthUser } from '../types';
import { resolveUserFromSupabase, supabaseEnabled, verifySupabaseToken } from '../services/supabaseAuthService';

function readBearer(req: Request): string | null {
  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' && token ? token : null;
}

/**
 * Resolve an AuthUser from a bearer token. Accepts either:
 *   - a Supabase access token (farmer identity provider), or
 *   - the app's own demo JWT (officers / admin / demo login).
 * Returns null when neither verifies.
 */
async function resolveUser(token: string): Promise<AuthUser | null> {
  // 1. app JWT (officers, admin, demo farmer login)
  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as AuthUser & jwt.JwtPayload;
    return {
      userId: payload.userId,
      role: payload.role,
      name: payload.name,
      profileId: payload.profileId,
      centerId: payload.centerId,
    };
  } catch {
    /* not an app JWT — try Supabase */
  }

  // 2. Supabase access token -> map to (or create) the app farmer
  if (supabaseEnabled) {
    const identity = await verifySupabaseToken(token);
    if (identity) return resolveUserFromSupabase(identity);
  }

  return null;
}

/** Require a valid bearer token. Populates req.user. */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearer(req);
  if (!token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }
  resolveUser(token)
    .then((user) => {
      if (!user) return next(ApiError.unauthorized('Invalid or expired token'));
      req.user = user;
      next();
    })
    .catch((err) => next(err));
}

/** Attach req.user if a valid token is present; never fails when absent. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const token = readBearer(req);
  if (!token) return next();
  resolveUser(token)
    .then((user) => {
      if (user) req.user = user;
      next();
    })
    .catch(() => next());
}
