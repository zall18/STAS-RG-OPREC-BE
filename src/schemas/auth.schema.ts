import { z } from 'zod';
import { UserRole } from '@prisma/client';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(6, 'Password minimal 6 karakter'),
    otp: z.string().length(6, 'Kode OTP harus 6 digit').optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    password: z.string().min(1, 'Password wajib diisi'),
  }),
});

export const sendOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    purpose: z.enum(['REGISTRATION', 'PASSWORD_RESET', 'ADMIN_VERIFY']).default('REGISTRATION'),
  }),
});

export const verifyOtpSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    otp: z.string().length(6, 'Kode OTP harus 6 digit'),
    purpose: z.enum(['REGISTRATION', 'PASSWORD_RESET', 'ADMIN_VERIFY']).default('REGISTRATION'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Format email tidak valid'),
    otp: z.string().length(6, 'Kode OTP harus 6 digit'),
    newPassword: z.string().min(6, 'Password baru minimal 6 karakter'),
  }),
});

export const confirmAdminSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token konfirmasi wajib disertakan'),
  }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type SendOtpInput = z.infer<typeof sendOtpSchema>['body'];
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type ConfirmAdminInput = z.infer<typeof confirmAdminSchema>['body'];

