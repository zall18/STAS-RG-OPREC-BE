import { z } from 'zod';

export const getDashboardStatsQuerySchema = z.object({
  query: z.object({
    batch: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    period: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  }),
});

export type GetDashboardStatsQuery = z.infer<typeof getDashboardStatsQuerySchema>['query'];
