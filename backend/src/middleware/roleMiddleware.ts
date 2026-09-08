import type { NextFunction, Request, Response } from 'express';
import type { Role } from '@prisma/client';
import { ApiError } from '../utils/response';

/**
 * Guard a route by role. Use after `authenticate`.
 *   router.get('/admin/overview', authenticate, requireRole('ADMIN'), handler)
 */
export function requireRole(...roles: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

/**
 * Guard a `:centerId`-scoped route so a CENTER_OFFICER can only act on their
 * OWN centre — role alone is not enough (any two officers otherwise pass
 * the same `requireRole('CENTER_OFFICER')` check regardless of which centre
 * the URL points at). ADMIN bypasses this check by design. Use AFTER
 * `authenticate` + `requireRole('CENTER_OFFICER', 'ADMIN')`.
 *
 *   router.post('/:centerId/process-next', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), requireOwnCenter(), postProcessNext)
 */
export function requireOwnCenter(paramName = 'centerId') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) return next(ApiError.unauthorized());
    if (req.user.role === 'ADMIN') return next();
    if (req.user.role === 'CENTER_OFFICER' && req.user.centerId === req.params[paramName]) {
      return next();
    }
    return next(ApiError.forbidden('You can only manage your own procurement centre'));
  };
}
