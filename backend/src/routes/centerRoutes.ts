import { Router } from 'express';
import {
  getCenterAnalytics,
  getCenterById,
  getCenterFarmers,
  getCenters,
  getMyCenterController,
  getSchedulesForCenter,
  patchCenter,
  patchCenterStatus,
  postRegisterCenter,
} from '../controllers/centerController';
import { authenticate, optionalAuth } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

router.get('/', optionalAuth, getCenters);
router.post('/register', authenticate, postRegisterCenter);
router.get('/mine', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), getMyCenterController);
router.get('/:id', getCenterById);
router.get('/:id/schedules', getSchedulesForCenter);
router.get('/:id/farmers', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), getCenterFarmers);
router.get('/:id/analytics', getCenterAnalytics);
router.patch('/:id/status', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), patchCenterStatus);
router.patch('/:id', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), patchCenter);

export default router;
