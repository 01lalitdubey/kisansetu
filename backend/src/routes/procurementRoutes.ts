import { Router } from 'express';
import {
  getProcurements,
  patchProcurementStatus,
  postProcurement,
} from '../controllers/procurementController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

router.get('/', authenticate, getProcurements);
router.post('/', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), postProcurement);
router.patch('/:id/status', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), patchProcurementStatus);

export default router;
