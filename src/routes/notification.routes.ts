import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  notificationIdParamSchema,
  getNotificationsQuerySchema,
} from '../schemas/notification.schema';

const router = Router();

router.use(authenticate);

router.get('/', validateRequest(getNotificationsQuerySchema), NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/:id/read', validateRequest(notificationIdParamSchema), NotificationController.markAsRead);

export default router;
