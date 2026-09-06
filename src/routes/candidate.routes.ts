import { Router } from 'express';
import { CandidateController } from '../controllers/candidate.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { upsertProfileSchema, applyOprecSchema } from '../schemas/candidate.schema';

const router = Router();

// Protect all candidate routes
router.use(authenticate);

router.post('/profile', validateRequest(upsertProfileSchema), CandidateController.upsertProfile);
router.get('/profile', CandidateController.getProfile);
router.post('/apply-oprec', validateRequest(applyOprecSchema), CandidateController.applyOprec);

export default router;
