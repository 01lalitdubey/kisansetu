import { Router } from 'express';
import {
  getFarmer,
  getFarmerHistoryController,
  getFarmerNotifications,
  getFarmerTokens,
  listFarmers,
  patchFarmer,
} from '../controllers/farmerController';
import { getFarmerProcurements } from '../controllers/procurementController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// All farmer endpoints are authenticated + ownership-checked in the controller.
router.get('/', authenticate, requireRole('ADMIN', 'CENTER_OFFICER'), listFarmers);
router.get('/:id', authenticate, getFarmer);
router.patch('/:id', authenticate, patchFarmer);
router.get('/:id/tokens', authenticate, getFarmerTokens);
router.get('/:id/history', authenticate, getFarmerHistoryController);
router.get('/:id/procurements', authenticate, getFarmerProcurements);
router.get('/:id/notifications', authenticate, getFarmerNotifications);

export default router;
