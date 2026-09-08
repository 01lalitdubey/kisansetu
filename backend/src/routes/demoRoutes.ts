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

const router = Router();

// Demo controls modify real database state — restricted to officer/admin.
router.use(authenticate, requireRole('CENTER_OFFICER', 'ADMIN'));

router.post('/high-demand', postHighDemand);
router.post('/queue-reduction', postQueueReduction);
router.post('/schedule-change', postScheduleChange);
router.post('/process-token', postProcessToken);
router.post('/reset', postReset);

export default router;
