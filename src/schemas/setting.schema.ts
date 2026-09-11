import { z } from 'zod';

export const updateRecruitmentSettingSchema = z.object({
  body: z.object({
    isActive: z.boolean({ required_error: 'Status aktif (isActive) wajib diisi' }),
    isGoldenCandidateActive: z.boolean().optional(),
    currentBatch: z.string().min(1, 'Nama batch aktif wajib diisi'),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    description: z.string().optional().nullable(),
  }),
});

export type UpdateRecruitmentSettingInput = z.infer<typeof updateRecruitmentSettingSchema>['body'];
