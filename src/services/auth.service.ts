import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { UserRole } from '@prisma/client';
import {
  RegisterInput,
  LoginInput,
  SendOtpInput,
  VerifyOtpInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '../schemas/auth.schema';
import { JwtPayload } from '../types';
import { OtpService } from './otp.service';
import { EmailService } from './email.service';
import { AppError } from '../middlewares/error.middleware';

export class AuthService {
  /**
   * Mengirim kode OTP ke email
   */
  static async sendOtp(input: SendOtpInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    // Jika untuk registrasi, pastikan email belum terdaftar
    if (input.purpose === 'REGISTRATION') {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        throw new AppError('Email sudah terdaftar. Silakan login atau gunakan email lain.', 409);
      }
    }

    // Jika untuk reset password, cek apakah user terdaftar
    if (input.purpose === 'PASSWORD_RESET') {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      // Mencegah User Enumeration: Tetap respon sukses jika email tidak ada
      if (!existingUser) {
        return {
          success: true,
          message: 'Jika email terdaftar di sistem, kode OTP telah dikirimkan ke email Anda.',
        };
      }
    }

    const result = await OtpService.requestOtp(normalizedEmail, input.purpose);
    return {
      success: true,
      message: `Kode OTP berhasil dikirimkan ke ${normalizedEmail}`,
      cooldownSeconds: result.cooldownSeconds,
    };
  }

  /**
   * Verifikasi mandiri kode OTP
   */
  static verifyOtp(input: VerifyOtpInput) {
    OtpService.verifyOtp(input.email, input.otp, input.purpose, false);
    return {
      success: true,
      message: 'Kode OTP valid',
    };
  }

  /**
   * Register new user (dengan verifikasi OTP)
   */
  static async register(input: RegisterInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('Email sudah terdaftar', 409);
    }

    // Verifikasi OTP jika dikirimkan atau diwajibkan di luar test environment
    if (input.otp) {
      OtpService.verifyOtp(normalizedEmail, input.otp, 'REGISTRATION', true);
    } else if (process.env.NODE_ENV !== 'test') {
      throw new AppError('Kode OTP verifikasi email wajib disertakan', 400);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        role: UserRole.CANDIDATE,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { user, token };
  }

  /**
   * Login user
   */
  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
    });

    if (!user || !user.password) {
      throw new AppError('Email atau password tidak sesuai', 401);
    }

    const isMatch = await bcrypt.compare(input.password, user.password);
    if (!isMatch) {
      throw new AppError('Email atau password tidak sesuai', 401);
    }

    // Blokir login jika akun belum diaktivasi/dikonfirmasi
    if ((user as any).isActive === false) {
      throw new AppError(
        'Akun Anda belum dikonfirmasi atau sedang dinonaktifkan. Silakan periksa email Anda dan lakukan konfirmasi aktivasi terlebih dahulu.',
        403
      );
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      token,
    };
  }

  /**
   * Lupa Password: Minta OTP untuk reset kata sandi
   */
  static async forgotPassword(input: ForgotPasswordInput) {
    const normalizedEmail = input.email.trim().toLowerCase();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Mencegah email enumeration: Jika tidak ditemukan, tetap beri pesan aman
    if (!user) {
      return {
        success: true,
        message: 'Jika email Anda terdaftar di sistem, kode OTP reset password telah dikirim ke email Anda.',
      };
    }

    await OtpService.requestOtp(normalizedEmail, 'PASSWORD_RESET');

    return {
      success: true,
      message: 'Kode OTP reset kata sandi telah dikirim ke email Anda. Kode berlaku selama 5 menit.',
    };
  }

  /**
   * Reset Password Baru dengan validasi OTP
   */
  static async resetPassword(input: ResetPasswordInput) {
    const normalizedEmail = input.email.trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      throw new AppError('Pengguna dengan email tersebut tidak ditemukan', 404);
    }

    // Verifikasi OTP dan tandai telah terpakai
    OtpService.verifyOtp(normalizedEmail, input.otp, 'PASSWORD_RESET', true);

    // Hash kata sandi baru
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.newPassword, salt);

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // Kirim email konfirmasi perubahan kata sandi
    await EmailService.sendPasswordResetSuccessEmail(user.email);

    return {
      success: true,
      message: 'Kata sandi berhasil diperbarui. Silakan login kembali dengan kata sandi baru Anda.',
    };
  }

  /**
   * Konfirmasi & Aktivasi akun Administrator melalui token email
   */
  static async confirmAdmin(token: string) {
    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as any;

      if (!payload || payload.purpose !== 'ADMIN_ACTIVATION' || !payload.userId) {
        throw new AppError('Token konfirmasi tidak valid atau tidak sesuai peruntukan', 400);
      }

      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new AppError('Pengguna dengan token ini tidak ditemukan', 404);
      }

      if ((user as any).isActive) {
        return {
          success: true,
          message: 'Akun administrator Anda sudah aktif sebelumnya. Silakan login ke dashboard.',
          alreadyActive: true,
          email: user.email,
        };
      }

      await prisma.user.update({
        where: { id: user.id },
        data: {
          ...({ isActive: true } as any),
        },
      });

      return {
        success: true,
        message: 'Akun administrator Anda berhasil diaktifkan! Silakan masuk ke portal admin.',
        email: user.email,
      };
    } catch (err: any) {
      if (err instanceof AppError) throw err;
      if (err.name === 'TokenExpiredError') {
        throw new AppError(
          'Tautan konfirmasi telah kedaluwarsa (melebihi 24 jam). Hubungi administrator utama untuk mengirim ulang.',
          400
        );
      }
      throw new AppError('Token konfirmasi tidak valid atau rusak', 400);
    }
  }

  /**
   * Sign JWT Token
   */
  static generateToken(payload: JwtPayload): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }
}
