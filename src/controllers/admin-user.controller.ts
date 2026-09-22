import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AdminUserService } from '../services/admin-user.service';

export class AdminUserController {
  /**
   * List all admin users
   */
  static async getAdmins(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const admins = await AdminUserService.getAdmins();
      res.status(200).json({
        success: true,
        data: admins,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new admin user
   */
  static async createAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const creatorAdminId = req.user!.id;
      const newAdmin = await AdminUserService.createAdmin(creatorAdminId, req.body);
      res.status(201).json({
        success: true,
        message: 'Akun admin baru berhasil dibuat',
        data: newAdmin,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an admin user
   */
  static async deleteAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentAdminId = req.user!.id;
      const targetAdminId = req.params.id;
      const result = await AdminUserService.deleteAdmin(currentAdminId, targetAdminId);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset / update an admin user password
   */
  static async resetPassword(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const currentAdminId = req.user!.id;
      const targetAdminId = req.params.id;
      const { newPassword } = req.body;
      const result = await AdminUserService.resetPassword(currentAdminId, targetAdminId, newPassword);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
