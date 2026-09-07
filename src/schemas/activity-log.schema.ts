import { z } from 'zod';

export const getActivityLogsQuerySchema = z.object({
  query: z.object({
    userId: z.string().uuid('ID Pengguna tidak valid').optional(),
    action: z.string().optional(),
    targetId: z.string().optional(),
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
