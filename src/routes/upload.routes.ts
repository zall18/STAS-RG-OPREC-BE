import { Router } from 'express';
import { UploadController } from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { uploadDocumentMiddleware } from '../middlewares/upload.middleware';

const router = Router();

// Protected upload route
router.post('/document', authenticate, uploadDocumentMiddleware, UploadController.uploadDocument);

export default router;
