import { z } from 'zod';
import { RoleInterest } from '@prisma/client';

export const upsertProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
    universitas: z.string().min(1, 'Universitas wajib diisi'),
    nim: z.string().min(1, 'NIM wajib diisi'),
    programStudi: z.string().min(1, 'Program studi wajib diisi'),
    roleInterest: z.nativeEnum(RoleInterest, {
      errorMap: () => ({ message: 'Role interest harus RISET atau MAGANG' }),
    }),
    cvUrl: z.string().url('URL CV tidak valid'),
    transkripUrl: z.string().url('URL Transkrip tidak valid').optional().nullable(),
    ipk: z.number().min(0).max(4.0, 'IPK maksimal 4.0').optional().nullable(),
    semester: z.number().int().min(1).max(14).optional().nullable(),
    portfolioUrl: z.string().url('URL Portofolio tidak valid'),
    pengalaman: z.string().optional().nullable(),
  }),
});

export const applyOprecSchema = z.object({
  body: z.object({
    batchName: z.string().optional(),
  }),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>['body'];
export type ApplyOprecInput = z.infer<typeof applyOprecSchema>['body'];
