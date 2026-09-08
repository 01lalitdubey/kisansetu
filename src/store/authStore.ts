import { create } from 'zustand';
import type { AuthChangeEvent, AuthError, Session } from '@supabase/supabase-js';
import { supabase, supabaseEnabled } from '../services/supabase';
import { authApi, farmerApi, setToken, ApiError, ApiUnavailableError } from '../services/api';
import { useAppStore } from './appStore';

/**
 * ---------------------------------------------------------------------------
 *  AUTH STORE
 *  Supabase Auth is the PRIMARY farmer identity provider whenever
 *  VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY are set. It supports:
 *    - email / password
 *    - "Continue with Google" (Supabase OAuth — same session + access token)
 *  Session persistence + refresh are handled by supabase-js (localStorage);
 *  this store mirrors it into React and wires the access token into the API
 *  layer + app store. It is the SINGLE place session restoration happens.
 *
 *  "Continue as demo farmer" is a fallback that only appears when Supabase
 *  is NOT configured. When Supabase IS configured we never silently fall
 *  back to demo — errors are surfaced to the user.
 * ---------------------------------------------------------------------------
 */

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out';
export type AuthProvider = 'supabase' | 'demo' | null;
/**
 * Coarse classification of what stage an auth failure happened at — logged
 * in dev and kept in state so a future UI (or a bug report) can point at the
 * right place instead of a generic "unable to sign in".
 */
export type AuthErrorCode =
  | 'OAUTH_CONFIGURATION_ERROR' // Google Cloud / Supabase provider misconfigured (invalid_client, redirect mismatch, provider disabled)
  | 'SESSION_ERROR' // user cancelled, or the Supabase session expired/never established
  | 'PROFILE_MAPPING_ERROR' // valid Supabase session, but our backend couldn't resolve/create the farmer
  | 'NETWORK_ERROR' // couldn't reach Supabase or our backend at all
  | 'CREDENTIALS_ERROR' // wrong email/password, weak password, duplicate account
  | 'UNKNOWN_ERROR';

interface AuthState {
  supabaseEnabled: boolean;
  status: AuthStatus;
  provider: AuthProvider;
  email: string | null;
  error: string | null;
  errorCode: AuthErrorCode | null;
  notice: string | null;
  busy: boolean;

  init: () => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<'signed-in' | 'confirm-email' | 'error'>;
  signInEmail: (email: string, password: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signInDemo: () => Promise<void>;
  signOut: () => Promise<void>;
  reportOAuthError: (code: string, description?: string) => void;
  clearError: () => void;
  clear: () => void;
}

let subscribed = false;
let binding = false; // guards against getSession() + onAuthStateChange racing

/**
 * Classify an auth failure into one of a small set of codes so a developer
 * (or a future support UI) can immediately tell WHERE it went wrong —
 * Google/Supabase provider config, the OAuth session itself, our backend's
 * farmer-mapping step, or plain connectivity — instead of one generic
 * "unable to sign in".
 */
function classifyAuthError(e: unknown): AuthErrorCode {
  if (e instanceof ApiUnavailableError) return 'NETWORK_ERROR';
  if (e instanceof ApiError) return 'PROFILE_MAPPING_ERROR'; // valid session, backend/auth-me step failed
  const msg = ((e as AuthError)?.message ?? (e instanceof Error ? e.message : String(e))).toLowerCase();
  if (
    msg.includes('invalid_client') ||
    msg.includes('oauth client was not found') ||
    msg.includes('unauthorized_client') ||
    msg.includes('redirect_uri_mismatch') ||
    msg.includes('provider is not enabled') ||
    msg.includes('unsupported provider')
  )
    return 'OAUTH_CONFIGURATION_ERROR';
  if (msg.includes('network') || msg.includes('failed to fetch')) return 'NETWORK_ERROR';
  if (msg.includes('access_denied') || msg.includes('cancel') || msg.includes('popup closed') || msg.includes('user denied'))
    return 'SESSION_ERROR';
  if (msg.includes('session') && msg.includes('expired')) return 'SESSION_ERROR';
  if (
    msg.includes('invalid login credentials') ||
    msg.includes('email not confirmed') ||
    msg.includes('already registered') ||
    msg.includes('password should be at least') ||
    msg.includes('weak')
  )
    return 'CREDENTIALS_ERROR';
  return 'UNKNOWN_ERROR';
}

/**
 * Turn a Supabase / OAuth / API error into a farmer-friendly message.
 * The raw error AND its classification are always logged to the console in
 * development — the farmer never sees a stack trace or provider-internal
 * wording, but a developer immediately sees the real, classified reason.
 */
function friendly(e: unknown): string {
  const code = classifyAuthError(e);
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(`[auth] ${code}:`, e);
  }
  useAuthStore.setState({ errorCode: code });

  if (e instanceof ApiUnavailableError) return 'Cannot reach the procurement server. Check your connection and try again.';
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Your session could not be verified by the server. Please sign in again.';
    if (e.status === 403) return "You don't have permission to do that.";
    return e.message || 'Server authentication failed.';
  }
  const msg = (e as AuthError)?.message ?? (e instanceof Error ? e.message : String(e));
  const m = msg.toLowerCase();
  if (
    m.includes('invalid_client') ||
    m.includes('oauth client was not found') ||
    m.includes('unauthorized_client') ||
    m.includes('redirect_uri_mismatch')
  )
    return 'Google sign-in could not be completed. Please check the Google OAuth configuration.';
  if (m.includes('access_denied') || m.includes('cancel') || m.includes('popup closed') || m.includes('user denied'))
    return 'Google sign-in was cancelled.';
  if (m.includes('invalid login credentials')) return 'Invalid email or password.';
  if (m.includes('email not confirmed')) return 'Please confirm your email first — check your inbox for the confirmation link.';
  if (m.includes('already registered') || m.includes('user already registered'))
    return 'This email is already registered. Try signing in instead.';
  if (m.includes('provider is not enabled') || m.includes('unsupported provider'))
    return 'Google sign-in is not enabled for this project yet.';
  if (m.includes('password should be at least') || m.includes('weak'))
    return 'Password is too weak — use at least 6 characters.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Too many attempts. Please wait a minute and try again.';
  if (m.includes('session') && m.includes('expired')) return 'Your session has expired. Please sign in again.';
  if (m.includes('network') || m.includes('failed to fetch'))
    return 'Network error reaching Supabase. Check your connection.';
  if (m.includes('link') && m.includes('google'))
    return 'Your Google account could not be linked to KisanSetu. Please try again or use email sign-in.';
  return 'Unable to sign in. Please try again.';
}

/** OAuth clients return to `${origin}/farmer/auth` — env-aware, never hardcoded. */
function oauthRedirectTo(): string {
  return `${window.location.origin}/farmer/auth`;
}

/** Send the Supabase access token to the backend and hydrate the app farmer. */
async function bindSession(session: Session): Promise<{ farmerId: string | null }> {
  setToken(session.access_token);
  const me = (await authApi.me()) as {
    id: string;
    name: string;
    role: string;
    language?: string;
    farmer?: { id: string; village?: string };
  };
  const app = useAppStore.getState();
  app.__setBackendAuth('FARMER', me.farmer?.id ?? null);
  await app.hydrateFarmer();
  return { farmerId: me.farmer?.id ?? null };
}

/**
 * If the farmer completed the onboarding form (name / mobile / village) BEFORE
 * choosing a sign-in method (common with Google, which carries none of that),
 * apply it to the freshly-created profile — without overwriting anything the
 * backend already has.
 */
async function applyOnboardingDraft(farmerId: string | null): Promise<void> {
  if (!farmerId) return;
  const draft = useAppStore.getState().user;
  const profile = useAppStore.getState().farmerProfile as
    | { village?: string; mobile?: string; hasAddress?: boolean }
    | null;
  if (!draft) return;

  const patch: Record<string, unknown> = {};
  const villageMissing = !profile?.village || profile.village === 'Not set';
  const mobilePlaceholder = !profile?.mobile || profile.mobile.startsWith('sb_');

  if (draft.name && (!profile || draft.name !== useAppStore.getState().user?.name)) patch.name = draft.name;
  if (villageMissing && draft.village) {
    patch.village = draft.village;
    patch.location = `${draft.village}, ${draft.district ?? 'Jaipur'}`;
  }
  if (mobilePlaceholder && draft.mobile && /^[0-9+\- ]{10,15}$/.test(draft.mobile)) patch.mobile = draft.mobile;

  if (Object.keys(patch).length === 0) return;
  try {
    await farmerApi.update(farmerId, patch);
    await useAppStore.getState().hydrateFarmer();
  } catch {
    /* non-fatal — the farmer can finish this from Profile */
  }
}

/**
 * Both the explicit signInEmail()/signInWithGoogle() await chain AND
 * Supabase's own onAuthStateChange('SIGNED_IN') listener call this for the
 * same login — the `binding` mutex makes only one of them do the real work
 * (backend /auth/me + hydrateFarmer), which is why a dev log here shows two
 * "called" lines per sign-in. That's expected, not a bug.
 */
async function finishSignIn(session: Session, provider: 'supabase'): Promise<void> {
  if (binding) return;
  if (useAuthStore.getState().status === 'signed-in') {
    setToken(session.access_token); // just keep the bearer fresh
    return;
  }
  binding = true;
  try {
    const { farmerId } = await bindSession(session);
    await applyOnboardingDraft(farmerId);
    useAuthStore.setState({
      status: 'signed-in',
      provider,
      email: session.user.email ?? null,
      error: null,
      errorCode: null,
      notice: null,
      busy: false,
    });
  } catch (e) {
    // Valid Supabase session but backend/profile resolution failed (classified
    // as PROFILE_MAPPING_ERROR and logged by friendly() below) — surface it;
    // the Supabase session persists so a refresh / retry can recover.
    useAuthStore.setState({ status: 'signed-out', error: friendly(e), busy: false });
  } finally {
    binding = false;
  }
}

async function tryExistingJwt(): Promise<boolean> {
  try {
    const me = (await authApi.me()) as { role: string; farmer?: { id: string } };
    if (me.role !== 'FARMER') return false;
    useAppStore.getState().__setBackendAuth('FARMER', me.farmer?.id ?? null);
    await useAppStore.getState().hydrateFarmer();
    return true;
  } catch {
    return false;
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  supabaseEnabled,
  status: 'loading',
  provider: null,
  email: null,
  error: null,
  errorCode: null,
  notice: null,
  busy: false,

  init: async () => {
    if (supabaseEnabled && supabase) {
      if (!subscribed) {
        subscribed = true;
        supabase.auth.onAuthStateChange((event: AuthChangeEvent, session) => {
          if (event === 'SIGNED_OUT' || !session) {
            setToken(null);
            useAppStore.getState().__clearFarmerAuth();
            set({ status: 'signed-out', provider: null, email: null });
            return;
          }
          if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            // Handles the Google OAuth callback (redirect back to /farmer/auth)
            // AND normal session restoration — one code path, no duplication.
            void finishSignIn(session, 'supabase');
            return;
          }
          // TOKEN_REFRESHED / USER_UPDATED — keep the API bearer token fresh.
          setToken(session.access_token);
        });
      }

      // Fast path for an already-cached session; the negative case (and the
      // OAuth-callback code exchange) is handled by the INITIAL_SESSION event
      // from the listener above, so we never eagerly mark signed-out here.
      const { data } = await supabase.auth.getSession();
      if (data.session) await finishSignIn(data.session, 'supabase');

      // Safety net: if neither getSession nor INITIAL_SESSION has resolved the
      // state within a few seconds (e.g. offline), stop the infinite spinner.
      window.setTimeout(() => {
        if (useAuthStore.getState().status === 'loading') set({ status: 'signed-out' });
      }, 6000);
      return;
    }

    // No Supabase configured — remember the demo JWT if it is still valid.
    const ok = await tryExistingJwt();
    set(ok ? { status: 'signed-in', provider: 'demo' } : { status: 'signed-out' });
  },

  signUpEmail: async (email, password) => {
    set({ busy: true, error: null, errorCode: null, notice: null });
    try {
      if (!supabaseEnabled || !supabase) throw new Error('Supabase Auth is not configured.');
      const draft = useAppStore.getState().user;
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: oauthRedirectTo(),
          data: {
            name: draft?.name,
            mobile: draft?.mobile,
            village: draft?.village,
            location: draft ? `${draft.village}, ${draft.district}` : undefined,
            language: useAppStore.getState().language,
          },
        },
      });
      if (error) throw error;

      if (data.session) {
        await finishSignIn(data.session, 'supabase');
        return 'signed-in';
      }
      set({
        busy: false,
        notice: `Account created. We sent a confirmation link to ${email}. Confirm it, then sign in.`,
      });
      return 'confirm-email';
    } catch (e) {
      set({ error: friendly(e), busy: false });
      return 'error';
    }
  },

  signInEmail: async (email, password) => {
    set({ busy: true, error: null, errorCode: null, notice: null });
    try {
      if (!supabaseEnabled || !supabase) throw new Error('Supabase Auth is not configured.');
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await finishSignIn(data.session!, 'supabase');
      return true;
    } catch (e) {
      set({ error: friendly(e), busy: false });
      return false;
    }
  },

  /**
   * Continue with Google — Supabase OAuth. The browser is redirected to Google
   * and back to `${origin}/farmer/auth`; the returning session is picked up by
   * the onAuthStateChange listener above (INITIAL_SESSION / SIGNED_IN).
   */
  signInWithGoogle: async () => {
    set({ busy: true, error: null, errorCode: null, notice: null });
    try {
      if (!supabaseEnabled || !supabase) throw new Error('Supabase Auth is not configured.');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: oauthRedirectTo(),
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
      // On success the browser navigates away to Google; nothing else to do.
    } catch (e) {
      set({ error: friendly(e), busy: false });
    }
  },

  signInDemo: async () => {
    if (supabaseEnabled) {
      set({ error: 'Demo login is disabled because Supabase Auth is configured. Use email/password or Google.' });
      return;
    }
    set({ busy: true, error: null, errorCode: null });
    try {
      const { user } = await authApi.login('farmer@demo.com', 'demo1234');
      useAppStore.getState().__setBackendAuth('FARMER', user.profileId ?? null);
      await useAppStore.getState().hydrateFarmer();
      set({ status: 'signed-in', provider: 'demo', email: user.email });
    } catch (e) {
      set({ error: friendly(e) });
    } finally {
      set({ busy: false });
    }
  },

  signOut: async () => {
    if (supabaseEnabled && supabase) await supabase.auth.signOut().catch(() => undefined);
    setToken(null);
    useAppStore.getState().__clearFarmerAuth();
    set({ status: 'signed-out', provider: null, email: null, error: null, errorCode: null, notice: null });
  },

  reportOAuthError: (code, description) => {
    set({
      status: 'signed-out',
      busy: false,
      error: friendly(new Error(description || code || 'access_denied')),
    });
  },

  clearError: () => set({ error: null, errorCode: null, notice: null }),
  clear: () => {
    setToken(null);
    useAppStore.getState().__clearFarmerAuth();
    set({ status: 'signed-out', provider: null, email: null, error: null, errorCode: null, notice: null, busy: false });
  },
}));
