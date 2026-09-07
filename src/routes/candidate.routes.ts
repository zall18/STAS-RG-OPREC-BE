import { Router } from 'express';
import { CandidateController } from '../controllers/candidate.controller';
import { InterviewController } from '../controllers/interview.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import { upsertProfileSchema, applyOprecSchema } from '../schemas/candidate.schema';
import { interviewIdParamSchema } from '../schemas/interview.schema';

const router = Router();

// Protect all candidate routes
router.use(authenticate);

router.post('/profile', validateRequest(upsertProfileSchema), CandidateController.upsertProfile);
router.get('/profile', CandidateController.getProfile);
router.post('/apply-oprec', validateRequest(applyOprecSchema), CandidateController.applyOprec);

// Candidate Registration History (F8)
router.get('/registrations', CandidateController.getRegistrations);

// Candidate Interview Schedules (F7)
router.get('/interviews', InterviewController.getCandidateInterviews);
router.patch('/interviews/:id/confirm', validateRequest(interviewIdParamSchema), InterviewController.confirmInterview);

export default router;

