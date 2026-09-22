import request from 'supertest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { AuthService } from '../src/services/auth.service';
import { UserRole, SelectionStatus } from '@prisma/client';
import jwt from 'jsonwebtoken';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
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
    goldenApplication: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    recruitmentSetting: {
      findUnique: jest.fn(),
    },
  },
}));

describe('Security Verification Test Suite (QA Audit)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Privilege Escalation Prevention (CWE-269 / Mass Assignment)', () => {
    it('should ignore role: "ADMIN" in registration payload and enforce CANDIDATE role', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'user-sec-1',
          email: data.email,
          role: data.role,
          createdAt: new Date(),
        })
      );

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'hacker@attack.com',
          password: 'password123',
          role: 'ADMIN', // Attack attempt
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      // Verify in prisma.user.create call that role was forced to CANDIDATE
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.CANDIDATE,
          }),
        })
      );
      expect(res.body.data.user.role).toBe(UserRole.CANDIDATE);
    });
  });

  describe('2. JWT Signature Verification Enforced (CWE-347)', () => {
    it('should reject forged JWT token with unverified signature', async () => {
      const forgedToken = jwt.sign(
        { userId: 'admin-id-123', email: 'fakeadmin@test.com', role: UserRole.ADMIN },
        'wrong-secret-key-attacker'
      );

      const res = await request(app)
        .get('/api/admin/candidates')
        .set('Authorization', `Bearer ${forgedToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Token autentikasi tidak valid atau telah kedaluwarsa');
    });

    it('should reject algorithm "none" unsigned token', async () => {
      // Header: {"alg":"none","typ":"JWT"} -> eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0
      // Payload: {"userId":"admin-id-123","role":"ADMIN"} -> eyJ1c2VySWQiOiJhZG1pbi1pZC0xMjMiLCJyb2xlIjoiQURNSU4ifQ
      const unsignedNoneToken = 'eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.eyJ1c2VySWQiOiJhZG1pbi1pZC0xMjMiLCJyb2xlIjoiQURNSU4ifQ.';

      const res = await request(app)
        .get('/api/admin/candidates')
        .set('Authorization', `Bearer ${unsignedNoneToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('3. CSV Formula Injection Defense (CWE-1236)', () => {
    const adminUser = {
      id: 'admin-sec-1',
      email: 'admin@stas-rg.ac.id',
      role: UserRole.ADMIN,
    };
    let adminToken: string;

    beforeAll(() => {
      adminToken = AuthService.generateToken({
        userId: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
      });
    });

    it('should prepend single quote to fields starting with formula characters (=, +, -, @)', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(adminUser);
      (prisma.oprecRegistration.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'reg-injection-1',
          batchName: '=CMD|"/C calc"!A0',
          status: SelectionStatus.PENDING,
          assignedProject: '+123456789',
          appliedAt: new Date('2026-01-01'),
          candidate: {
            fullName: '=HYPERLINK("http://attacker.com", "Click Here")',
            universitas: '-Malicious Univ',
            nim: '@evilFormula',
            programStudi: 'Informatika',
            roleInterest: 'RISET',
            ipk: 3.8,
            semester: 6,
            cvUrl: 'https://cv.url',
            portfolioUrl: 'https://port.url',
            transkripUrl: null,
            isGoldenCandidate: false,
            user: { email: 'malicious@test.com' },
          },
        },
      ]);

      const res = await request(app)
        .get('/api/admin/candidates/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
      const csvContent = res.text;

      // Formula characters must be neutralized with a leading single quote
      expect(csvContent).toContain("\"'=HYPERLINK");
      expect(csvContent).toContain("\"'-Malicious Univ");
      expect(csvContent).toContain("\"'@evilFormula");
      expect(csvContent).toContain("\"'=CMD");
      expect(csvContent).toContain("\"'+123456789");
    });
  });

  describe('4. File Upload Magic Byte & MIME Validation', () => {
    const candidateUser = {
      id: 'cand-sec-1',
      email: 'candidate@stas-rg.ac.id',
      role: UserRole.CANDIDATE,
    };
    let candidateToken: string;

    beforeAll(() => {
      candidateToken = AuthService.generateToken({
        userId: candidateUser.id,
        email: candidateUser.email,
        role: candidateUser.role,
      });
    });

    it('should reject file with .pdf extension but fake/executable magic bytes', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(candidateUser);

      // DOS / Executable magic bytes "MZ"
      const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00Fake executable disguised as pdf');

      const res = await request(app)
        .post('/api/upload/document')
        .set('Authorization', `Bearer ${candidateToken}`)
        .attach('file', fakeExeBuffer, {
          filename: 'payload.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('bukan dokumen PDF yang valid');
    });
  });
});
