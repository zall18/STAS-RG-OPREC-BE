import { Router } from 'express';
import authRoutes from './auth.routes';
import candidateRoutes from './candidate.routes';
import adminRoutes from './admin.routes';
import uploadRoutes from './upload.routes';
import publicRoutes from './public.routes';

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
router.use('/candidate', candidateRoutes);
router.use('/admin', adminRoutes);
router.use('/upload', uploadRoutes);

export default router;
