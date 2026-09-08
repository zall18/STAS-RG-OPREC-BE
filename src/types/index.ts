import { Request } from 'express';
import { UserRole, RoleInterest, SelectionStatus, GoldenStatus } from '@prisma/client';

export { UserRole, RoleInterest, SelectionStatus, GoldenStatus };

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: any;
}
