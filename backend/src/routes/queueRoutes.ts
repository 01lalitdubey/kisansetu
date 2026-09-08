import { Router } from 'express';
import {
  getQueue,
  postComplete,
  postProcessNext,
  postSetRunning,
  postSkip,
} from '../controllers/queueController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

const officer = [authenticate, requireRole('CENTER_OFFICER', 'ADMIN')];

router.get('/:centerId', getQueue);
router.post('/:centerId/process-next', ...officer, postProcessNext);
router.post('/:centerId/skip', ...officer, postSkip);
router.post('/:centerId/complete', ...officer, postComplete);
router.post('/:centerId/running', ...officer, postSetRunning);

export default router;
