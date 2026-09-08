import { Router } from 'express';
import {
  getNotifications,
  patchNotificationRead,
  postMarkAllRead,
  postNotification,
} from '../controllers/notificationController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.get('/', authenticate, getNotifications);
router.get('/:farmerId', authenticate, getNotifications);
router.post('/', authenticate, postNotification);
router.patch('/:id/read', authenticate, patchNotificationRead);
router.post('/:farmerId/read-all', authenticate, postMarkAllRead);

export default router;
