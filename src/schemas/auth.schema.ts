import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
    role: z.nativeEnum(UserRole).optional().default(UserRole.CANDIDATE),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
