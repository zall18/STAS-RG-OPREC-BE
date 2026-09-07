import { Router } from 'express';
import { GoldenController } from '../controllers/golden.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  submitGoldenAppSchema,
  updateGoldenAppSchema,
} from '../schemas/golden.schema';

const router = Router();

// Protected candidate routes
router.use(authenticate);

router.post('/', validateRequest(submitGoldenAppSchema), GoldenController.submitApplication);
router.get('/', GoldenController.getApplication);
router.put('/', validateRequest(updateGoldenAppSchema), GoldenController.updateApplication);

export default router;
