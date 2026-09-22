import { Router } from 'express';
import { AdminUserController } from '../controllers/admin-user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createAdminSchema,
  updateAdminPasswordSchema,
  adminUserIdParamSchema,
} from '../schemas/admin-user.schema';

const router = Router();

// Protect all admin management routes with authenticate & requireAdmin
router.use(authenticate);
router.use(requireAdmin);

router.get('/', AdminUserController.getAdmins);
router.post('/', validateRequest(createAdminSchema), AdminUserController.createAdmin);
router.delete('/:id', validateRequest(adminUserIdParamSchema), AdminUserController.deleteAdmin);
router.patch('/:id/password', validateRequest(updateAdminPasswordSchema), AdminUserController.resetPassword);

export default router;
