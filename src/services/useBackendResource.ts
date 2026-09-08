import { useEffect, useState } from 'react';
import { withBackend } from './api';

/**
 * Fetch `live()` from the backend when it is enabled + reachable, otherwise
 * use `fallback` (mock data). Returns the value plus a `loading` flag so
 * pages can show "Loading…" instead of a blank screen.
 */
export function useBackendResource<T>(
  live: () => Promise<T>,
  fallback: T,
  deps: unknown[] = [],
): { data: T; loading: boolean; error: string | null; reload: () => void } {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    withBackend(live, () => fallback)
      .then((value) => {
        if (alive) setData(value ?? fallback);
      })
      .catch((e: unknown) => {
        if (alive) {
          setError(e instanceof Error ? e.message : 'Failed to load');
          setData(fallback);
        }
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nonce, ...deps]);

  return { data, loading, error, reload: () => setNonce((n) => n + 1) };
}
