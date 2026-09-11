import { Request, Response, NextFunction } from 'express';
import { SettingService } from '../services/setting.service';
import { RoleInterest } from '@prisma/client';

export class PublicController {
  /**
   * Get public Oprec status, active batch, and recruitment info
   */
  static async getOprecStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const setting = await SettingService.getSetting();

      res.status(200).json({
        success: true,
        data: {
          isOprecActive: setting.isActive,
          currentBatch: setting.currentBatch,
          startDate: setting.startDate,
          endDate: setting.endDate,
          description: setting.description,
          availableRoles: Object.values(RoleInterest),
          allowGoldenCandidate: setting.isGoldenCandidateActive,
          isGoldenCandidateActive: setting.isGoldenCandidateActive,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
