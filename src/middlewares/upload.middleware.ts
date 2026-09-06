import multer from 'multer';
import { Request } from 'express';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 Megabytes

const storage = multer.memoryStorage();

const allowedMimetypes = ['application/pdf', 'application/x-pdf', 'application/octet-stream'];

const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: multer.FileFilterCallback
) => {
  const hasPdfMime = allowedMimetypes.includes(file.mimetype);
  const hasPdfExt = file.originalname.toLowerCase().endsWith('.pdf');

  if (hasPdfMime || hasPdfExt) {
    callback(null, true);
  } else {
    callback(new Error('Hanya file PDF (application/pdf) yang diperbolehkan'));
  }
};

export const uploadDocumentMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter,
}).single('file');
