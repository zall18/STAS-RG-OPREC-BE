import { z } from 'zod';
import { SelectionStatus, RoleInterest } from '@prisma/client';
export { updateRecruitmentSettingSchema, UpdateRecruitmentSettingInput } from './setting.schema';

export const getCandidatesQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    batch: z.string().optional(),
    status: z.nativeEnum(SelectionStatus).optional(),
    roleInterest: z.nativeEnum(RoleInterest).optional(),
    isGolden: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
    page: z
      .string()
      .optional()
      .transform((val) => (val ? Math.max(1, parseInt(val, 10) || 1) : 1)),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10) || 10)) : 10)),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({
    registrationId: z.string().uuid('ID Registrasi tidak valid'),
  }),
  body: z.object({
    status: z.nativeEnum(SelectionStatus, {
      errorMap: () => ({
        message: 'Status harus salah satu dari: PENDING, SELEKSI_BERKAS, WAWANCARA_1, WAWANCARA_2, DITERIMA',
      }),
    }),
  }),
});

export const assignProjectSchema = z.object({
  params: z.object({
    registrationId: z.string().uuid('ID Registrasi tidak valid'),
  }),
  body: z.object({
    assignedProject: z.string().min(1, 'Nama proyek wajib diisi'),
  }),
});

export const candidateIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID Kandidat tidak valid'),
  }),
});
