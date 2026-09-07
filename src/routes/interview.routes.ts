import { Router } from 'express';
import { InterviewController } from '../controllers/interview.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  createInterviewSchema,
  updateInterviewSchema,
  interviewIdParamSchema,
  getInterviewsQuerySchema,
} from '../schemas/interview.schema';

const router = Router();

// Protect all admin interview routes
router.use(authenticate);
router.use(requireAdmin);

router.post('/', validateRequest(createInterviewSchema), InterviewController.createInterview);
router.get('/', validateRequest(getInterviewsQuerySchema), InterviewController.getAdminInterviews);
router.patch('/:id', validateRequest(updateInterviewSchema), InterviewController.updateInterview);
router.delete('/:id', validateRequest(interviewIdParamSchema), InterviewController.cancelInterview);

export default router;
