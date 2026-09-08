import { Router } from 'express';
import {
  getQueue,
  postComplete,
  postProcessNext,
  postSetRunning,
  postSkip,
} from '../controllers/queueController';
import { authenticate } from '../middleware/authMiddleware';
import { requireOwnCenter, requireRole } from '../middleware/roleMiddleware';

const router = Router();

// requireOwnCenter() must run AFTER requireRole so req.user is populated,
// and stops an officer from one centre mutating another centre's queue —
// requireRole alone only checks the role, not which centre the URL points at.
const officer = [authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), requireOwnCenter()];

router.get('/:centerId', getQueue);
router.post('/:centerId/process-next', ...officer, postProcessNext);
router.post('/:centerId/skip', ...officer, postSkip);
router.post('/:centerId/complete', ...officer, postComplete);
router.post('/:centerId/running', ...officer, postSetRunning);

export default router;
