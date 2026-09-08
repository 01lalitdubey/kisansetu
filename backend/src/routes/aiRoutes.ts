import { Router } from 'express';
import {
  getCenterLoad,
  getLoadBalancing,
  postApplyLoadBalancing,
  postChat,
  postRecommendSlot,
  postWaitingTime,
} from '../controllers/aiController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';
import { rateLimit } from '../middleware/rateLimitMiddleware';

const router = Router();

// Deterministic AI service — isolated so a Python ML service can replace it later.
router.post('/waiting-time', postWaitingTime);
router.get('/waiting-time', postWaitingTime);
router.post('/recommend-slot', postRecommendSlot);
router.get('/center-load', getCenterLoad);
router.get('/load-balancing', getLoadBalancing);
router.post('/load-balancing/apply', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), postApplyLoadBalancing);

// KisanSetu AI Assistant (Gemini-backed, falls back to a deterministic
// assistant). Farmer-only — farmerId is taken from the session, never trusted
// from the request body. Rate-limited: Gemini calls cost money.
router.post(
  '/chat',
  authenticate,
  requireRole('FARMER'),
  rateLimit({ windowMs: 60_000, max: 15 }),
  postChat,
);

export default router;
