import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { OtpService } from '../src/services/otp.service';
import { EmailService } from '../src/services/email.service';
import { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

describe('OTP & Password Reset Endpoints (/api/auth)', () => {
  let capturedOtp: string = '';

  beforeEach(() => {
    jest.clearAllMocks();
    OtpService._clearStore();
    capturedOtp = '';

    // Spy on EmailService.sendOtpEmail to capture generated OTP
    jest.spyOn(EmailService, 'sendOtpEmail').mockImplementation(async (to, otp, purpose) => {
      capturedOtp = otp;
      return true;
    });

    jest.spyOn(EmailService, 'sendPasswordResetSuccessEmail').mockResolvedValue(true);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('POST /api/auth/send-otp', () => {
    it('should successfully send OTP for new candidate registration', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({
          email: 'calon@stas-rg.ac.id',
          purpose: 'REGISTRATION',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('berhasil dikirimkan');
      expect(res.body.data.cooldownSeconds).toBe(60);
      expect(capturedOtp).toHaveLength(6);
    });

    it('should reject OTP request if email is already registered', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-999',
        email: 'calon@stas-rg.ac.id',
      });

      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({
          email: 'calon@stas-rg.ac.id',
          purpose: 'REGISTRATION',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email sudah terdaftar');
    });

    it('should enforce 60 seconds cooldown on rapid resend requests', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // First request
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'cooldown@stas-rg.ac.id' });

      // Immediate second request
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'cooldown@stas-rg.ac.id' });

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Harap tunggu');
    });

    it('should reject invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'invalid-email-format' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/verify-otp', () => {
    it('should successfully verify valid OTP', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Request OTP
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'verify@stas-rg.ac.id' });

      expect(capturedOtp).toHaveLength(6);

      // Verify OTP
      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'verify@stas-rg.ac.id',
          otp: capturedOtp,
          purpose: 'REGISTRATION',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Kode OTP valid');
    });

    it('should reject incorrect OTP with remaining attempts notification', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'verify@stas-rg.ac.id' });

      const res = await request(app)
        .post('/api/auth/verify-otp')
        .send({
          email: 'verify@stas-rg.ac.id',
          otp: '999999', // Wrong OTP
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Kode OTP salah');
    });
  });

  describe('POST /api/auth/register with OTP', () => {
    it('should successfully register candidate when valid OTP is supplied', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-candidate-1',
        email: 'pendaftar@stas-rg.ac.id',
        role: UserRole.CANDIDATE,
        createdAt: new Date(),
      });

      // Request OTP
      await request(app)
        .post('/api/auth/send-otp')
        .send({ email: 'pendaftar@stas-rg.ac.id' });

      // Register with captured OTP
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'pendaftar@stas-rg.ac.id',
          password: 'PasswordStas123!',
          otp: capturedOtp,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('pendaftar@stas-rg.ac.id');
      expect(res.body.data.token).toBeDefined();

      // Ensure OTP cannot be reused
      const replayRes = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'pendaftar@stas-rg.ac.id',
          password: 'PasswordStas123!',
          otp: capturedOtp,
        });

      expect(replayRes.status).toBe(400);
      expect(replayRes.body.message).toContain('tidak berlaku');
    });
  });

  describe('Forgot & Reset Password Flow', () => {
    it('should generate OTP and allow password reset for registered user', async () => {
      const existingUser = {
        id: 'user-reset-1',
        email: 'user@stas-rg.ac.id',
        password: 'oldPasswordHash',
        role: UserRole.CANDIDATE,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...existingUser,
        password: 'newHashedPassword',
      });

      // 1. Request forgot password OTP
      const forgotRes = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user@stas-rg.ac.id' });

      expect(forgotRes.status).toBe(200);
      expect(forgotRes.body.success).toBe(true);
      expect(capturedOtp).toHaveLength(6);

      // 2. Reset password with OTP
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'user@stas-rg.ac.id',
          otp: capturedOtp,
          newPassword: 'MyNewSecretPassword2026!',
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);
      expect(resetRes.body.message).toContain('Kata sandi berhasil diperbarui');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-reset-1' },
        })
      );
      expect(EmailService.sendPasswordResetSuccessEmail).toHaveBeenCalledWith('user@stas-rg.ac.id');
    });

    it('should reject reset password if OTP is incorrect', async () => {
      const existingUser = {
        id: 'user-reset-2',
        email: 'user2@stas-rg.ac.id',
        role: UserRole.ADMIN,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);

      // Request OTP
      await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'user2@stas-rg.ac.id' });

      // Try reset with wrong OTP
      const resetRes = await request(app)
        .post('/api/auth/reset-password')
        .send({
          email: 'user2@stas-rg.ac.id',
          otp: '000000',
          newPassword: 'NewPassword123!',
        });

      expect(resetRes.status).toBe(400);
      expect(resetRes.body.success).toBe(false);
      expect(resetRes.body.message).toContain('Kode OTP salah');
    });
  });

  describe('Admin Account Confirmation & Activation Flow', () => {
    it('should block login if admin account is inactive (pending confirmation)', async () => {
      const hashedPassword = await bcrypt.hash('AdminSecret123!', 10);
      const inactiveAdmin = {
        id: 'admin-unconfirmed-1',
        email: 'unconfirmed@stas-rg.ac.id',
        password: hashedPassword,
        role: UserRole.ADMIN,
        isActive: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(inactiveAdmin);

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unconfirmed@stas-rg.ac.id',
          password: 'AdminSecret123!',
        });

      expect(loginRes.status).toBe(403);
      expect(loginRes.body.success).toBe(false);
      expect(loginRes.body.message).toContain('belum dikonfirmasi atau sedang dinonaktifkan');
    });

    it('should successfully activate admin account when valid confirmation token is provided', async () => {
      const jwt = require('jsonwebtoken');
      const { env } = require('../src/config/env');

      const inactiveAdmin = {
        id: 'admin-unconfirmed-2',
        email: 'activate.me@stas-rg.ac.id',
        role: UserRole.ADMIN,
        isActive: false,
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(inactiveAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...inactiveAdmin,
        isActive: true,
      });

      const token = jwt.sign(
        { userId: inactiveAdmin.id, email: inactiveAdmin.email, purpose: 'ADMIN_ACTIVATION' },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      const confirmRes = await request(app)
        .post('/api/auth/confirm-admin')
        .send({ token });

      expect(confirmRes.status).toBe(200);
      expect(confirmRes.body.success).toBe(true);
      expect(confirmRes.body.message).toContain('berhasil diaktifkan');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: inactiveAdmin.id },
          data: expect.objectContaining({ isActive: true }),
        })
      );
    });

    it('should reject confirmation with invalid token', async () => {
      const confirmRes = await request(app)
        .post('/api/auth/confirm-admin')
        .send({ token: 'completely-invalid-jwt-token' });

      expect(confirmRes.status).toBe(400);
      expect(confirmRes.body.success).toBe(false);
      expect(confirmRes.body.message).toContain('Token konfirmasi tidak valid');
    });
  });
});

