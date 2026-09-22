import { z } from 'zod';

export const createAdminSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(8, 'Password minimal 8 karakter'),
  }),
});

export const updateAdminPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string().min(8, 'Password baru minimal 8 karakter'),
  }),
  params: z.object({
    id: z.string().uuid('Format ID admin tidak valid (harus UUID)'),
  }),
});

export const adminUserIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Format ID admin tidak valid (harus UUID)'),
  }),
});

export type CreateAdminInput = z.infer<typeof createAdminSchema>['body'];
export type UpdateAdminPasswordInput = z.infer<typeof updateAdminPasswordSchema>['body'];
