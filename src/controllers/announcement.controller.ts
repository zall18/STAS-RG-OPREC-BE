import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AnnouncementService } from '../services/announcement.service';

export class AnnouncementController {
  static async createAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const authorId = req.user!.id;
      const announcement = await AnnouncementService.createAnnouncement(authorId, req.body);
      res.status(201).json({
        success: true,
        message: 'Pengumuman berhasil dibuat',
        data: announcement,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const updated = await AnnouncementService.updateAnnouncement(adminId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Pengumuman berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteAnnouncement(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const result = await AnnouncementService.deleteAnnouncement(adminId, id);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPublicAnnouncements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const announcements = await AnnouncementService.getActiveAnnouncements();
      res.status(200).json({
        success: true,
        data: announcements,
      });
    } catch (error) {
      next(error);
    }
  }
}
