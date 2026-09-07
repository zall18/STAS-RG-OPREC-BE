import { z } from 'zod';

export const createBatchSchema = z.object({
  body: z.object({
    name: z.string().min(1, 'Nama batch wajib diisi'),
    description: z.string().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    quota: z.number().int().positive('Kuota harus berupa angka positif').optional().nullable(),
    isActive: z.boolean().optional().default(false),
  }),
});

export const updateBatchSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID Batch tidak valid'),
  }),
  body: z.object({
    name: z.string().min(1, 'Nama batch tidak boleh kosong').optional(),
    description: z.string().optional().nullable(),
    startDate: z.string().datetime().optional().nullable(),
    endDate: z.string().datetime().optional().nullable(),
    quota: z.number().int().positive('Kuota harus berupa angka positif').optional().nullable(),
    isActive: z.boolean().optional(),
  }),
});

export const batchIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID Batch tidak valid'),
  }),
});

export type CreateBatchInput = z.infer<typeof createBatchSchema>['body'];
export type UpdateBatchInput = z.infer<typeof updateBatchSchema>['body'];
