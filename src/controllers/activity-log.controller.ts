import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { ActivityLogService } from '../services/activity-log.service';

export class ActivityLogController {
  static async getActivityLogs(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId, action, targetId, page, limit } = req.query as any;
      const result = await ActivityLogService.getActivityLogs({
        userId,
        action,
        targetId,
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 10,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }
}
