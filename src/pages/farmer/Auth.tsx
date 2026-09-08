import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Loader2, LogIn, ShieldCheck, UserPlus } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useAuthStore } from '../../store/authStore';

/** Inline Google "G" mark (lucide has no brand icons). */
function GoogleIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * SIGN IN / CREATE ACCOUNT — sits between onboarding and the dashboard, and
 * also serves as the Google OAuth return page (Supabase restores the session
 * here, then this page navigates on to the dashboard).
 */
export default function FarmerAuth() {
  const navigate = useNavigate();
  const draft = useAppStore((s) => s.user);
  const {
    supabaseEnabled,
    status,
    busy,
    error,
    notice,
    signInEmail,
    signUpEmail,
    signInWithGoogle,
    signInDemo,
    reportOAuthError,
    clearError,
  } = useAuthStore();

  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [returning, setReturning] = useState(false);

  // Detect an OAuth callback (success or failure) in the URL.
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const query = new URLSearchParams(window.location.search);
    const errCode = hash.get('error') || query.get('error');
    const errDesc = hash.get('error_description') || query.get('error_description');
    const hasCode = query.has('code') || hash.has('access_token');

    if (errCode) {
      reportOAuthError(errCode, errDesc ?? undefined);
      window.history.replaceState({}, '', '/farmer/auth');
    } else if (hasCode) {
      // Supabase is exchanging the code / token — show a spinner, the auth
      // store's listener will finish the sign-in and navigate.
      setReturning(true);
      window.history.replaceState({}, '', '/farmer/auth');
    }
  }, [reportOAuthError]);

  useEffect(() => {
    if (status === 'signed-in') navigate('/farmer/dashboard', { replace: true });
  }, [status, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    clearError();
    if (mode === 'signup') {
      const r = await signUpEmail(email.trim(), password);
      if (r === 'confirm-email') setMode('signin');
    } else {
      await signInEmail(email.trim(), password);
    }
  }

  // Post-redirect: session is being restored/verified.
  if (returning && status === 'loading') {
    return (
      <div className="bg-field flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-white">
        <Loader2 className="h-10 w-10 animate-spin" />
        <p className="text-lg font-bold">Completing sign-in…</p>
        <p className="text-sm text-white/70">Verifying your Google account with KisanSetu AI.</p>
      </div>
    );
  }

  return (
    <div className="bg-field flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-kisan-500 text-2xl">🌾</div>
          <h1 className="mt-3 text-2xl font-extrabold text-white">
            {mode === 'signup' ? 'Create your account' : 'Welcome to KisanSetu'}
          </h1>
          <p className="mt-1 text-sm text-white/70">
            {draft?.name ? `Almost there, ${draft.name}.` : 'Secure sign-in for farmers.'}
          </p>
        </div>

        <div className="card p-6">
          {supabaseEnabled ? (
            <>
              <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-kisan-50 p-1 text-sm font-bold">
                <button
                  onClick={() => setMode('signup')}
                  className={`rounded-lg py-2 ${mode === 'signup' ? 'bg-white text-kisan-800 shadow-card' : 'text-kisan-600'}`}
                >
                  Create account
                </button>
                <button
                  onClick={() => setMode('signin')}
                  className={`rounded-lg py-2 ${mode === 'signin' ? 'bg-white text-kisan-800 shadow-card' : 'text-kisan-600'}`}
                >
                  Sign in
                </button>
              </div>

              <form className="space-y-4" onSubmit={submit}>
                <div>
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    required
                    className="field-input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="field-label">Password</label>
                  <input
                    type="password"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    required
                    minLength={6}
                    className="field-input"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                </div>

                {error && (
                  <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>
                )}
                {notice && !error && (
                  <p className="rounded-lg bg-kisan-50 px-3 py-2 text-sm font-medium text-kisan-800">{notice}</p>
                )}

                <button type="submit" className="btn-primary w-full text-lg" disabled={busy}>
                  {busy ? (
                    'Please wait…'
                  ) : mode === 'signup' ? (
                    <>
                      <UserPlus className="h-5 w-5" /> Create account
                    </>
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" /> Sign In
                    </>
                  )}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3 text-xs font-semibold text-kisan-400">
                <span className="h-px flex-1 bg-kisan-100" />
                OR
                <span className="h-px flex-1 bg-kisan-100" />
              </div>

              <button
                type="button"
                onClick={() => signInWithGoogle()}
                disabled={busy}
                className="btn w-full border border-kisan-200 bg-white text-base font-bold text-kisan-800 hover:bg-kisan-50"
              >
                <GoogleIcon /> Continue with Google
              </button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-kisan-500">
                <ShieldCheck className="h-3.5 w-3.5" /> Sessions are remembered — you won't be asked to
                sign in every time.
              </p>
            </>
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm text-kisan-700">
                Supabase Auth is not configured in this environment. Continue with the demo farmer
                account to explore the app.
              </p>
              {error && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{error}</p>
              )}
              <button className="btn-primary w-full text-lg" onClick={() => signInDemo()} disabled={busy}>
                {busy ? 'Signing in…' : 'Continue as demo farmer'} <ArrowRight className="h-5 w-5" />
              </button>
              <p className="text-xs text-kisan-500">
                Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to enable
                real email/password &amp; Google accounts.
              </p>
            </div>
          )}
        </div>

        <button
          onClick={() => navigate('/farmer/onboarding')}
          className="mx-auto mt-4 block text-sm font-semibold text-white/70 hover:text-white"
        >
          ← Back to onboarding
        </button>
      </div>
    </div>
  );
}
