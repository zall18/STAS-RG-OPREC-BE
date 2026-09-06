import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { UserRole } from '@prisma/client';

export const requireRole = (allowedRoles: UserRole | UserRole[]) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Akses ditolak: Autentikasi diperlukan',
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Akses terlarang: Hanya role [${roles.join(', ')}] yang diizinkan mengakses resource ini`,
      });
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole(UserRole.ADMIN);
