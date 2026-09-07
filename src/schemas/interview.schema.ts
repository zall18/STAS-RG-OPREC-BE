import { z } from 'zod';
import { InterviewType, InterviewStatus } from '@prisma/client';

export const createInterviewSchema = z.object({
  body: z.object({
    candidateId: z.string().uuid('ID Kandidat tidak valid'),
    registrationId: z.string().uuid('ID Registrasi tidak valid').optional().nullable(),
    datetime: z.string().datetime('Format tanggal dan waktu tidak valid (harus ISO 8601)'),
    location: z.string().optional().nullable(),
    type: z.nativeEnum(InterviewType).optional().default(InterviewType.ONLINE),
    link: z.string().url('Tautan (link) wawancara tidak valid').optional().nullable(),
    notes: z.string().optional().nullable(),
  }),
});

export const updateInterviewSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID Wawancara tidak valid'),
  }),
  body: z.object({
    datetime: z.string().datetime('Format tanggal dan waktu tidak valid').optional(),
    location: z.string().optional().nullable(),
    type: z.nativeEnum(InterviewType).optional(),
    link: z.string().url('Tautan (link) wawancara tidak valid').optional().nullable(),
    status: z.nativeEnum(InterviewStatus).optional(),
    notes: z.string().optional().nullable(),
  }),
});

export const interviewIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID Wawancara tidak valid'),
  }),
});

export const getInterviewsQuerySchema = z.object({
  query: z.object({
    batch: z.string().optional(),
    status: z.nativeEnum(InterviewStatus).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
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

export type CreateInterviewInput = z.infer<typeof createInterviewSchema>['body'];
export type UpdateInterviewInput = z.infer<typeof updateInterviewSchema>['body'];
