import { Router } from 'express';
import {
  getAdminOverview,
  getById,
  getConfig,
  getFarmerPayments,
  getVerify,
  postDemoConfirm,
  postStartTransportPayment,
} from '../controllers/paymentController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// NOTE: POST /api/payments/stripe/webhook is mounted in app.ts (needs raw body).
router.get('/config', getConfig);
router.post('/transport/start', authenticate, postStartTransportPayment);
router.get('/verify', authenticate, getVerify);
router.post('/demo-confirm', authenticate, postDemoConfirm);
router.get('/farmer/:farmerId', authenticate, getFarmerPayments);
router.get('/admin/overview', authenticate, requireRole('ADMIN'), getAdminOverview);
router.get('/:id', authenticate, getById);

export default router;
