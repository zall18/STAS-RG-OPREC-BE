import { z } from 'zod';

export const getDashboardStatsQuerySchema = z.object({
  query: z.object({
    batch: z.string().optional(),
  }),
});
