import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { UserRole, SelectionStatus, InterviewType, InterviewStatus } from '@prisma/client';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    candidateProfile: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    batch: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    goldenApplication: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    adminNote: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    interview: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    activityLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    announcement: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    recruitmentSetting: {
      findUnique: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
    },
    oprecRegistration: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}));

describe('New Features Integration Tests', () => {
  const adminUser = {
    id: 'a0000000-0000-4000-8000-000000000001',
    email: 'admin@stas-rg.ac.id',
    role: UserRole.ADMIN,
  };

  const candidateUser = {
    id: 'c0000000-0000-4000-8000-000000000001',
    email: 'candidate@stas-rg.ac.id',
    role: UserRole.CANDIDATE,
  };

  const mockProfile = {
    id: 'e0000000-0000-4000-8000-000000000001',
    userId: candidateUser.id,
    fullName: 'Budi Santoso',
    universitas: 'Universitas Indonesia',
    nim: '1906123456',
    programStudi: 'Ilmu Komputer',
    isGoldenCandidate: false,
    user: candidateUser,
  };

  let adminToken: string;
  let candidateToken: string;

  beforeAll(() => {
    adminToken = AuthService.generateToken({
      userId: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
    });

    candidateToken = AuthService.generateToken({
      userId: candidateUser.id,
      email: candidateUser.email,
      role: candidateUser.role,
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
      if (where.id === adminUser.id) return Promise.resolve(adminUser);
      if (where.id === candidateUser.id) return Promise.resolve(candidateUser);
      return Promise.resolve(null);
    });
    (prisma.candidateProfile.findUnique as jest.Mock).mockResolvedValue(mockProfile);
  });

  describe('Batch Management (F1) - /api/admin/oprec/batches', () => {
    it('POST /api/admin/oprec/batches - should create a new batch', async () => {
      (prisma.batch.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.batch.create as jest.Mock).mockResolvedValue({
        id: 'b0000000-0000-4000-8000-000000000001',
        name: 'Batch 2 - 2026',
        description: 'Perekrutan lab riset semester ganjil',
        quota: 30,
        isActive: false,
      });

      const res = await request(app)
        .post('/api/admin/oprec/batches')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Batch 2 - 2026',
          description: 'Perekrutan lab riset semester ganjil',
          quota: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('Batch 2 - 2026');
    });

    it('GET /api/admin/oprec/batches - should list all batches', async () => {
      (prisma.batch.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'b0000000-0000-4000-8000-000000000001',
          name: 'Batch 2 - 2026',
          _count: { registrations: 12 },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/admin/oprec/batches')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0].totalApplicants).toBe(12);
    });

    it('PATCH /api/admin/oprec/batches/:id/activate - should activate target batch', async () => {
      const batchId = 'b0000000-0000-4000-8000-000000000001';
      (prisma.batch.findUnique as jest.Mock).mockResolvedValue({
        id: batchId,
        name: 'Batch 2 - 2026',
      });
      (prisma.batch.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.batch.update as jest.Mock).mockResolvedValue({
        id: batchId,
        name: 'Batch 2 - 2026',
        isActive: true,
      });
      (prisma.recruitmentSetting.upsert as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .patch(`/api/admin/oprec/batches/${batchId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(true);
    });
  });

  describe('Golden Application (F3) - /api/candidate/golden-application', () => {
    it('POST /api/candidate/golden-application - should submit golden application', async () => {
      (prisma.goldenApplication.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.candidateProfile.update as jest.Mock).mockResolvedValue({
        ...mockProfile,
        isGoldenCandidate: true,
      });
      (prisma.goldenApplication.create as jest.Mock).mockResolvedValue({
        id: '50000000-0000-4000-8000-000000000001',
        candidateId: mockProfile.id,
        motivasi: 'Tertarik riset cyber security',
        pencapaian: 'Juara 1 CTF Nasional',
        status: SelectionStatus.PENDING,
      });

      const res = await request(app)
        .post('/api/candidate/golden-application')
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          motivasi: 'Tertarik riset cyber security',
          pencapaian: 'Juara 1 CTF Nasional',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.pencapaian).toBe('Juara 1 CTF Nasional');
    });

    it('GET /api/candidate/golden-application - should retrieve submitted application', async () => {
      (prisma.goldenApplication.findFirst as jest.Mock).mockResolvedValue({
        id: '50000000-0000-4000-8000-000000000001',
        candidateId: mockProfile.id,
        motivasi: 'Tertarik riset',
        pencapaian: 'Juara 1 CTF',
        status: SelectionStatus.PENDING,
      });

      const res = await request(app)
        .get('/api/candidate/golden-application')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('50000000-0000-4000-8000-000000000001');
    });
  });

  describe('Admin Notes & Bulk Status (F4 & F5)', () => {
    it('PATCH /api/admin/candidates/bulk-status - should update status in bulk', async () => {
      const regIds = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'];
      (prisma.oprecRegistration.findMany as jest.Mock).mockResolvedValue([
        { id: regIds[0], batchName: 'Batch 1', candidate: { userId: candidateUser.id } },
        { id: regIds[1], batchName: 'Batch 1', candidate: { userId: candidateUser.id } },
      ]);
      (prisma.oprecRegistration.updateMany as jest.Mock).mockResolvedValue({ count: 2 });
      (prisma.notification.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .patch('/api/admin/candidates/bulk-status')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ids: regIds,
          status: SelectionStatus.SELEKSI_BERKAS,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.updatedCount).toBe(2);
    });

    it('POST /api/admin/candidates/:id/notes - should add internal note', async () => {
      (prisma.adminNote.create as jest.Mock).mockResolvedValue({
        id: '20000000-0000-4000-8000-000000000001',
        candidateId: mockProfile.id,
        adminId: adminUser.id,
        content: 'Kandidat memiliki portofolio sangat kuat',
        admin: { id: adminUser.id, email: adminUser.email, role: adminUser.role },
      });

      const res = await request(app)
        .post(`/api/admin/candidates/${mockProfile.id}/notes`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          content: 'Kandidat memiliki portofolio sangat kuat',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toContain('portofolio sangat kuat');
    });

    it('GET /api/admin/candidates/:id/notes - should get internal notes', async () => {
      (prisma.adminNote.findMany as jest.Mock).mockResolvedValue([
        {
          id: '20000000-0000-4000-8000-000000000001',
          content: 'Kandidat memiliki portofolio sangat kuat',
          admin: { email: adminUser.email },
        },
      ]);

      const res = await request(app)
        .get(`/api/admin/candidates/${mockProfile.id}/notes`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('Notifications (F6) - /api/candidate/notifications', () => {
    it('GET /api/candidate/notifications - should get candidate notifications', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(1);
      (prisma.notification.findMany as jest.Mock).mockResolvedValue([
        {
          id: '30000000-0000-4000-8000-000000000001',
          userId: candidateUser.id,
          title: 'Status Seleksi',
          message: 'Status Anda telah diubah',
          isRead: false,
        },
      ]);

      const res = await request(app)
        .get('/api/candidate/notifications')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });

    it('GET /api/candidate/notifications/unread-count - should return unread count', async () => {
      (prisma.notification.count as jest.Mock).mockResolvedValue(3);

      const res = await request(app)
        .get('/api/candidate/notifications/unread-count')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.unreadCount).toBe(3);
    });

    it('PATCH /api/candidate/notifications/:id/read - should mark notification as read', async () => {
      const notifId = '30000000-0000-4000-8000-000000000001';
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue({
        id: notifId,
        userId: candidateUser.id,
      });
      (prisma.notification.update as jest.Mock).mockResolvedValue({
        id: notifId,
        isRead: true,
      });

      const res = await request(app)
        .patch(`/api/candidate/notifications/${notifId}/read`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
    });
  });

  describe('Interview Scheduling (F7)', () => {
    it('POST /api/admin/interviews - should schedule an interview', async () => {
      const interviewDate = '2026-10-15T09:00:00.000Z';
      (prisma.interview.create as jest.Mock).mockResolvedValue({
        id: '40000000-0000-4000-8000-000000000001',
        candidateId: mockProfile.id,
        datetime: new Date(interviewDate),
        type: InterviewType.ONLINE,
        link: 'https://meet.google.com/abc-defg-hij',
        status: InterviewStatus.SCHEDULED,
        candidate: { userId: candidateUser.id, user: { email: candidateUser.email } },
      });
      (prisma.notification.create as jest.Mock).mockResolvedValue({});

      const res = await request(app)
        .post('/api/admin/interviews')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          candidateId: mockProfile.id,
          datetime: interviewDate,
          type: InterviewType.ONLINE,
          link: 'https://meet.google.com/abc-defg-hij',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.link).toBe('https://meet.google.com/abc-defg-hij');
    });

    it('PATCH /api/candidate/interviews/:id/confirm - candidate confirms interview', async () => {
      const interviewId = '40000000-0000-4000-8000-000000000001';
      (prisma.interview.findFirst as jest.Mock).mockResolvedValue({
        id: interviewId,
        candidateId: mockProfile.id,
        status: InterviewStatus.SCHEDULED,
      });
      (prisma.interview.update as jest.Mock).mockResolvedValue({
        id: interviewId,
        status: InterviewStatus.CONFIRMED,
      });

      const res = await request(app)
        .patch(`/api/candidate/interviews/${interviewId}/confirm`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe(InterviewStatus.CONFIRMED);
    });
  });

  describe('Candidate Registrations History (F8)', () => {
    it('GET /api/candidate/registrations - should return registration history', async () => {
      (prisma.oprecRegistration.findMany as jest.Mock).mockResolvedValue([
        {
          id: '10000000-0000-4000-8000-000000000001',
          candidateId: mockProfile.id,
          batchName: 'Batch 1 - 2026',
          status: SelectionStatus.DITERIMA,
        },
      ]);

      const res = await request(app)
        .get('/api/candidate/registrations')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('Activity Logs (F10)', () => {
    it('GET /api/admin/activity-logs - should return activity logs for admin', async () => {
      (prisma.activityLog.count as jest.Mock).mockResolvedValue(1);
      (prisma.activityLog.findMany as jest.Mock).mockResolvedValue([
        {
          id: '70000000-0000-4000-8000-000000000001',
          action: 'CREATE_BATCH',
          targetType: 'BATCH',
          user: { email: adminUser.email },
        },
      ]);

      const res = await request(app)
        .get('/api/admin/activity-logs')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });

  describe('Announcements (F11)', () => {
    it('POST /api/admin/announcements - should create announcement', async () => {
      (prisma.announcement.create as jest.Mock).mockResolvedValue({
        id: '60000000-0000-4000-8000-000000000001',
        title: 'Pengumuman Tahap 1',
        content: 'Hasil seleksi berkas dapat diakses di dashboard.',
        isActive: true,
      });

      const res = await request(app)
        .post('/api/admin/announcements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          title: 'Pengumuman Tahap 1',
          content: 'Hasil seleksi berkas dapat diakses di dashboard.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.title).toBe('Pengumuman Tahap 1');
    });

    it('GET /api/public/announcements - should return active announcements publicly', async () => {
      (prisma.announcement.findMany as jest.Mock).mockResolvedValue([
        {
          id: '60000000-0000-4000-8000-000000000001',
          title: 'Pengumuman Tahap 1',
          content: 'Hasil seleksi berkas dapat diakses di dashboard.',
          isActive: true,
        },
      ]);

      const res = await request(app).get('/api/public/announcements');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(1);
    });
  });
});
