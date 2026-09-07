import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { InterviewService } from '../services/interview.service';

export class InterviewController {
  // --- Admin Handlers ---

  static async createInterview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const interview = await InterviewService.createInterview(adminId, req.body);
      res.status(201).json({
        success: true,
        message: 'Jadwal wawancara berhasil dibuat',
        data: interview,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAdminInterviews(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { batch, status, startDate, endDate, page, limit } = req.query as any;
      const result = await InterviewService.getAdminInterviews({
        batch,
        status,
        startDate,
        endDate,
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

  static async updateInterview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const updated = await InterviewService.updateInterview(adminId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Jadwal wawancara berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelInterview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const cancelled = await InterviewService.cancelInterview(adminId, id);
      res.status(200).json({
        success: true,
        message: 'Jadwal wawancara berhasil dibatalkan',
        data: cancelled,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Candidate Handlers ---

  static async getCandidateInterviews(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const interviews = await InterviewService.getCandidateInterviews(userId);
      res.status(200).json({
        success: true,
        data: interviews,
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmInterview(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const confirmed = await InterviewService.confirmInterview(userId, id);
      res.status(200).json({
        success: true,
        message: 'Konfirmasi kehadiran wawancara berhasil disimpan',
        data: confirmed,
      });
    } catch (error) {
      next(error);
    }
  }
}
