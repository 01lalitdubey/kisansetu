import type { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { ApiError } from '../utils/response';
import { isProd } from '../config/env';

/** 404 for unknown routes. */
export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ success: false, message: 'Route not found' });
}

/** Centralised error handler — every thrown error ends up here. */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // Known application errors
  if (err instanceof ApiError) {
    res.status(err.status).json({
      success: false,
      message: err.message,
      ...(err.details ? { errors: err.details } : {}),
    });
    return;
  }

  // Zod validation errors that escaped `validate()`
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // Prisma known errors -> friendly HTTP codes
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({ success: false, message: 'A record with these details already exists' });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({ success: false, message: 'Requested record was not found' });
      return;
    }
    res.status(400).json({ success: false, message: `Database error (${err.code})` });
    return;
  }

  // Unknown -> 500, never leak internals in production
  // eslint-disable-next-line no-console
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Something went wrong',
    ...(isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
}

/** Wrap async controllers so rejected promises reach errorHandler. */
export function asyncHandler<T extends (req: Request, res: Response, next: NextFunction) => Promise<unknown>>(
  fn: T,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
