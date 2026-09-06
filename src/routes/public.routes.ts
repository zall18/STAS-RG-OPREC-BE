import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';

const router = Router();

// Public recruitment status
router.get('/oprec-status', PublicController.getOprecStatus);

export default router;
