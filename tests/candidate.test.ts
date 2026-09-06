import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { UserRole, RoleInterest, SelectionStatus } from '@prisma/client';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    candidateProfile: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    oprecRegistration: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    recruitmentSetting: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
  },
}));

describe('Candidate Endpoints (/api/candidate)', () => {
  const mockUser = {
    id: 'user-cand-123',
    email: 'kandidat@stas-rg.ac.id',
    role: UserRole.CANDIDATE,
  };

  let token: string;

  beforeAll(() => {
    token = AuthService.generateToken({
      userId: mockUser.id,
      email: mockUser.email,
      role: mockUser.role,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (prisma.recruitmentSetting.findUnique as jest.Mock).mockResolvedValue({
      id: 'setting-1',
      key: 'DEFAULT',
      isActive: true,
      currentBatch: 'Oprec Batch 1 - 2026',
    });
  });

  describe('POST /api/candidate/profile', () => {
    const validPayload = {
      fullName: 'Ahmad Fauzi',
      universitas: 'Universitas Indonesia',
      nim: '1234567890',
      programStudi: 'Teknik Komputer',
      roleInterest: RoleInterest.RISET,
      cvUrl: 'https://mock.supabase.co/storage/v1/object/public/documents/cv/sample.pdf',
      transkripUrl: 'https://mock.supabase.co/storage/v1/object/public/documents/transkrip/sample.pdf',
      ipk: 3.85,
      semester: 6,
      portfolioUrl: 'https://ahmadfauzi.dev',
      pengalaman: '2 tahun riset di bidang embedded systems',
    };

    it('should successfully upsert candidate profile', async () => {
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.candidateProfile.upsert as jest.Mock).mockResolvedValue({
        id: 'prof-123',
        userId: mockUser.id,
        ...validPayload,
        isGoldenCandidate: false,
        oprecRecords: [],
      });

      const res = await request(app)
        .post('/api/candidate/profile')
        .set('Authorization', `Bearer ${token}`)
        .send(validPayload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.fullName).toBe('Ahmad Fauzi');
    });

    it('should reject profile submission with invalid role interest', async () => {
      const res = await request(app)
        .post('/api/candidate/profile')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...validPayload,
          roleInterest: 'INVALID_ROLE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/candidate/profile', () => {
    it('should return candidate profile if exists', async () => {
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-123',
        userId: mockUser.id,
        fullName: 'Ahmad Fauzi',
        oprecRecords: [],
      });

      const res = await request(app)
        .get('/api/candidate/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('prof-123');
    });

    it('should return 404 if profile has not been created yet', async () => {
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .get('/api/candidate/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/candidate/apply-oprec', () => {
    it('should successfully apply for oprec batch if profile is complete', async () => {
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-123',
        userId: mockUser.id,
        fullName: 'Ahmad Fauzi',
        universitas: 'UI',
        nim: '1234567890',
        programStudi: 'Teknik Komputer',
        roleInterest: RoleInterest.RISET,
        cvUrl: 'https://mock.supabase.co/cv.pdf',
        portfolioUrl: 'https://ahmadfauzi.dev',
      });

      (prisma.oprecRegistration.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.oprecRegistration.create as jest.Mock).mockResolvedValue({
        id: 'reg-123',
        candidateId: 'prof-123',
        batchName: 'Oprec Batch 1 - 2026',
        status: SelectionStatus.PENDING,
      });

      const res = await request(app)
        .post('/api/candidate/apply-oprec')
        .set('Authorization', `Bearer ${token}`)
        .send({ batchName: 'Oprec Batch 1 - 2026' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.batchName).toBe('Oprec Batch 1 - 2026');
    });

    it('should reject application if profile is incomplete', async () => {
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-123',
        userId: mockUser.id,
        fullName: 'Ahmad Fauzi',
        // Missing universitas, nim, prodi, cvUrl
      });

      const res = await request(app)
        .post('/api/candidate/apply-oprec')
        .set('Authorization', `Bearer ${token}`)
        .send({ batchName: 'Oprec Batch 1 - 2026' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Field wajib belum lengkap');
    });

    it('should reject duplicate application for the same batch', async () => {
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-123',
        userId: mockUser.id,
        fullName: 'Ahmad Fauzi',
        universitas: 'UI',
        nim: '1234567890',
        programStudi: 'Teknik Komputer',
        roleInterest: RoleInterest.RISET,
        cvUrl: 'https://mock.supabase.co/cv.pdf',
        portfolioUrl: 'https://ahmadfauzi.dev',
      });

      (prisma.oprecRegistration.findUnique as jest.Mock).mockResolvedValue({
        id: 'reg-existing',
        candidateId: 'prof-123',
        batchName: 'Oprec Batch 1 - 2026',
      });

      const res = await request(app)
        .post('/api/candidate/apply-oprec')
        .set('Authorization', `Bearer ${token}`)
        .send({ batchName: 'Oprec Batch 1 - 2026' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Anda sudah terdaftar');
    });
  });
});
