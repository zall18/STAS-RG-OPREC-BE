import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  /**
   * Get Admin Dashboard overview metrics and distributions
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const batch = req.query.batch as string | undefined;
      const stats = await DashboardService.getStats({ batch });

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
