import { Router } from 'express';
import {
  postHighDemand,
  postProcessToken,
  postQueueReduction,
  postReset,
  postScheduleChange,
} from '../controllers/demoController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { isProd } from '../config/env';
import { ApiError } from '../utils/response';

const router = Router();

// Demo controls modify real database state and simulate scenarios for a
// hardcoded demo centre — never available in production, regardless of role.
router.use((_req, _res, next) => {
  if (isProd) return next(ApiError.notFound('Not found'));
  return next();
});
router.use(authenticate, requireRole('CENTER_OFFICER', 'ADMIN'));

router.post('/high-demand', postHighDemand);
router.post('/queue-reduction', postQueueReduction);
router.post('/schedule-change', postScheduleChange);
router.post('/process-token', postProcessToken);
router.post('/reset', postReset);

export default router;
