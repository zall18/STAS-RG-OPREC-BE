import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import multer from 'multer';

export interface AppError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  console.error('⚠️ [Error Handler]:', err);

  // Multer Errors
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      res.status(400).json({
        success: false,
        message: 'Ukuran file melebihi batas maksimal 5MB',
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
    });
    return;
  }

  // Custom validation error from upload file filter
  if (err.message && err.message.includes('Hanya file PDF')) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        message: 'Data dengan nilai unik tersebut sudah terdaftar',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'Data tidak ditemukan',
      });
      return;
    }
  }

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Terjadi kesalahan internal server';

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
};
