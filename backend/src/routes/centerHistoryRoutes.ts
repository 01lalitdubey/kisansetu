import { Router } from 'express';
import { getOfficerCenterHistory } from '../controllers/centerController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// GET /api/center/history — the authenticated officer's own centre only.
router.get('/history', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), getOfficerCenterHistory);

export default router;
