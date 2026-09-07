import { prisma } from '../config/prisma';

export interface LogActivityParams {
  userId?: string;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: any;
}

export interface GetActivityLogsFilter {
  userId?: string;
  action?: string;
  targetId?: string;
  page?: number;
  limit?: number;
}

export class ActivityLogService {
  /**
   * Record a new activity log entry
   */
  static async record(params: LogActivityParams) {
    try {
      return await prisma.activityLog.create({
        data: {
          userId: params.userId,
          action: params.action,
          targetType: params.targetType,
          targetId: params.targetId,
          details: params.details ? (typeof params.details === 'string' ? params.details : JSON.stringify(params.details)) : null,
        },
      });
    } catch (err) {
      // Do not block parent operation if logging fails
      console.error('Failed to write activity log:', err);
      return null;
    }
  }

  /**
   * Get paginated activity logs
   */
  static async getActivityLogs(filter: GetActivityLogsFilter) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filter.userId) where.userId = filter.userId;
    if (filter.action) where.action = { contains: filter.action, mode: 'insensitive' };
    if (filter.targetId) where.targetId = filter.targetId;

    const [total, logs] = await Promise.all([
      prisma.activityLog.count({ where }),
      prisma.activityLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}
