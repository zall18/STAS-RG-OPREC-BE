import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { AppError } from '../middlewares/error.middleware';
import { env } from '../config/env';

export class AuthController {
  /**
   * Pendaftaran akun kandidat baru
   */
  static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Registrasi berhasil',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login pengguna (Kandidat & Admin)
   */
  static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json({
        success: true,
        message: 'Login berhasil',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mengirim kode OTP ke email pengguna
   */
  static async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.sendOtp(req.body);
      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          cooldownSeconds: result.cooldownSeconds,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verifikasi mandiri kode OTP sebelum submit form
   */
  static async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = AuthService.verifyOtp(req.body);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Minta kode OTP untuk lupa password
   */
  static async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.forgotPassword(req.body);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset kata sandi baru menggunakan OTP
   */
  static async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.resetPassword(req.body);
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Konfirmasi & Aktivasi akun Administrator baru
   */
  static async confirmAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = (req.body?.token || req.query?.token) as string;
      if (!token) {
        throw new AppError('Token konfirmasi wajib disertakan', 400);
      }

      const result = await AuthService.confirmAdmin(token);

      // Jika diakses langsung via browser (navigasi HTML GET), redirect ke login
      if (req.method === 'GET' && req.headers.accept?.includes('text/html')) {
        res.redirect(`${env.FRONTEND_URL}/auth/login?confirmed=true&email=${encodeURIComponent(result.email || '')}`);
        return;
      }

      res.status(200).json({
        success: true,
        message: result.message,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
