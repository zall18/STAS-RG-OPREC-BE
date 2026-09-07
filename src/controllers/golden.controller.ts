import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { GoldenService } from '../services/golden.service';

export class GoldenController {
  static async submitApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const application = await GoldenService.submitApplication(userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Golden Candidate Application berhasil diajukan',
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const application = await GoldenService.getApplication(userId);
      res.status(200).json({
        success: true,
        data: application,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateApplication(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const updated = await GoldenService.updateApplication(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Golden Candidate Application berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }
}
