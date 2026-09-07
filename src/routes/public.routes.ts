import { Router } from 'express';
import { PublicController } from '../controllers/public.controller';
import { AnnouncementController } from '../controllers/announcement.controller';

const router = Router();

// Public recruitment status
router.get('/oprec-status', PublicController.getOprecStatus);

// Public announcements
router.get('/announcements', AnnouncementController.getPublicAnnouncements);

export default router;

