import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { UserRole, RoleInterest, InterviewStatus, InterviewType } from '@prisma/client';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    candidateProfile: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      count: jest.fn(),
    },
    oprecRegistration: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    goldenApplication: {
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    interview: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    recruitmentSetting: {
      findUnique: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}));

describe('Phase 1 Revision Features Test Suite', () => {
  const mockAdmin = {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@stas-rg.ac.id',
    role: UserRole.ADMIN,
  };

  const mockCandidate = {
    id: 'c0000000-0000-0000-0000-000000000001',
    email: 'candidate@stas-rg.ac.id',
    role: UserRole.CANDIDATE,
  };

  let adminToken: string;
  let candidateToken: string;

  beforeAll(() => {
    adminToken = AuthService.generateToken({
      userId: mockAdmin.id,
      email: mockAdmin.email,
      role: mockAdmin.role,
    });

    candidateToken = AuthService.generateToken({
      userId: mockCandidate.id,
      email: mockCandidate.email,
      role: mockCandidate.role,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.recruitmentSetting.findUnique as jest.Mock).mockResolvedValue({
      id: 'default-setting',
      key: 'DEFAULT',
      isActive: true,
      currentBatch: 'Oprec Batch 1 - 2026',
    });
  });

  describe('1. Validasi 1 NIM = 1 Akun', () => {
    it('should reject registration if NIM is already taken by another account', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-existing',
        nim: '1301210001',
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newuser@stas-rg.ac.id',
          password: 'Password123!',
          nim: '1301210001',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('NIM ini sudah terdaftar');
    });

    it('should reject candidate profile update if NIM is taken by another candidate', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCandidate);
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'prof-other',
        userId: 'other-cand-id',
        nim: '1301210002',
      });

      const res = await request(app)
        .post('/api/candidate/profile')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          fullName: 'Budi Santoso',
          universitas: 'Telkom University',
          nim: '1301210002',
          programStudi: 'Informatika',
          roleInterest: RoleInterest.RISET,
          cvUrl: 'https://example.com/cv.pdf',
          transkripUrl: 'https://example.com/transkrip.pdf',
          ksmUrl: 'https://example.com/ksm.pdf',
          eprtUrl: 'https://example.com/eprt.pdf',
          linkedinUrl: 'https://linkedin.com/in/budisantoso',
          portfolioUrl: 'https://github.com/budisantoso',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('NIM ini sudah terdaftar');
    });
  });

  describe('2. Berkas Wajib (KSM, EPRT, Transkrip, LinkedIn)', () => {
    it('should reject candidate profile if mandatory fields (ksmUrl, eprtUrl, linkedinUrl) are missing', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCandidate);

      const res = await request(app)
        .post('/api/candidate/profile')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          fullName: 'Budi Santoso',
          universitas: 'Telkom University',
          nim: '1301210099',
          programStudi: 'Informatika',
          roleInterest: RoleInterest.RISET,
          cvUrl: 'https://example.com/cv.pdf',
          transkripUrl: 'https://example.com/transkrip.pdf',
          // Missing ksmUrl, eprtUrl, linkedinUrl
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should successfully save profile when all mandatory files and URLs are provided', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCandidate);
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.candidateProfile.upsert as jest.Mock).mockResolvedValue({
        id: 'prof-cand-1',
        userId: mockCandidate.id,
        fullName: 'Budi Santoso',
        nim: '1301210099',
        ksmUrl: 'https://example.com/ksm.pdf',
        eprtUrl: 'https://example.com/eprt.pdf',
        transkripUrl: 'https://example.com/transkrip.pdf',
        linkedinUrl: 'https://linkedin.com/in/budisantoso',
      });

      const res = await request(app)
        .post('/api/candidate/profile')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          fullName: 'Budi Santoso',
          universitas: 'Telkom University',
          nim: '1301210099',
          programStudi: 'Informatika',
          roleInterest: RoleInterest.RISET,
          cvUrl: 'https://example.com/cv.pdf',
          transkripUrl: 'https://example.com/transkrip.pdf',
          ksmUrl: 'https://example.com/ksm.pdf',
          eprtUrl: 'https://example.com/eprt.pdf',
          linkedinUrl: 'https://linkedin.com/in/budisantoso',
          portfolioUrl: 'https://github.com/budisantoso',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.nim).toBe('1301210099');
    });
  });

  describe('3. Interview Management: PIC & Reschedule Flow', () => {
    const interviewId = '11111111-2222-3333-4444-555555555555';

    it('should create interview with PIC information (Admin)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'cand-prof-1',
        userId: mockCandidate.id,
        user: { email: mockCandidate.email },
      });
      (prisma.interview.create as jest.Mock).mockResolvedValue({
        id: interviewId,
        candidateId: 'cand-prof-1',
        datetime: new Date('2026-10-15T09:00:00Z'),
        picName: 'Dr. Jane Doe',
        picId: mockAdmin.id,
        status: InterviewStatus.SCHEDULED,
      });

      const res = await request(app)
        .post('/api/admin/interviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidateId: '11111111-1111-1111-1111-111111111111',
          datetime: '2026-10-15T09:00:00.000Z',
          type: InterviewType.ONLINE,
          picName: 'Dr. Jane Doe',
          picId: mockAdmin.id,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.picName).toBe('Dr. Jane Doe');
    });

    it('should allow candidate to request reschedule with proposed date and availability note', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockCandidate);
      (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue({
        id: 'cand-prof-1',
        userId: mockCandidate.id,
      });
      (prisma.interview.findFirst as jest.Mock).mockResolvedValue({
        id: interviewId,
        candidateId: 'cand-prof-1',
        status: InterviewStatus.SCHEDULED,
        datetime: new Date('2026-10-15T09:00:00Z'),
      });
      (prisma.interview.update as jest.Mock).mockResolvedValue({
        id: interviewId,
        status: InterviewStatus.RESCHEDULE_REQUESTED,
        rescheduleProposedDate: new Date('2026-10-16T14:00:00Z'),
        rescheduleReason: 'Ada ujian praktikum pagi hari, tersedia di tanggal 16 Oktober jam 13:00 - 17:00',
      });

      const res = await request(app)
        .post(`/api/candidate/interviews/${interviewId}/reschedule`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          proposedDatetime: '2026-10-16T14:00:00.000Z',
          reason: 'Ada ujian praktikum pagi hari, tersedia di tanggal 16 Oktober jam 13:00 - 17:00',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(InterviewStatus.RESCHEDULE_REQUESTED);
    });

    it('should allow admin to reject reschedule with note', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.interview.findUnique as jest.Mock).mockResolvedValue({
        id: interviewId,
        status: InterviewStatus.RESCHEDULE_REQUESTED,
        candidate: { userId: mockCandidate.id, user: { email: mockCandidate.email } },
      });
      (prisma.interview.update as jest.Mock).mockResolvedValue({
        id: interviewId,
        status: InterviewStatus.RESCHEDULE_REJECTED,
        adminRescheduleNote: 'Slot tanggal 16 Oktober siang sudah penuh. Harap pilih tanggal 17 Oktober.',
      });

      const res = await request(app)
        .post(`/api/admin/interviews/${interviewId}/reschedule-reject`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          adminNote: 'Slot tanggal 16 Oktober siang sudah penuh. Harap pilih tanggal 17 Oktober.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(InterviewStatus.RESCHEDULE_REJECTED);
      expect(res.body.data.adminRescheduleNote).toContain('Slot tanggal 16 Oktober');
    });

    it('should allow admin to approve reschedule request', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.interview.findUnique as jest.Mock).mockResolvedValue({
        id: interviewId,
        status: InterviewStatus.RESCHEDULE_REQUESTED,
        rescheduleProposedDate: new Date('2026-10-17T10:00:00Z'),
        candidate: { userId: mockCandidate.id, user: { email: mockCandidate.email } },
      });
      (prisma.interview.update as jest.Mock).mockResolvedValue({
        id: interviewId,
        datetime: new Date('2026-10-17T10:00:00Z'),
        status: InterviewStatus.SCHEDULED,
        rescheduleProposedDate: null,
      });

      const res = await request(app)
        .post(`/api/admin/interviews/${interviewId}/reschedule-approve`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(InterviewStatus.SCHEDULED);
    });
  });

  describe('4. Dashboard Time Filter & NIM Search Filter', () => {
    it('should return dashboard stats filtered by time range and period', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.candidateProfile.count as jest.Mock).mockResolvedValue(15);
      (prisma.goldenApplication.count as jest.Mock).mockResolvedValue(3);
      (prisma.oprecRegistration.count as jest.Mock).mockResolvedValue(12);
      (prisma.oprecRegistration.groupBy as jest.Mock).mockResolvedValue([]);
      (prisma.oprecRegistration.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/admin/dashboard/stats?period=monthly')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.filterApplied.period).toBe('monthly');
      expect(res.body.data.filterApplied.startDate).toBeDefined();
    });

    it('should filter candidate list by NIM parameter (Admin)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockAdmin);
      (prisma.oprecRegistration.count as jest.Mock).mockResolvedValue(1);
      (prisma.oprecRegistration.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'reg-1',
          candidateId: 'cand-1',
          batchName: 'Oprec Batch 1 - 2026',
          candidate: {
            id: 'cand-1',
            fullName: 'Budi Santoso',
            nim: '1301210099',
            universitas: 'Telkom University',
            roleInterest: RoleInterest.RISET,
            isGoldenCandidate: false,
          },
        },
      ]);

      const res = await request(app)
        .get('/api/admin/candidates?nim=1301210099')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].candidate.nim).toBe('1301210099');
    });
  });
});
