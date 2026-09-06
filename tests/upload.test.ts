import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { StorageService } from '../src/services/storage.service';
import { UserRole } from '@prisma/client';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('../src/services/storage.service');

describe('Upload Endpoints (POST /api/upload/document)', () => {
  const mockUser = {
    id: 'user-cand-1',
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
  });

  it('should reject upload if not authenticated', async () => {
    const res = await request(app).post('/api/upload/document');
    expect(res.status).toBe(401);
  });

  it('should reject non-PDF file upload', async () => {
    const fakeImageBuffer = Buffer.from('fake-image-content');

    const res = await request(app)
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', fakeImageBuffer, {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Hanya file PDF');
  });

  it('should successfully upload valid PDF file', async () => {
    const fakePdfBuffer = Buffer.from('%PDF-1.4 sample pdf content');
    const mockPublicUrl =
      'https://mock.supabase.co/storage/v1/object/public/documents/cv/123_cv.pdf';

    (StorageService.uploadDocument as jest.Mock).mockResolvedValue(mockPublicUrl);

    const res = await request(app)
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'cv')
      .attach('file', fakePdfBuffer, {
        filename: 'cv_candidate.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.url).toBe(mockPublicUrl);
    expect(res.body.data.fileName).toBe('cv_candidate.pdf');
    expect(res.body.data.mimetype).toBe('application/pdf');
  });
});
