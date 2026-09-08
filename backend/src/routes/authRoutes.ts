import { Router } from 'express';
import { getAuthConfigStatus, getProfile, postLogin, postRegister } from '../controllers/authController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/login', postLogin);
router.post('/register', postRegister);
router.get('/me', authenticate, getProfile);
router.get('/config-status', getAuthConfigStatus);

export default router;
