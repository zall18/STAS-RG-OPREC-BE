import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { AdminService } from '../services/admin.service';
import { SettingService } from '../services/setting.service';

export class AdminController {
  /**
   * Get candidates with search, filtering, and pagination
   */
  static async getCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, batch, status, roleInterest, isGolden, page, limit } = req.query as any;
      const result = await AdminService.getCandidates({
        search: search as string | undefined,
        batch: batch as string | undefined,
        status: status as any,
        roleInterest: roleInterest as any,
        isGolden: isGolden !== undefined ? Boolean(isGolden) : undefined,
        page: page !== undefined ? Number(page) : 1,
        limit: limit !== undefined ? Number(limit) : 10,
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

  /**
   * Export candidate list to CSV file
   */
  static async exportCandidates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { search, batch, status, roleInterest, isGolden } = req.query as any;
      const csvData = await AdminService.exportCandidatesCsv({
        search: search as string | undefined,
        batch: batch as string | undefined,
        status: status as any,
        roleInterest: roleInterest as any,
        isGolden: isGolden !== undefined ? Boolean(isGolden) : undefined,
      });

      const filename = `kandidat_stasrg_${new Date().toISOString().slice(0, 10)}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.status(200).send(csvData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single candidate details by candidateId, userId, or registrationId
   */
  static async getCandidateById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const candidate = await AdminService.getCandidateById(id);

      res.status(200).json({
        success: true,
        data: candidate,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update candidate selection status
   */
  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { registrationId } = req.params;
      const { status } = req.body;

      const updated = await AdminService.updateSelectionStatus(registrationId, status);

      res.status(200).json({
        success: true,
        message: `Status seleksi berhasil diubah menjadi ${status}`,
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Assign project name to accepted candidate
   */
  static async assignProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { registrationId } = req.params;
      const { assignedProject } = req.body;

      const updated = await AdminService.assignProject(registrationId, assignedProject);

      res.status(200).json({
        success: true,
        message: 'Alokasi proyek berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get dynamic recruitment settings
   */
  static async getRecruitmentSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const setting = await SettingService.getSetting();

      res.status(200).json({
        success: true,
        data: setting,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update dynamic recruitment settings (open/close oprec, update batch name, dates)
   */
  static async updateRecruitmentSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updated = await SettingService.updateSetting(req.body);

      res.status(200).json({
        success: true,
        message: 'Pengaturan periode rekrutmen berhasil diperbarui',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk update status for multiple candidate registrations
   */
  static async bulkUpdateStatus(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { ids, status } = req.body;
      const result = await AdminService.bulkUpdateStatus(adminId, ids, status);
      res.status(200).json({
        success: true,
        message: `Berhasil memperbarui status ${result.updatedCount} kandidat menjadi ${status}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create internal note for candidate
   */
  static async createCandidateNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id } = req.params;
      const { content, registrationId } = req.body;
      const note = await AdminService.createCandidateNote(adminId, id, content, registrationId);
      res.status(201).json({
        success: true,
        message: 'Catatan internal berhasil ditambahkan',
        data: note,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all internal notes for a candidate
   */
  static async getCandidateNotes(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const notes = await AdminService.getCandidateNotes(id);
      res.status(200).json({
        success: true,
        data: notes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an internal note
   */
  static async deleteCandidateNote(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { id, noteId } = req.params;
      const result = await AdminService.deleteCandidateNote(adminId, id, noteId);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}
