import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { UserRole, SelectionStatus } from '@prisma/client';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    candidateProfile: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    oprecRegistration: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      groupBy: jest.fn(),
    },
    recruitmentSetting: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

describe('Admin Endpoints (/api/admin)', () => {
  const mockAdminUser = {
    id: 'user-admin-1',
    email: 'admin@stas-rg.ac.id',
    role: UserRole.ADMIN,
  };

  const mockCandidateUser = {
    id: 'user-cand-1',
    email: 'kandidat@stas-rg.ac.id',
    role: UserRole.CANDIDATE,
  };

  let adminToken: string;
  let candidateToken: string;

  beforeAll(() => {
    adminToken = AuthService.generateToken({
      userId: mockAdminUser.id,
      email: mockAdminUser.email,
      role: mockAdminUser.role,
    });

    candidateToken = AuthService.generateToken({
      userId: mockCandidateUser.id,
      email: mockCandidateUser.email,
      role: mockCandidateUser.role,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('RBAC Protection', () => {
    it('should block CANDIDATE role with 403 Forbidden', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCandidateUser);

      const res = await request(app)
        .get('/api/admin/candidates')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Hanya role [ADMIN] yang diizinkan');
    });

    it('should block unauthenticated requests with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/admin/candidates');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/admin/candidates', () => {
    it('should allow ADMIN to retrieve candidate list with pagination', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.oprecRegistration.count as jest.Mock).mockResolvedValue(1);
      (prisma.oprecRegistration.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'reg-1',
          batchName: 'Oprec Batch 1 - 2026',
          status: SelectionStatus.SELEKSI_BERKAS,
          candidate: {
            id: 'cand-1',
            fullName: 'Budi Santoso',
            isGoldenCandidate: true,
          },
        },
      ]);

      const res = await request(app)
        .get('/api/admin/candidates?isGolden=true&page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.meta.total).toBe(1);
      expect(res.body.meta.page).toBe(1);
    });
  });

  describe('GET /api/admin/candidates/export', () => {
    it('should allow ADMIN to export candidates as CSV', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.oprecRegistration.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'reg-1',
          batchName: 'Oprec Batch 1 - 2026',
          status: SelectionStatus.DITERIMA,
          assignedProject: 'Computer Vision',
          appliedAt: new Date('2026-09-01'),
          candidate: {
            fullName: 'Budi Santoso',
            universitas: 'Universitas Brawijaya',
            nim: '215150200',
            programStudi: 'Teknik Informatika',
            roleInterest: 'RISET',
            ipk: 3.9,
            semester: 6,
            isGoldenCandidate: false,
            cvUrl: 'https://cv.pdf',
            portfolioUrl: 'https://portfolio.com',
            transkripUrl: 'https://transkrip.pdf',
            user: { email: 'budi@mail.com' },
          },
        },
      ]);

      const res = await request(app)
        .get('/api/admin/candidates/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      expect(res.text).toContain('Budi Santoso');
      expect(res.text).toContain('Computer Vision');
    });
  });

  describe('GET & PATCH /api/admin/settings/oprec', () => {
    it('should allow ADMIN to get and update oprec settings', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.recruitmentSetting.findUnique as jest.Mock).mockResolvedValue({
        id: 'setting-1',
        key: 'DEFAULT',
        isActive: true,
        currentBatch: 'Batch 1 - 2026',
      });
      (prisma.recruitmentSetting.upsert as jest.Mock).mockResolvedValue({
        id: 'setting-1',
        key: 'DEFAULT',
        isActive: false,
        currentBatch: 'Batch 2 - 2026',
      });

      // GET
      const getRes = await request(app)
        .get('/api/admin/settings/oprec')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.isActive).toBe(true);

      // PATCH
      const patchRes = await request(app)
        .patch('/api/admin/settings/oprec')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
          currentBatch: 'Batch 2 - 2026',
        });
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.isActive).toBe(false);
    });
  });

  describe('GET /api/admin/dashboard/stats', () => {
    it('should return aggregated dashboard statistics', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.recruitmentSetting.findUnique as jest.Mock).mockResolvedValue({
        id: 'setting-1',
        key: 'DEFAULT',
        isActive: true,
        currentBatch: 'Oprec Batch 1 - 2026',
      });
      (prisma.candidateProfile.count as jest.Mock).mockResolvedValue(10);
      (prisma.oprecRegistration.count as jest.Mock).mockResolvedValue(8);
      (prisma.oprecRegistration.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.oprecRegistration.groupBy as jest.Mock).mockResolvedValue([
        { batchName: 'Oprec Batch 1 - 2026', _count: { id: 8 } },
      ]);

      const res = await request(app)
        .get('/api/admin/dashboard/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.overview).toBeDefined();
      expect(res.body.data.distribution).toBeDefined();
    });
  });

  describe('PATCH /api/admin/candidates/:registrationId/status', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should allow ADMIN to update selection status', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.oprecRegistration.findUnique as jest.Mock).mockResolvedValue({
        id: validUuid,
        status: SelectionStatus.PENDING,
      });
      (prisma.oprecRegistration.update as jest.Mock).mockResolvedValue({
        id: validUuid,
        status: SelectionStatus.WAWANCARA_1,
      });

      const res = await request(app)
        .patch(`/api/admin/candidates/${validUuid}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: SelectionStatus.WAWANCARA_1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(SelectionStatus.WAWANCARA_1);
    });
  });

  describe('PATCH /api/admin/candidates/:registrationId/project', () => {
    const validUuid = '123e4567-e89b-12d3-a456-426614174000';

    it('should reject assigning project if status is NOT DITERIMA', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.oprecRegistration.findUnique as jest.Mock).mockResolvedValue({
        id: validUuid,
        status: SelectionStatus.WAWANCARA_2,
      });

      const res = await request(app)
        .patch(`/api/admin/candidates/${validUuid}/project`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedProject: 'Smart Agriculture' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('hanya dapat dilakukan untuk kandidat dengan status DITERIMA');
    });

    it('should successfully assign project if status IS DITERIMA', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.oprecRegistration.findUnique as jest.Mock).mockResolvedValue({
        id: validUuid,
        status: SelectionStatus.DITERIMA,
      });
      (prisma.oprecRegistration.update as jest.Mock).mockResolvedValue({
        id: validUuid,
        status: SelectionStatus.DITERIMA,
        assignedProject: 'Smart Agriculture',
      });

      const res = await request(app)
        .patch(`/api/admin/candidates/${validUuid}/project`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ assignedProject: 'Smart Agriculture' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.assignedProject).toBe('Smart Agriculture');
    });
  });
});
