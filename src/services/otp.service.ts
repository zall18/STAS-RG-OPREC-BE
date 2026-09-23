import crypto from 'crypto';
import { EmailService, OtpPurpose } from './email.service';
import { AppError } from '../middlewares/error.middleware';

interface OtpRecord {
  codeHash: string;
  purpose: OtpPurpose;
  expiresAt: Date;
  lastSentAt: Date;
  attempts: number;
  isUsed: boolean;
}

export class OtpService {
  // In-memory persistent OTP store keyed by `${email}_${purpose}`
  private static otpStore = new Map<string, OtpRecord>();

  // Durasi masa aktif kode OTP (5 menit)
  private static readonly OTP_TTL_MS = 5 * 60 * 1000;

  // Batas waktu jeda kirim ulang (60 detik)
  private static readonly COOLDOWN_MS = 60 * 1000;

  // Batas maksimum kesalahan input OTP
  private static readonly MAX_ATTEMPTS = 5;

  private static getStoreKey(email: string, purpose: OtpPurpose): string {
    return `${email.trim().toLowerCase()}::${purpose}`;
  }

  private static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp.trim()).digest('hex');
  }

  /**
   * Menghasilkan kode OTP 6-digit dan mengirimkannya ke email tujuan
   */
  static async requestOtp(email: string, purpose: OtpPurpose = 'REGISTRATION'): Promise<{ success: boolean; cooldownSeconds: number }> {
    const normalizedEmail = email.trim().toLowerCase();
    const key = this.getStoreKey(normalizedEmail, purpose);
    const existing = this.otpStore.get(key);

    const now = Date.now();

    // 1. Validasi Cooldown (mencegah spam)
    if (existing && !existing.isUsed && now - existing.lastSentAt.getTime() < this.COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((this.COOLDOWN_MS - (now - existing.lastSentAt.getTime())) / 1000);
      throw new AppError(`Harap tunggu ${remainingSeconds} detik sebelum meminta kode OTP kembali`, 429);
    }

    // 2. Generate cryptographically secure 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 1000000).toString();
    const codeHash = this.hashOtp(rawOtp);

    // 3. Simpan ke store
    this.otpStore.set(key, {
      codeHash,
      purpose,
      expiresAt: new Date(now + this.OTP_TTL_MS),
      lastSentAt: new Date(now),
      attempts: 0,
      isUsed: false,
    });

    // 4. Kirim email via Gmail SMTP
    await EmailService.sendOtpEmail(normalizedEmail, rawOtp, purpose);

    return {
      success: true,
      cooldownSeconds: Math.ceil(this.COOLDOWN_MS / 1000),
    };
  }

  /**
   * Memvalidasi kode OTP yang dimasukkan oleh pengguna
   */
  static verifyOtp(
    email: string,
    otp: string,
    purpose: OtpPurpose = 'REGISTRATION',
    markAsUsed: boolean = true
  ): boolean {
    const normalizedEmail = email.trim().toLowerCase();
    const key = this.getStoreKey(normalizedEmail, purpose);
    const record = this.otpStore.get(key);

    if (!record || record.isUsed) {
      throw new AppError('Kode OTP tidak ditemukan atau sudah tidak berlaku. Silakan minta kode baru.', 400);
    }

    // Cek batas kedaluwarsa
    if (new Date() > record.expiresAt) {
      this.otpStore.delete(key);
      throw new AppError('Kode OTP telah kedaluwarsa (melebihi 5 menit). Silakan minta kode baru.', 400);
    }

    // Cek batas percobaan salah
    if (record.attempts >= this.MAX_ATTEMPTS) {
      this.otpStore.delete(key);
      throw new AppError('Batas maksimum percobaan OTP telah terlampaui. Silakan minta kode baru.', 400);
    }

    // Verifikasi hash kode
    const inputHash = this.hashOtp(otp);
    if (inputHash !== record.codeHash) {
      record.attempts += 1;
      const remainingAttempts = this.MAX_ATTEMPTS - record.attempts;
      if (remainingAttempts <= 0) {
        this.otpStore.delete(key);
        throw new AppError('Kode OTP salah. Batas percobaan habis, silakan minta kode baru.', 400);
      }
      throw new AppError(`Kode OTP salah. Sisa kesempatan: ${remainingAttempts} kali`, 400);
    }

    // Jika valid, tandai telah digunakan
    if (markAsUsed) {
      record.isUsed = true;
    }

    return true;
  }

  /**
   * Pembersihan berkala data OTP yang sudah usang dari memory
   */
  static cleanupExpired(): void {
    const now = Date.now();
    for (const [key, record] of this.otpStore.entries()) {
      if (record.isUsed || now > record.expiresAt.getTime() + this.OTP_TTL_MS) {
        this.otpStore.delete(key);
      }
    }
  }

  /**
   * Helper untuk test suite (membersihkan memory store)
   */
  static _clearStore(): void {
    this.otpStore.clear();
  }
}

// Jalankan auto-cleanup setiap 10 menit
setInterval(() => {
  OtpService.cleanupExpired();
}, 10 * 60 * 1000).unref();
