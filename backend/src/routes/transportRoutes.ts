import { Router } from 'express';
import {
  getById,
  getFarmerTransports,
  getOptions,
  postBook,
  postCancel,
  postQuote,
  postStatus,
} from '../controllers/transportController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

router.get('/options', authenticate, getOptions);
router.post('/quote', authenticate, postQuote);
router.post('/book', authenticate, postBook);
router.get('/farmer/:farmerId', authenticate, getFarmerTransports);
router.get('/:id', authenticate, getById);
router.post('/:id/cancel', authenticate, postCancel);
router.post('/:id/status', authenticate, requireRole('CENTER_OFFICER', 'ADMIN'), postStatus);

export default router;
