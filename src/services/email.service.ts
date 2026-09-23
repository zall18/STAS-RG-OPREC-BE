import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';

export type OtpPurpose = 'REGISTRATION' | 'PASSWORD_RESET' | 'ADMIN_VERIFY' | 'GENERIC';

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * Mendapatkan atau menginisialisasi Nodemailer Transporter
   */
  private static getTransporter(): Transporter | null {
    if (this.transporter) {
      return this.transporter;
    }

    if (!env.SMTP_USER || !env.SMTP_PASS) {
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true for port 465, false for 587
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS.replace(/\s+/g, ''), // hapus spasi jika ada
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    return this.transporter;
  }

  /**
   * Mengirim email kode verifikasi OTP
   */
  static async sendOtpEmail(to: string, otp: string, purpose: OtpPurpose = 'REGISTRATION'): Promise<boolean> {
    const purposeTitles: Record<OtpPurpose, { title: string; subtitle: string }> = {
      REGISTRATION: {
        title: 'Verifikasi Pendaftaran Akun',
        subtitle: 'Terima kasih telah mendaftar di sistem rekrutmen STAS-RG. Gunakan kode OTP berikut untuk menyelesaikan pendaftaran Anda:',
      },
      PASSWORD_RESET: {
        title: 'Reset Kata Sandi Akun',
        subtitle: 'Kami menerima permintaan untuk mereset kata sandi akun STAS-RG Anda. Gunakan kode verifikasi di bawah ini untuk melanjutkan:',
      },
      ADMIN_VERIFY: {
        title: 'Verifikasi Akun Administrator',
        subtitle: 'Gunakan kode verifikasi berikut untuk mengonfirmasi akses administrator STAS-RG Anda:',
      },
      GENERIC: {
        title: 'Kode Verifikasi Keamanan',
        subtitle: 'Berikut adalah kode verifikasi akun STAS-RG Anda:',
      },
    };

    const details = purposeTitles[purpose] || purposeTitles.GENERIC;

    // Log dev mode jika SMTP belum diset atau di environment test
    if (!env.SMTP_USER || !env.SMTP_PASS || env.NODE_ENV === 'test') {
      console.log('\n=========================================');
      console.log(`🔑 [DEV/MOCK OTP] Email: ${to}`);
      console.log(`📋 Purpose: ${purpose}`);
      console.log(`🔢 OTP Code: ${otp}`);
      console.log('⏳ Berlaku: 5 Menit');
      console.log('=========================================\n');
      return true;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${details.title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f1f5f9; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04);">
              
              <!-- Header Brand -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 36px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px;">STAS-RG LAB</h1>
                  <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 13px; font-weight: 500; letter-spacing: 0.5px;">RECRUITMENT & SELECTION PORTAL</p>
                </td>
              </tr>

              <!-- Content Body -->
              <tr>
                <td style="padding: 36px 32px 28px;">
                  <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 20px; font-weight: 700; text-align: center;">${details.title}</h2>
                  <p style="margin: 0 0 24px; color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
                    ${details.subtitle}
                  </p>

                  <!-- OTP Box -->
                  <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1.5px; margin-bottom: 8px;">KODE VERIFIKASI (OTP)</div>
                    <div style="font-family: 'Consolas', 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #1e3a8a; letter-spacing: 8px;">
                      ${otp}
                    </div>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #ef4444; font-weight: 600;">
                      ⏱️ Berlaku selama 5 menit
                    </p>
                  </div>

                  <!-- Security Warning -->
                  <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 12px 16px; border-radius: 6px; margin-bottom: 28px;">
                    <p style="margin: 0; color: #991b1b; font-size: 12px; line-height: 1.5;">
                      <strong>Peringatan Keamanan:</strong> Jangan pernah membagikan kode OTP ini kepada siapa pun, termasuk pihak yang mengatasnamakan panitia atau tim STAS-RG.
                    </p>
                  </div>

                  <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5; text-align: center;">
                    Jika Anda tidak merasa melakukan permintaan ini, abaikan email ini atau hubungi tim administrator kami.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 30px; text-align: center;">
                  <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600;">
                    Smart Telecommunication and Sensor Research Group (STAS-RG)
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                    Email ini dibuat secara otomatis oleh sistem. Harap tidak membalas email ini secara langsung.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    try {
      const transporter = this.getTransporter();
      if (!transporter) {
        return false;
      }

      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: `[STAS-RG] ${details.title} - ${otp}`,
        html: htmlContent,
      });

      console.log(`✅ [EmailService] OTP berhasil dikirimkan ke ${to} (Purpose: ${purpose})`);
      return true;
    } catch (error: any) {
      console.error(`❌ [EmailService Error] Gagal mengirim email ke ${to}:`, error.message);
      // Tetap print ke console agar user lokal tidak terputus flow
      console.log(`⚠️ [FALLBACK DEV OTP] ${to} -> Code: ${otp}`);
      return false;
    }
  }

  /**
   * Mengirim email konfirmasi dan aktivasi akun Administrator baru (dengan Tombol CTA)
   */
  static async sendAdminConfirmationEmail(
    to: string,
    confirmationToken: string,
    tempPassword?: string,
    creatorEmail?: string
  ): Promise<boolean> {
    // Tautan konfirmasi aktivasi akun
    const confirmationUrl = `${env.FRONTEND_URL}/auth/confirm-admin?token=${encodeURIComponent(confirmationToken)}`;

    if (!env.SMTP_USER || !env.SMTP_PASS || env.NODE_ENV === 'test') {
      console.log(`\n👑 [DEV/MOCK] Admin Confirmation Email to: ${to}`);
      console.log(`🔗 Activation URL: ${confirmationUrl}\n`);
      return true;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Konfirmasi & Aktivasi Akun Administrator STAS-RG</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f1f5f9; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 18px; overflow: hidden; box-shadow: 0 12px 30px -8px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);">
              
              <!-- Header Brand -->
              <tr>
                <td align="center" style="background: linear-gradient(135deg, #091e3a 0%, #1e3a8a 50%, #2563eb 100%); padding: 38px 32px 34px; text-align: center;">
                  <div style="display: inline-block; background-color: rgba(255, 255, 255, 0.15); border: 1px solid rgba(255, 255, 255, 0.25); border-radius: 20px; padding: 5px 16px; margin-bottom: 12px;">
                    <span style="color: #fef08a; font-size: 11px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;">👑 UNDANGAN RESMI ADMINISTRATOR</span>
                  </div>
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">STAS-RG RESEARCH GROUP</h1>
                  <p style="margin: 6px 0 0; color: #bfdbfe; font-size: 13px; font-weight: 500;">PORTAL REKRUTMEN & SELEKSI TERPADU</p>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 36px 32px 28px;">
                  <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 20px; font-weight: 700;">Aktivasi Akun Administrator</h2>
                  <p style="margin: 0 0 24px; color: #475569; font-size: 14px; line-height: 1.6;">
                    Halo Rekan Administrator,<br>
                    Akun Anda telah didaftarkan sebagai <strong>Administrator</strong> pada portal seleksi STAS-RG. Demi keamanan data sistem, akun Anda <strong>wajib dikonfirmasi terlebih dahulu</strong> sebelum dapat digunakan untuk masuk ke dashboard.
                  </p>

                  <!-- Credentials Card -->
                  <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 26px;">
                    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; letter-spacing: 1px; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                      📋 DETAIL KREDENSIAL AKSES
                    </div>
                    <table border="0" cellpadding="4" cellspacing="0" width="100%" style="font-size: 13px; color: #334155;">
                      <tr>
                        <td width="35%" style="color: #64748b; font-weight: 600;">Email Login</td>
                        <td width="5%">:</td>
                        <td style="font-weight: 700; color: #1e293b;">${to}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Peran Akses</td>
                        <td>:</td>
                        <td><span style="background-color: #dbeafe; color: #1e40af; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">ADMINISTRATOR</span></td>
                      </tr>
                      ${tempPassword ? `
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Password Awal</td>
                        <td>:</td>
                        <td><code style="background-color: #e2e8f0; color: #0f172a; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 13px; font-weight: 700;">${tempPassword}</code></td>
                      </tr>
                      ` : ''}
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Diundang Oleh</td>
                        <td>:</td>
                        <td style="color: #475569;">${creatorEmail || 'Administrator Utama'}</td>
                      </tr>
                      <tr>
                        <td style="color: #64748b; font-weight: 600;">Status Akun</td>
                        <td>:</td>
                        <td><span style="background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">⏳ MENUNGGU KONFIRMASI</span></td>
                      </tr>
                    </table>
                  </div>

                  <!-- Call To Action Button -->
                  <div style="text-align: center; margin: 32px 0 24px;">
                    <a href="${confirmationUrl}" target="_blank" style="background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 10px; font-weight: 800; font-size: 15px; display: inline-block; letter-spacing: 0.5px; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35);">
                      🚀 KONFIRMASI & AKTIFKAN AKUN ADMIN
                    </a>
                    <p style="margin: 10px 0 0; font-size: 12px; color: #64748b;">
                      Tautan konfirmasi berlaku selama <strong>24 jam</strong>.
                    </p>
                  </div>

                  <!-- Notice Alert -->
                  <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px;">
                    <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.5;">
                      <strong>Perhatian:</strong> Anda tidak dapat masuk ke sistem sebelum mengklik tombol konfirmasi di atas. Setelah mengonfirmasi, segera lakukan pergantian kata sandi berkala di menu profil Anda.
                    </p>
                  </div>

                  <!-- Fallback URL Link -->
                  <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5; word-break: break-all;">
                    Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di peramban Anda:<br>
                    <a href="${confirmationUrl}" style="color: #2563eb; text-decoration: underline;">${confirmationUrl}</a>
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 32px; text-align: center;">
                  <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600;">
                    Smart Telecommunication and Sensor Research Group (STAS-RG)
                  </p>
                  <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                    Email undangan resmi sistem • Jangan membalas email ini secara langsung
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    try {
      const transporter = this.getTransporter();
      if (!transporter) return false;

      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: '[STAS-RG] Undangan & Konfirmasi Akun Administrator',
        html: htmlContent,
      });

      console.log(`✅ [EmailService] Email konfirmasi admin terkirim ke ${to}`);
      return true;
    } catch (error: any) {
      console.error(`❌ [EmailService Error] Gagal mengirim email konfirmasi admin ke ${to}:`, error.message);
      return false;
    }
  }

  /**
   * Alias untuk backward compatibility
   */
  static async sendAdminWelcomeEmail(
    to: string,
    tempPassword?: string,
    creatorEmail?: string,
    confirmationToken?: string
  ): Promise<boolean> {
    return this.sendAdminConfirmationEmail(to, confirmationToken || 'token-placeholder', tempPassword, creatorEmail);
  }

  /**
   * Mengirim email konfirmasi sukses reset kata sandi
   */
  static async sendPasswordResetSuccessEmail(to: string): Promise<boolean> {
    if (!env.SMTP_USER || !env.SMTP_PASS || env.NODE_ENV === 'test') {
      console.log(`\n🔒 [DEV/MOCK] Password reset confirmation email to: ${to}\n`);
      return true;
    }

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="id">
    <head><meta charset="UTF-8"><title>Kata Sandi Berhasil Diperbarui</title></head>
    <body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed; background-color: #f1f5f9; padding: 40px 10px;">
        <tr>
          <td align="center">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08);">
              <tr>
                <td align="center" style="background: #059669; padding: 28px 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800;">STAS-RG SECURITY NOTICE</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 32px;">
                  <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 18px; text-align: center;">Kata Sandi Berhasil Diperbarui</h2>
                  <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6; text-align: center;">
                    Kata sandi untuk akun STAS-RG Anda (<strong>${to}</strong>) baru saja berhasil diubah.
                  </p>
                  <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px;">
                    <p style="margin: 0; color: #92400e; font-size: 12px; line-height: 1.5;">
                      Jika Anda tidak merasa melakukan perubahan ini, harap segera hubungi tim administrator STAS-RG untuk mengamankan akun Anda.
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 30px; text-align: center;">
                  <p style="margin: 0; color: #94a3b8; font-size: 11px;">STAS-RG Security Alert System</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    try {
      const transporter = this.getTransporter();
      if (!transporter) return false;

      await transporter.sendMail({
        from: env.SMTP_FROM,
        to,
        subject: '[STAS-RG] Pemberitahuan Keamanan: Kata Sandi Berhasil Diperbarui',
        html: htmlContent,
      });

      return true;
    } catch (error: any) {
      console.error(`❌ [EmailService Error] Gagal mengirim email konfirmasi reset password ke ${to}:`, error.message);
      return false;
    }
  }
}
