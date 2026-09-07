import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { NotificationService } from '../services/notification.service';

export class NotificationController {
  static async getNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { page, limit } = req.query as any;
      const result = await NotificationService.getNotifications(
        userId,
        page ? Number(page) : 1,
        limit ? Number(limit) : 10
      );
      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const { id } = req.params;
      const updated = await NotificationService.markAsRead(userId, id);
      res.status(200).json({
        success: true,
        message: 'Notifikasi ditandai sebagai sudah dibaca',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.id;
      const count = await NotificationService.getUnreadCount(userId);
      res.status(200).json({
        success: true,
        data: count,
      });
    } catch (error) {
      next(error);
    }
  }
}
