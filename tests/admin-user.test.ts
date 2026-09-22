import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { UserRole } from '@prisma/client';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
  },
}));

describe('Admin User Management Endpoints (/api/admin/admins)', () => {
  const superAdmin = {
    id: 'a0000000-0000-4000-8000-000000000001',
    email: 'superadmin@stas-rg.ac.id',
    role: UserRole.ADMIN,
  };

  const secondaryAdmin = {
    id: 'a0000000-0000-4000-8000-000000000002',
    email: 'admin2@stas-rg.ac.id',
    role: UserRole.ADMIN,
  };

  const candidateUser = {
    id: 'c0000000-0000-4000-8000-000000000001',
    email: 'candidate@stas-rg.ac.id',
    role: UserRole.CANDIDATE,
  };

  let superAdminToken: string;
  let candidateToken: string;

  beforeAll(() => {
    superAdminToken = AuthService.generateToken({
      userId: superAdmin.id,
      email: superAdmin.email,
      role: superAdmin.role,
    });

    candidateToken = AuthService.generateToken({
      userId: candidateUser.id,
      email: candidateUser.email,
      role: candidateUser.role,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RBAC Protection', () => {
    it('should reject candidate access with 403 Forbidden', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(candidateUser);

      const res = await request(app)
        .get('/api/admin/admins')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Hanya role [ADMIN]');
    });
  });

  describe('GET /api/admin/admins', () => {
    it('should return list of all admin users', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(superAdmin);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        {
          id: superAdmin.id,
          email: superAdmin.email,
          role: UserRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: secondaryAdmin.id,
          email: secondaryAdmin.email,
          role: UserRole.ADMIN,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/admin/admins')
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
      expect(res.body.data[0].email).toBe(superAdmin.email);
      expect(res.body.data[0].password).toBeUndefined(); // Never leak password
    });
  });

  describe('POST /api/admin/admins', () => {
    it('should successfully create a new admin user', async () => {
      (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === superAdmin.id) return Promise.resolve(superAdmin);
        if (where.email === 'newadmin@stas-rg.ac.id') return Promise.resolve(null);
        return Promise.resolve(null);
      });

      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'a0000000-0000-4000-8000-000000000003',
        email: 'newadmin@stas-rg.ac.id',
        role: UserRole.ADMIN,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/admin/admins')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'newadmin@stas-rg.ac.id',
          password: 'SecureAdminPassword123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('newadmin@stas-rg.ac.id');
      expect(res.body.data.role).toBe(UserRole.ADMIN);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'newadmin@stas-rg.ac.id',
            role: UserRole.ADMIN,
          }),
        })
      );
    });

    it('should reject creation if email already exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === superAdmin.id) return Promise.resolve(superAdmin);
        if (where.email === 'existing@stas-rg.ac.id') return Promise.resolve({ id: 'existing-id' });
        return Promise.resolve(null);
      });

      const res = await request(app)
        .post('/api/admin/admins')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'existing@stas-rg.ac.id',
          password: 'SecureAdminPassword123!',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('sudah terdaftar');
    });

    it('should reject creation if password is shorter than 8 chars', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(superAdmin);

      const res = await request(app)
        .post('/api/admin/admins')
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          email: 'adminshort@stas-rg.ac.id',
          password: 'short',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/admin/admins/:id', () => {
    it('should block admin from deleting their own account (anti self-deletion)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(superAdmin);

      const res = await request(app)
        .delete(`/api/admin/admins/${superAdmin.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Anda tidak dapat menghapus akun admin Anda sendiri');
    });

    it('should block deletion if target is the last admin in the system', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(superAdmin);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(secondaryAdmin);
      (prisma.user.count as jest.Mock).mockResolvedValue(1); // Only 1 admin left

      const res = await request(app)
        .delete(`/api/admin/admins/${secondaryAdmin.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('minimal harus tersisa satu admin aktif');
    });

    it('should successfully delete an admin when more than 1 admin exists', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(superAdmin);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(secondaryAdmin);
      (prisma.user.count as jest.Mock).mockResolvedValue(2);
      (prisma.user.delete as jest.Mock).mockResolvedValue(secondaryAdmin);

      const res = await request(app)
        .delete(`/api/admin/admins/${secondaryAdmin.id}`)
        .set('Authorization', `Bearer ${superAdminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('berhasil dihapus');
      expect(prisma.user.delete).toHaveBeenCalledWith({
        where: { id: secondaryAdmin.id },
      });
    });
  });

  describe('PATCH /api/admin/admins/:id/password', () => {
    it('should successfully reset admin password', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(superAdmin);
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(secondaryAdmin);
      (prisma.user.update as jest.Mock).mockResolvedValue(secondaryAdmin);

      const res = await request(app)
        .patch(`/api/admin/admins/${secondaryAdmin.id}/password`)
        .set('Authorization', `Bearer ${superAdminToken}`)
        .send({
          newPassword: 'BrandNewAdminPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('berhasil diperbarui');
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: secondaryAdmin.id },
          data: expect.objectContaining({
            password: expect.any(String),
          }),
        })
      );
    });
  });
});
