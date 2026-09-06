import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Auth Endpoints (POST /api/auth)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should successfully register a new candidate user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'candidate@test.com',
        role: UserRole.CANDIDATE,
        createdAt: new Date(),
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'candidate@test.com',
          password: 'password123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe('candidate@test.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject registration if email is already taken', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        email: 'candidate@test.com',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'candidate@test.com',
          password: 'password123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Email sudah terdaftar');
    });

    it('should reject registration with invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'candidate@test.com',
        password: hashedPassword,
        role: UserRole.CANDIDATE,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'candidate@test.com',
          password: 'password123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
    });

    it('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-123',
        email: 'candidate@test.com',
        password: hashedPassword,
        role: UserRole.CANDIDATE,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'candidate@test.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('tidak sesuai');
    });
  });
});
