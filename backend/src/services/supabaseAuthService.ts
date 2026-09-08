import jwt from 'jsonwebtoken';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { prisma } from '../config/database';
import { env } from '../config/env';
import type { AuthUser } from '../types';
import { toAuthUser } from './authService';

/**
 * ---------------------------------------------------------------------------
 *  SUPABASE AUTH INTEGRATION
 *  Supabase is the identity provider for farmers. This module verifies a
 *  Supabase access token and maps the Supabase user onto exactly one
 *  application User + Farmer record (creating it on first login).
 *
 *  Passwords are NEVER stored here — Supabase Auth owns credentials.
 *  All config is optional; when unset the backend simply keeps using the
 *  existing demo-JWT login.
 * ---------------------------------------------------------------------------
 */

export const supabaseEnabled = Boolean(
  env.SUPABASE_JWT_SECRET || (env.SUPABASE_URL && env.SUPABASE_ANON_KEY),
);

let client: SupabaseClient | null = null;
function supabase(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  if (!client) {
    client = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY ?? env.SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export interface SupabaseIdentity {
  supabaseId: string;
  email: string | null;
  phone: string | null;
  name: string;
  metadata: Record<string, unknown>;
}

/**
 * Verify a Supabase access token. Prefers local HS256 verification with the
 * project's JWT secret; falls back to a remote `auth.getUser` call.
 * Returns null when the token is not a (valid) Supabase token.
 */
export async function verifySupabaseToken(token: string): Promise<SupabaseIdentity | null> {
  if (!supabaseEnabled) return null;

  // 1. Local verification with the shared JWT secret (fast, offline)
  if (env.SUPABASE_JWT_SECRET) {
    try {
      const payload = jwt.verify(token, env.SUPABASE_JWT_SECRET, {
        algorithms: ['HS256'],
      }) as jwt.JwtPayload;
      if (payload.sub) {
        const meta = (payload.user_metadata as Record<string, unknown>) ?? {};
        return {
          supabaseId: String(payload.sub),
          email: (payload.email as string) ?? null,
          phone: (payload.phone as string) ?? null,
          name:
            (meta.name as string) ||
            (meta.full_name as string) ||
            (payload.email as string)?.split('@')[0] ||
            'Farmer',
          metadata: meta,
        };
      }
    } catch {
      /* not a locally-verifiable Supabase token — try remote */
    }
  }

  // 2. Remote verification
  const sb = supabase();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user) return null;
  const meta = data.user.user_metadata ?? {};
  return {
    supabaseId: data.user.id,
    email: data.user.email ?? null,
    phone: data.user.phone ?? null,
    name: (meta.name as string) || (meta.full_name as string) || data.user.email?.split('@')[0] || 'Farmer',
    metadata: meta,
  };
}

/**
 * Resolve the Supabase identity to an application AuthUser. Role-aware:
 * an existing user keeps whatever role they already have (a farmer who later
 * registers a procurement centre becomes CENTER_OFFICER — this must respect
 * that). Only brand-new Supabase users are created as farmers.
 *
 * Never creates duplicates:
 *   1. match on supabaseId
 *   2. else link an existing User by email / mobile
 *   3. else create a fresh FARMER
 */
export async function resolveUserFromSupabase(identity: SupabaseIdentity): Promise<AuthUser> {
  // 1. already linked -> respect the user's current role
  const linked = await prisma.user.findUnique({ where: { supabaseId: identity.supabaseId } });
  if (linked) {
    // a farmer with no farmer row yet (edge case) gets one
    if (linked.role === 'FARMER') {
      const hasFarmer = await prisma.farmer.findUnique({ where: { userId: linked.id } });
      if (!hasFarmer) {
        await prisma.farmer.create({
          data: {
            userId: linked.id,
            village: (identity.metadata.village as string) ?? 'Not set',
            location: (identity.metadata.location as string) ?? 'Jaipur',
            preferredLanguage: (identity.metadata.language as string) ?? linked.language,
          },
        });
      }
    }
    return toAuthUser(linked.id);
  }

  const mobile =
    identity.phone ||
    (identity.metadata.mobile as string) ||
    (identity.metadata.phone as string) ||
    `sb_${identity.supabaseId.slice(0, 12)}`;

  // 2. link an existing user by email / mobile
  const existing = await prisma.user.findFirst({
    where: {
      OR: [...(identity.email ? [{ email: identity.email.toLowerCase() }] : []), { mobile }],
    },
    include: { farmer: true },
  });
  if (existing) {
    await prisma.user.update({ where: { id: existing.id }, data: { supabaseId: identity.supabaseId } });
    if (existing.role === 'FARMER' && !existing.farmer) {
      await prisma.farmer.create({
        data: {
          userId: existing.id,
          village: (identity.metadata.village as string) ?? 'Not set',
          location: (identity.metadata.location as string) ?? 'Jaipur',
          preferredLanguage: (identity.metadata.language as string) ?? existing.language,
        },
      });
    }
    return toAuthUser(existing.id);
  }

  // 3. fresh FARMER account
  const created = await prisma.user.create({
    data: {
      name: identity.name,
      email: identity.email?.toLowerCase() ?? null,
      mobile,
      passwordHash: null,
      supabaseId: identity.supabaseId,
      role: 'FARMER',
      language: (identity.metadata.language as string) ?? 'en',
      farmer: {
        create: {
          village: (identity.metadata.village as string) ?? 'Not set',
          location: (identity.metadata.location as string) ?? 'Jaipur',
          preferredLanguage: (identity.metadata.language as string) ?? 'en',
        },
      },
    },
  });
  return toAuthUser(created.id);
}
