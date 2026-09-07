import { Router } from 'express';
import { BatchController } from '../controllers/batch.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createBatchSchema,
  updateBatchSchema,
  batchIdParamSchema,
} from '../schemas/batch.schema';

const router = Router();

// Protect all batch routes for ADMIN
router.use(authenticate);
router.use(requireAdmin);

router.post('/', validateRequest(createBatchSchema), BatchController.createBatch);
router.get('/', BatchController.getBatches);
router.get('/:id', validateRequest(batchIdParamSchema), BatchController.getBatchById);
router.put('/:id', validateRequest(updateBatchSchema), BatchController.updateBatch);
router.delete('/:id', validateRequest(batchIdParamSchema), BatchController.deleteBatch);
router.patch('/:id/activate', validateRequest(batchIdParamSchema), BatchController.activateBatch);

export default router;
