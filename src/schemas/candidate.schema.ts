import { z } from 'zod';
import { RoleInterest } from '@prisma/client';

export const upsertProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(1, 'Nama lengkap wajib diisi'),
    universitas: z.string().min(1, 'Universitas wajib diisi'),
    nim: z.string().min(1, 'NIM wajib diisi'),
    programStudi: z.string().min(1, 'Program studi wajib diisi'),
    roleInterest: z.preprocess(
      (val) => (typeof val === 'string' ? val.trim().toUpperCase() : val),
      z.nativeEnum(RoleInterest, {
        errorMap: () => ({ message: 'Role interest harus RISET atau MAGANG' }),
      })
    ),
    cvUrl: z
      .string({ required_error: 'CV wajib diunggah' })
      .min(1, 'CV wajib diunggah')
      .transform((val) => {
        const trimmed = val.trim();
        if (trimmed && !/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
          return `https://${trimmed}`;
        }
        return trimmed;
      }),
    transkripUrl: z
      .string()
      .optional()
      .nullable()
      .transform((val) => {
        if (!val || val.trim() === '') return null;
        const trimmed = val.trim();
        if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
          return `https://${trimmed}`;
        }
        return trimmed;
      }),
    ipk: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((val) => {
        if (val === undefined || val === null || val === '') return null;
        const parsed = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
        return isNaN(parsed) ? null : parsed;
      })
      .refine((val) => val === null || (val >= 0 && val <= 4.0), {
        message: 'IPK harus bernilai antara 0.00 dan 4.00',
      }),
    semester: z
      .union([z.number(), z.string()])
      .optional()
      .nullable()
      .transform((val) => {
        if (val === undefined || val === null || val === '') return null;
        const parsed = typeof val === 'string' ? parseInt(val, 10) : Math.floor(val);
        return isNaN(parsed) ? null : parsed;
      })
      .refine((val) => val === null || (val >= 1 && val <= 14), {
        message: 'Semester harus bernilai antara 1 dan 14',
      }),
    portfolioUrl: z
      .string()
      .optional()
      .nullable()
      .transform((val) => {
        if (!val || val.trim() === '') return '';
        const trimmed = val.trim();
        if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith('/')) {
          return `https://${trimmed}`;
        }
        return trimmed;
      }),
    pengalaman: z
      .string()
      .optional()
      .nullable()
      .transform((val) => (val && val.trim() !== '' ? val : null)),
  }),
});

export const applyOprecSchema = z.object({
  body: z.object({
    batchName: z.string().optional(),
  }),
});

export type UpsertProfileInput = z.infer<typeof upsertProfileSchema>['body'];
export type ApplyOprecInput = z.infer<typeof applyOprecSchema>['body'];

