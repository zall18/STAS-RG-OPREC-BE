import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';

export class DashboardController {
  /**
   * Get Admin Dashboard overview metrics and distributions
   */
  static async getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batch, startDate, endDate, period } = req.query as any;
      const stats = await DashboardService.getStats({ batch, startDate, endDate, period });

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
