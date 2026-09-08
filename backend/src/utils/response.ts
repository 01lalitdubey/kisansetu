import type { Response } from 'express';

/** Consistent success envelope: { success: true, data }. */
export function ok<T>(res: Response, data: T, status = 200): Response {
  return res.status(status).json({ success: true, data });
}

/** Consistent error envelope: { success: false, message }. */
export function fail(res: Response, message: string, status = 400, extra?: Record<string, unknown>): Response {
  return res.status(status).json({ success: false, message, ...(extra ?? {}) });
}

/**
 * Thrown anywhere in a controller/service; caught by errorMiddleware and
 * turned into a `fail(...)` response with the right HTTP status.
 */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }

  static badRequest(msg = 'Bad request', details?: unknown) {
    return new ApiError(400, msg, details);
  }
  static unauthorized(msg = 'Unauthorized') {
    return new ApiError(401, msg);
  }
  static forbidden(msg = 'Forbidden') {
    return new ApiError(403, msg);
  }
  static notFound(msg = 'Not found') {
    return new ApiError(404, msg);
  }
  static conflict(msg = 'Conflict') {
    return new ApiError(409, msg);
  }
  static internal(msg = 'Something went wrong') {
    return new ApiError(500, msg);
  }
}
