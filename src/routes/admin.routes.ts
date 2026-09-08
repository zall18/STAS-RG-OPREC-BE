import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/role.middleware';
import { validateRequest } from '../middlewares/validate.middleware';
import {
  getCandidatesQuerySchema,
  candidateIdParamSchema,
  updateStatusSchema,
  assignProjectSchema,
  updateRecruitmentSettingSchema,
  bulkStatusSchema,
  createAdminNoteSchema,
  deleteAdminNoteSchema,
  updateGoldenStatusSchema,
} from '../schemas/admin.schema';
import { getDashboardStatsQuerySchema } from '../schemas/dashboard.schema';

const router = Router();

// Protect all admin routes with authentication & ADMIN role check
router.use(authenticate);
router.use(requireAdmin);

// Dashboard Analytics & Metrics
router.get(
  '/dashboard/stats',
  validateRequest(getDashboardStatsQuerySchema),
  DashboardController.getStats
);

// Dynamic Recruitment Settings
router.get('/settings/oprec', AdminController.getRecruitmentSetting);
router.patch(
  '/settings/oprec',
  validateRequest(updateRecruitmentSettingSchema),
  AdminController.updateRecruitmentSetting
);

// Export Candidates (place before /candidates/:id)
router.get('/candidates/export', AdminController.exportCandidates);

// Bulk Actions (place before /candidates/:id)
router.patch(
  '/candidates/bulk-status',
  validateRequest(bulkStatusSchema),
  AdminController.bulkUpdateStatus
);

// Candidate Management
router.get('/candidates', validateRequest(getCandidatesQuerySchema), AdminController.getCandidates);
router.get('/candidates/:id', validateRequest(candidateIdParamSchema), AdminController.getCandidateById);

// Candidate Internal Notes
router.post(
  '/candidates/:id/notes',
  validateRequest(createAdminNoteSchema),
  AdminController.createCandidateNote
);
router.get(
  '/candidates/:id/notes',
  validateRequest(candidateIdParamSchema),
  AdminController.getCandidateNotes
);
router.delete(
  '/candidates/:id/notes/:noteId',
  validateRequest(deleteAdminNoteSchema),
  AdminController.deleteCandidateNote
);
router.patch(
  '/candidates/:registrationId/status',
  validateRequest(updateStatusSchema),
  AdminController.updateStatus
);
router.patch(
  '/candidates/:registrationId/project',
  validateRequest(assignProjectSchema),
  AdminController.assignProject
);

// Golden Candidate Status Management
router.patch(
  '/candidates/:id/golden-status',
  validateRequest(updateGoldenStatusSchema),
  AdminController.updateGoldenStatus
);

export default router;

