import { Router } from 'express';
import authRoutes from './auth.routes';
import candidateRoutes from './candidate.routes';
import adminRoutes from './admin.routes';
import uploadRoutes from './upload.routes';
import publicRoutes from './public.routes';
import batchRoutes from './batch.routes';
import goldenRoutes from './golden.routes';
import notificationRoutes from './notification.routes';
import interviewRoutes from './interview.routes';
import activityLogRoutes from './activity-log.routes';
import announcementRoutes from './announcement.routes';

const router = Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'STAS-RG Recruitment API',
  });
});

// Main Feature Routes
router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/candidate/golden-application', goldenRoutes);
router.use('/candidate/notifications', notificationRoutes);
router.use('/candidate', candidateRoutes);

router.use('/admin/oprec/batches', batchRoutes);
router.use('/admin/interviews', interviewRoutes);
router.use('/admin/activity-logs', activityLogRoutes);
router.use('/admin/announcements', announcementRoutes);
router.use('/admin', adminRoutes);

router.use('/upload', uploadRoutes);

export default router;

