import { Router } from 'express';
import { ActivityLogController } from '../controllers/activity-log.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { getActivityLogsQuerySchema } from '../schemas/activity-log.schema';

const router = Router();

// Protect all activity log routes with ADMIN role
router.use(authenticate);
router.use(requireAdmin);

router.get('/', validateRequest(getActivityLogsQuerySchema), ActivityLogController.getActivityLogs);

export default router;
