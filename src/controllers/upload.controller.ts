import { Request, Response, NextFunction } from 'express';
import { StorageService } from '../services/storage.service';

export class UploadController {
  static async uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'File PDF wajib diunggah (field name: "file")',
        });
        return;
      }

      // Verify PDF Magic Bytes (%PDF)
      const magicBytes = req.file.buffer.length >= 4 ? req.file.buffer.subarray(0, 4).toString('utf8') : '';
      if (magicBytes !== '%PDF') {
        res.status(400).json({
          success: false,
          message: 'File yang diunggah bukan dokumen PDF yang valid (magic bytes mismatch)',
        });
        return;
      }

      const folderType = (req.body.type as 'cv' | 'transkrip' | 'others') || 'cv';
      const publicUrl = await StorageService.uploadDocument(
        req.file.buffer,
        req.file.originalname,
        folderType
      );

      res.status(200).json({
        success: true,
        message: 'Dokumen PDF berhasil diunggah',
        data: {
          url: publicUrl,
          fileName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
