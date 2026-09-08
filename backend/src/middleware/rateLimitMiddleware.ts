import type { NextFunction, Request, Response } from 'express';
import { ApiError } from '../utils/response';

/**
 * Minimal in-memory sliding-window rate limiter — enough to stop a single
 * user hammering an expensive endpoint (Gemini calls cost money). Not meant
 * to replace a shared store in a multi-instance deployment; fine for this
 * prototype's single-process backend.
 */
export function rateLimit(opts: { windowMs: number; max: number; keyFn?: (req: Request) => string }) {
  const hits = new Map<string, number[]>();

  return (req: Request, _res: Response, next: NextFunction): void => {
    const key = opts.keyFn ? opts.keyFn(req) : req.user?.userId ?? req.ip ?? 'anonymous';
    const now = Date.now();
    const windowStart = now - opts.windowMs;

    const timestamps = (hits.get(key) ?? []).filter((t) => t > windowStart);
    if (timestamps.length >= opts.max) {
      return next(new ApiError(429, 'Too many requests. Please wait a moment and try again.'));
    }
    timestamps.push(now);
    hits.set(key, timestamps);

    // Opportunistic cleanup so the map does not grow unbounded.
    if (hits.size > 5000) {
      for (const [k, v] of hits) {
        if (v.every((t) => t <= windowStart)) hits.delete(k);
      }
    }

    next();
  };
}
