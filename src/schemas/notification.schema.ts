import { z } from 'zod';

export const notificationIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID Notifikasi tidak valid'),
  }),
});

export const getNotificationsQuerySchema = z.object({
  query: z.object({
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
