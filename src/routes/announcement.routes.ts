import { Router } from 'express';
import { AnnouncementController } from '../controllers/announcement.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createAnnouncementSchema,
  updateAnnouncementSchema,
  announcementIdParamSchema,
} from '../schemas/announcement.schema';

const router = Router();

// Protect all admin announcement routes
router.use(authenticate);
router.use(requireAdmin);

router.post('/', validateRequest(createAnnouncementSchema), AnnouncementController.createAnnouncement);
router.patch('/:id', validateRequest(updateAnnouncementSchema), AnnouncementController.updateAnnouncement);
router.delete('/:id', validateRequest(announcementIdParamSchema), AnnouncementController.deleteAnnouncement);

export default router;
