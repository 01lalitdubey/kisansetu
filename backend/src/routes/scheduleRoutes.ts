import { Router } from 'express';
import { getAllSchedules, getRecommendedSchedule } from '../controllers/centerController';

const router = Router();

// GET /api/schedules            -> all schedules
// GET /api/schedules/recommended?centerId=... -> AI recommended slot
// GET /api/schedules/:centerId  -> schedules for one centre
router.get('/', getAllSchedules);
router.get('/recommended', getRecommendedSchedule);
router.get('/:centerId', getAllSchedules);

export default router;
