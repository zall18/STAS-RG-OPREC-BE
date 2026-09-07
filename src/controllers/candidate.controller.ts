import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { CandidateService } from '../services/candidate.service';

export class CandidateController {
  static async upsertProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const profile = await CandidateService.upsertProfile(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Profil kandidat berhasil disimpan',
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const profile = await CandidateService.getProfile(userId);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  static async applyOprec(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const registration = await CandidateService.applyOprec(userId, req.body);
      res.status(201).json({
        success: true,
        message: 'Pendaftaran Oprec berhasil diajukan',
        data: registration,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRegistrations(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const registrations = await CandidateService.getRegistrations(userId);
      res.status(200).json({
        success: true,
        data: registrations,
      });
    } catch (error) {
      next(error);
    }
  }
}

