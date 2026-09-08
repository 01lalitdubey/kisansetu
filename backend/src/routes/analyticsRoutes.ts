import { Router } from 'express';
import {
  getCenterAnalytics,
  getCenterUtilization,
  getCropProcurement,
  getFarmersServed,
  getPeakHours,
  getWaitingTime,
} from '../controllers/analyticsController';

const router = Router();

router.get('/farmers-served', getFarmersServed);
router.get('/waiting-time', getWaitingTime);
router.get('/center-utilization', getCenterUtilization);
router.get('/crop-procurement', getCropProcurement);
router.get('/peak-hours', getPeakHours);
router.get('/center/:centerId', getCenterAnalytics);

export default router;
