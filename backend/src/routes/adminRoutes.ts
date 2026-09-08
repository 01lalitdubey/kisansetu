import { Router } from 'express';
import {
  getAdminCenters,
  getAdminFarmers,
  getAdminInsights,
  getAdminPayments,
  getAdminProcurements,
  getOverview,
  getTransportOverview,
} from '../controllers/adminController';
import { postCenterApproval } from '../controllers/centerController';
import { authenticate } from '../middleware/authMiddleware';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

router.use(authenticate, requireRole('ADMIN'));

router.get('/overview', getOverview);
router.get('/centers', getAdminCenters);
router.post('/centers/:id/approval', postCenterApproval);
router.get('/farmers', getAdminFarmers);
router.get('/procurements', getAdminProcurements);
router.get('/payments', getAdminPayments);
router.get('/transport-overview', getTransportOverview);
router.get('/insights', getAdminInsights);

export default router;
