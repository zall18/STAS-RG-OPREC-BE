import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticatedRequest, JwtPayload } from '../types';
import { env } from '../config/env';
import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak ditemukan atau format tidak sesuai (Bearer token)',
      });
      return;
    }

    const token = authHeader.split(' ')[1];

    let decoded: JwtPayload | null = null;
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch {
      res.status(401).json({
        success: false,
        message: 'Token autentikasi tidak valid atau telah kedaluwarsa',
      });
      return;
    }

    if (!decoded || !decoded.userId) {
      res.status(401).json({
        success: false,
        message: 'Payload token autentikasi tidak valid',
      });
      return;
    }

    // Verify user exists in database
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true },
    });

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Pengguna yang terasosiasi dengan token ini tidak ditemukan',
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};
