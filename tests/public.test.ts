import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    recruitmentSetting: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

describe('Public Endpoints (/api/public)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/public/oprec-status should return recruitment status publicly', async () => {
    (prisma.recruitmentSetting.findUnique as jest.Mock).mockResolvedValue({
      id: 'setting-1',
      key: 'DEFAULT',
      isActive: true,
      currentBatch: 'Oprec Batch 1 - 2026',
      startDate: new Date('2026-09-01'),
      endDate: new Date('2026-09-30'),
      description: 'Periode pendaftaran aktif',
    });

    const res = await request(app).get('/api/public/oprec-status');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isOprecActive).toBe(true);
    expect(res.body.data.currentBatch).toBe('Oprec Batch 1 - 2026');
    expect(res.body.data.availableRoles).toEqual(['RISET', 'MAGANG']);
  });
});
