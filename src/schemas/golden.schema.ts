import { z } from 'zod';

export const submitGoldenAppSchema = z.object({
  body: z.object({
    motivasi: z.string().min(1, 'Motivasi wajib diisi'),
    pencapaian: z.string().min(1, 'Pencapaian wajib diisi'),
    rekomendasi: z.string().optional().nullable(),
    registrationId: z.string().uuid('ID Registrasi tidak valid').optional().nullable(),
  }),
});

export const updateGoldenAppSchema = z.object({
  body: z.object({
    motivasi: z.string().min(1, 'Motivasi tidak boleh kosong').optional(),
    pencapaian: z.string().min(1, 'Pencapaian tidak boleh kosong').optional(),
    rekomendasi: z.string().optional().nullable(),
  }),
});

export type SubmitGoldenAppInput = z.infer<typeof submitGoldenAppSchema>['body'];
export type UpdateGoldenAppInput = z.infer<typeof updateGoldenAppSchema>['body'];
