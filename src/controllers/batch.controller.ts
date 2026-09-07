import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { BatchService } from '../services/batch.service';

export class BatchController {
  static async createBatch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const batch = await BatchService.createBatch(adminId, req.body);
      res.status(201).json({
        success: true,
        message: 'Batch baru berhasil dibuat',
        data: batch,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBatches(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const batches = await BatchService.getBatches();
      res.status(200).json({
        success: true,
        data: batches,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBatchById(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const result = await BatchService.getBatchById(id);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateBatch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const updated = await BatchService.updateBatch(adminId, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Batch berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteBatch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const result = await BatchService.deleteBatch(adminId, id);
      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async activateBatch(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const activated = await BatchService.activateBatch(adminId, id);
      res.status(200).json({
        success: true,
        message: `Batch "${activated.name}" sekarang aktif`,
        data: activated,
      });
    } catch (error) {
      next(error);
    }
  }
}
