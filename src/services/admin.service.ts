import { prisma } from '../config/prisma';
import { SelectionStatus, RoleInterest } from '@prisma/client';

export interface GetCandidatesFilter {
  search?: string;
  batch?: string;
  status?: SelectionStatus;
  roleInterest?: RoleInterest;
  isGolden?: boolean;
  page?: number;
  limit?: number;
}

export class AdminService {
  /**
   * Build Prisma where clause for candidate registrations
   */
  private static buildWhereClause(filter: GetCandidatesFilter) {
    const whereClause: any = {};

    if (filter.batch) {
      whereClause.batchName = { contains: filter.batch, mode: 'insensitive' };
    }

    if (filter.status) {
      whereClause.status = filter.status;
    }

    const candidateFilter: any = {};

    if (filter.isGolden !== undefined) {
      candidateFilter.isGoldenCandidate = filter.isGolden;
    }

    if (filter.roleInterest) {
      candidateFilter.roleInterest = filter.roleInterest;
    }

    if (filter.search && filter.search.trim() !== '') {
      const searchTerm = filter.search.trim();
      candidateFilter.OR = [
        { fullName: { contains: searchTerm, mode: 'insensitive' } },
        { nim: { contains: searchTerm, mode: 'insensitive' } },
        { universitas: { contains: searchTerm, mode: 'insensitive' } },
        { programStudi: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    if (Object.keys(candidateFilter).length > 0) {
      whereClause.candidate = candidateFilter;
    }

    return whereClause;
  }

  /**
   * Get all candidates / registrations with pagination and filtering
   */
  static async getCandidates(filter: GetCandidatesFilter) {
    const whereClause = this.buildWhereClause(filter);

    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 10;
    const skip = (page - 1) * limit;

    const [total, registrations] = await Promise.all([
      prisma.oprecRegistration.count({ where: whereClause }),
      prisma.oprecRegistration.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          candidate: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  createdAt: true,
                },
              },
            },
          },
        },
        orderBy: {
          appliedAt: 'desc',
        },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      data: registrations,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }

  /**
   * Export all matching candidates to CSV formatted string
   */
  static async exportCandidatesCsv(filter: Omit<GetCandidatesFilter, 'page' | 'limit'>) {
    const whereClause = this.buildWhereClause(filter);

    const records = await prisma.oprecRegistration.findMany({
      where: whereClause,
      include: {
        candidate: {
          include: {
            user: {
              select: {
                email: true,
              },
            },
          },
        },
      },
      orderBy: {
        appliedAt: 'desc',
      },
    });

    const headers = [
      'Registration ID',
      'Nama Lengkap',
      'Email',
      'Universitas',
      'NIM',
      'Program Studi',
      'Role Interest',
      'IPK',
      'Semester',
      'Status Seleksi',
      'Golden Candidate',
      'Batch',
      'Assigned Project',
      'URL CV',
      'URL Portofolio',
      'URL Transkrip',
      'Tanggal Mendaftar',
    ];

    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    const rows = records.map((r) => [
      escapeCsv(r.id),
      escapeCsv(r.candidate.fullName),
      escapeCsv(r.candidate.user.email),
      escapeCsv(r.candidate.universitas),
      escapeCsv(r.candidate.nim),
      escapeCsv(r.candidate.programStudi),
      escapeCsv(r.candidate.roleInterest),
      escapeCsv(r.candidate.ipk ?? '-'),
      escapeCsv(r.candidate.semester ?? '-'),
      escapeCsv(r.status),
      escapeCsv(r.candidate.isGoldenCandidate ? 'Ya' : 'Tidak'),
      escapeCsv(r.batchName),
      escapeCsv(r.assignedProject ?? '-'),
      escapeCsv(r.candidate.cvUrl),
      escapeCsv(r.candidate.portfolioUrl),
      escapeCsv(r.candidate.transkripUrl ?? '-'),
      escapeCsv(r.appliedAt.toISOString()),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  }

  /**
   * Get detailed candidate information by candidateProfile ID, userId, or registrationId
   */
  static async getCandidateById(identifier: string) {
    // 1. Try finding directly by CandidateProfile.id
    let candidate = await prisma.candidateProfile.findUnique({
      where: { id: identifier },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        oprecRecords: {
          orderBy: { appliedAt: 'desc' },
        },
      },
    });

    // 2. Fallback: Try finding by User.id
    if (!candidate) {
      candidate = await prisma.candidateProfile.findUnique({
        where: { userId: identifier },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
              createdAt: true,
            },
          },
          oprecRecords: {
            orderBy: { appliedAt: 'desc' },
          },
        },
      });
    }

    // 3. Fallback: Try finding via OprecRegistration.id
    if (!candidate) {
      const registration = await prisma.oprecRegistration.findUnique({
        where: { id: identifier },
        include: {
          candidate: {
            include: {
              user: {
                select: {
                  id: true,
                  email: true,
                  role: true,
                  createdAt: true,
                },
              },
              oprecRecords: {
                orderBy: { appliedAt: 'desc' },
              },
            },
          },
        },
      });

      if (registration?.candidate) {
        candidate = registration.candidate;
      }
    }

    if (!candidate) {
      const error: any = new Error('Kandidat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return candidate;
  }

  /**
   * Update Selection Status for an Oprec Registration
   */
  static async updateSelectionStatus(registrationId: string, status: SelectionStatus) {
    const registration = await prisma.oprecRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      const error: any = new Error('Pendaftaran Oprec tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.oprecRegistration.update({
      where: { id: registrationId },
      data: { status },
      include: {
        candidate: true,
      },
    });

    return updated;
  }

  /**
   * Assign Project Name to accepted candidate
   * Business Constraint: Only allowed if registration status is 'DITERIMA'
   */
  static async assignProject(registrationId: string, assignedProject: string) {
    const registration = await prisma.oprecRegistration.findUnique({
      where: { id: registrationId },
    });

    if (!registration) {
      const error: any = new Error('Pendaftaran Oprec tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (registration.status !== SelectionStatus.DITERIMA) {
      const error: any = new Error(
        `Alokasi proyek hanya dapat dilakukan untuk kandidat dengan status DITERIMA (Status saat ini: ${registration.status})`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.oprecRegistration.update({
      where: { id: registrationId },
      data: { assignedProject },
      include: {
        candidate: true,
      },
    });

    return updated;
  }
}
