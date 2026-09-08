import { useEffect } from 'react';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

/**
 * Thin status strip shown only when the backend is enabled but not online.
 * Keeps the app usable (mock fallback) instead of blank-screening.
 */
export function ConnectionBanner() {
  const backendEnabled = useAppStore((s) => s.backendEnabled);
  const connection = useAppStore((s) => s.connection);
  const bootstrap = useAppStore((s) => s.bootstrap);
  const retry = useAppStore((s) => s.retryConnection);

  useEffect(() => {
    if (backendEnabled && connection === 'idle') void bootstrap();
  }, [backendEnabled, connection, bootstrap]);

  if (!backendEnabled || connection === 'online' || connection === 'idle') return null;

  if (connection === 'connecting') {
    return (
      <div className="flex items-center justify-center gap-2 bg-kisan-800 px-4 py-1.5 text-xs font-semibold text-white">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Connecting to procurement services…
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 bg-amber-500 px-4 py-1.5 text-xs font-semibold text-amber-950">
      <WifiOff className="h-3.5 w-3.5" />
      Unable to connect to procurement services — running in demo mode.
      <button
        onClick={() => void retry()}
        className="inline-flex items-center gap-1 rounded-md bg-amber-950/10 px-2 py-0.5 font-bold hover:bg-amber-950/20"
      >
        <RefreshCw className="h-3 w-3" /> Try Again
      </button>
    </div>
  );
}
