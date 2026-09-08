import { Router } from 'express';
import { deleteToken, getToken, postToken } from '../controllers/tokenController';
import { authenticate } from '../middleware/authMiddleware';

const router = Router();

router.post('/', authenticate, postToken);
router.get('/:id', getToken);
router.delete('/:id', authenticate, deleteToken);

export default router;
