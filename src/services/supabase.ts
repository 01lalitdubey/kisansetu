/**
 * Supabase Auth client (Phase 4) — the farmer identity provider.
 *
 * Session persistence is handled by supabase-js itself (localStorage +
 * auto-refresh), so the farmer stays signed in across refreshes. When the
 * env vars are absent the app falls back to the demo-login flow — nothing
 * breaks.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseEnabled = Boolean(url && anonKey);

export const supabase: SupabaseClient | null = supabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'kisansetu-supabase-auth',
      },
    })
  : null;
