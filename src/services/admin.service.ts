import { prisma } from '../config/prisma';
import { SelectionStatus, RoleInterest, GoldenStatus } from '@prisma/client';
import { ActivityLogService } from './activity-log.service';
import { NotificationService } from './notification.service';
import { GoldenService } from './golden.service';

export interface GetCandidatesFilter {
  search?: string;
  batch?: string;
  status?: SelectionStatus | GoldenStatus;
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
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 10;
    const skip = (page - 1) * limit;

    // If filtering specifically for Golden Candidates
    if (filter.isGolden === true) {
      const goldenWhere: any = {};

      if (filter.status) {
        goldenWhere.status = filter.status;
      }

      const candidateFilter: any = {};

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
        goldenWhere.candidate = candidateFilter;
      }

      const [total, goldenApps] = await Promise.all([
        prisma.goldenApplication.count({ where: goldenWhere }),
        prisma.goldenApplication.findMany({
          where: goldenWhere,
          skip,
          take: limit,
          include: {
            registration: true,
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
                goldenApplications: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      const mappedData = goldenApps.map((app) => ({
        id: app.registrationId || app.id,
        candidateId: app.candidateId,
        batchName: app.registration?.batchName || 'Jalur Golden',
        status: app.status,
        assignedProject: app.registration?.assignedProject ?? null,
        appliedAt: app.createdAt,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        isGoldenTrack: true,
        goldenApplication: {
          id: app.id,
          motivasi: app.motivasi,
          pencapaian: app.pencapaian,
          rekomendasi: app.rekomendasi,
          status: app.status,
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
        },
        candidate: {
          ...app.candidate,
          isGoldenCandidate: app.status === GoldenStatus.ACCEPTED || app.candidate.isGoldenCandidate,
        },
      }));

      return {
        data: mappedData,
        meta: {
          total,
          page,
          limit,
          totalPages,
        },
      };
    }

    const whereClause = this.buildWhereClause(filter);

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
              goldenApplications: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
        orderBy: [
          {
            candidate: {
              isGoldenCandidate: 'desc',
            },
          },
          {
            appliedAt: 'desc',
          },
        ],
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
    const escapeCsv = (str: any) => {
      if (str === null || str === undefined) return '""';
      const clean = String(str).replace(/"/g, '""');
      return `"${clean}"`;
    };

    if (filter.isGolden === true) {
      const goldenWhere: any = {};

      if (filter.status) {
        goldenWhere.status = filter.status;
      }

      const candidateFilter: any = {};

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
        goldenWhere.candidate = candidateFilter;
      }

      const goldenApps = await prisma.goldenApplication.findMany({
        where: goldenWhere,
        include: {
          registration: true,
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
          createdAt: 'desc',
        },
      });

      const headers = [
        'Application ID',
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

      const rows = goldenApps.map((app) => [
        escapeCsv(app.id),
        escapeCsv(app.candidate.fullName),
        escapeCsv(app.candidate.user.email),
        escapeCsv(app.candidate.universitas),
        escapeCsv(app.candidate.nim),
        escapeCsv(app.candidate.programStudi),
        escapeCsv(app.candidate.roleInterest),
        escapeCsv(app.candidate.ipk ?? '-'),
        escapeCsv(app.candidate.semester ?? '-'),
        escapeCsv(app.status),
        escapeCsv('Ya'),
        escapeCsv(app.registration?.batchName || 'Jalur Golden'),
        escapeCsv(app.registration?.assignedProject ?? '-'),
        escapeCsv(app.candidate.cvUrl),
        escapeCsv(app.candidate.portfolioUrl),
        escapeCsv(app.candidate.transkripUrl ?? '-'),
        escapeCsv(app.createdAt.toISOString()),
      ]);

      return [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
    }

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
   * Detail include object for comprehensive candidate profile querying
   */
  private static candidateDetailInclude = {
    user: {
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
      },
    },
    oprecRecords: {
      orderBy: { appliedAt: 'desc' as const },
      include: {
        batch: true,
        goldenApplication: true,
      },
    },
    goldenApplications: {
      orderBy: { createdAt: 'desc' as const },
      include: {
        registration: true,
      },
    },
    adminNotes: {
      orderBy: { createdAt: 'desc' as const },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    },
    interviews: {
      orderBy: { datetime: 'asc' as const },
    },
  };

  /**
   * Get detailed candidate information by candidateProfile ID, userId, or registrationId
   */
  static async getCandidateById(identifier: string) {
    // 1. Try finding directly by CandidateProfile.id
    let candidate = await prisma.candidateProfile.findUnique({
      where: { id: identifier },
      include: this.candidateDetailInclude,
    });

    // 2. Fallback: Try finding by User.id
    if (!candidate) {
      candidate = await prisma.candidateProfile.findUnique({
        where: { userId: identifier },
        include: this.candidateDetailInclude,
      });
    }

    // 3. Fallback: Try finding via OprecRegistration.id
    if (!candidate) {
      const registration = await prisma.oprecRegistration.findUnique({
        where: { id: identifier },
        include: {
          candidate: {
            include: this.candidateDetailInclude,
          },
        },
      });

      if (registration?.candidate) {
        candidate = registration.candidate;
      }
    }

    // 4. Fallback: Try finding via GoldenApplication.id
    if (!candidate) {
      const goldenApp = await prisma.goldenApplication.findUnique({
        where: { id: identifier },
        include: {
          candidate: {
            include: this.candidateDetailInclude,
          },
        },
      });

      if (goldenApp?.candidate) {
        candidate = goldenApp.candidate;
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

  /**
   * Bulk Update Selection Status for multiple candidate registrations
   */
  static async bulkUpdateStatus(adminId: string, registrationIds: string[], status: SelectionStatus) {
    const registrations = await prisma.oprecRegistration.findMany({
      where: { id: { in: registrationIds } },
      include: {
        candidate: {
          include: { user: true },
        },
      },
    });

    if (registrations.length === 0) {
      const error: any = new Error('Tidak ada data pendaftaran yang cocok dengan ID yang diberikan');
      error.statusCode = 404;
      throw error;
    }

    const updateResult = await prisma.oprecRegistration.updateMany({
      where: { id: { in: registrationIds } },
      data: { status },
    });

    // Notify affected candidates
    for (const reg of registrations) {
      if (reg.candidate?.userId) {
        await NotificationService.send(
          reg.candidate.userId,
          'Pembaruan Status Seleksi',
          `Status seleksi Anda untuk ${reg.batchName} telah diperbarui menjadi: ${status}`
        );
      }
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'BULK_UPDATE_STATUS',
      targetType: 'OPREC_REGISTRATION',
      details: { count: updateResult.count, targetStatus: status, ids: registrationIds },
    });

    return {
      updatedCount: updateResult.count,
      status,
    };
  }

  /**
   * Create internal note for a candidate
   */
  static async createCandidateNote(
    adminId: string,
    candidateIdentifier: string,
    content: string,
    registrationId?: string | null
  ) {
    const candidate = await this.getCandidateById(candidateIdentifier);

    const note = await prisma.adminNote.create({
      data: {
        candidateId: candidate.id,
        adminId,
        content,
        registrationId: registrationId ?? null,
      },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    await ActivityLogService.record({
      userId: adminId,
      action: 'CREATE_ADMIN_NOTE',
      targetType: 'CANDIDATE',
      targetId: candidate.id,
      details: { noteId: note.id },
    });

    return note;
  }

  /**
   * Get all internal notes for a candidate
   */
  static async getCandidateNotes(candidateIdentifier: string) {
    const candidate = await this.getCandidateById(candidateIdentifier);

    const notes = await prisma.adminNote.findMany({
      where: { candidateId: candidate.id },
      orderBy: { createdAt: 'desc' },
      include: {
        admin: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return notes;
  }

  /**
   * Delete an internal note
   */
  static async deleteCandidateNote(adminId: string, candidateIdentifier: string, noteId: string) {
    const candidate = await this.getCandidateById(candidateIdentifier);

    const note = await prisma.adminNote.findFirst({
      where: {
        id: noteId,
        candidateId: candidate.id,
      },
    });

    if (!note) {
      const error: any = new Error('Catatan tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await prisma.adminNote.delete({
      where: { id: noteId },
    });

    await ActivityLogService.record({
      userId: adminId,
      action: 'DELETE_ADMIN_NOTE',
      targetType: 'CANDIDATE',
      targetId: candidate.id,
      details: { noteId },
    });

    return { message: 'Catatan berhasil dihapus' };
  }

  /**
   * Update Golden Candidate status
   */
  static async updateGoldenStatus(adminId: string, identifier: string, status: GoldenStatus) {
    return GoldenService.updateGoldenStatus(adminId, identifier, status);
  }
}
