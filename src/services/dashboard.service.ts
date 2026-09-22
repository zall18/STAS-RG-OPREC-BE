import { prisma } from '../config/prisma';
import { RoleInterest, SelectionStatus, GoldenStatus } from '@prisma/client';
import { SettingService } from './setting.service';

export interface DashboardStatsFilter {
  batch?: string;
}

export class DashboardService {
  /**
   * Aggregate statistics for Admin Dashboard
   */
  static async getStats(filter?: DashboardStatsFilter) {
    const currentSetting = await SettingService.getSetting();

    // 1. Total Candidate Profiles
    const totalCandidates = await prisma.candidateProfile.count();

    // 2. Total Golden Candidates (Those with isGoldenCandidate = true)
    const totalGoldenCandidates = await prisma.candidateProfile.count({
      where: { isGoldenCandidate: true },
    });

    const totalGoldenApplications = await prisma.goldenApplication.count();

    // 3. Filter clause for OprecRegistrations if batch specified
    const registrationWhere: any = {};
    if (filter?.batch) {
      registrationWhere.batchName = { contains: filter.batch, mode: 'insensitive' };
    }

    const totalRegistrations = await prisma.oprecRegistration.count({
      where: registrationWhere,
    });

    // 4. Role Interest distribution
    const risetCount = await prisma.candidateProfile.count({
      where: { roleInterest: RoleInterest.RISET },
    });
    const magangCount = await prisma.candidateProfile.count({
      where: { roleInterest: RoleInterest.MAGANG },
    });

    // 5. Status distribution for registrations (Optimized with groupBy)
    const statusGroups = await prisma.oprecRegistration.groupBy({
      by: ['status'],
      where: registrationWhere,
      _count: { id: true },
    });

    const statusDistribution = Object.values(SelectionStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<SelectionStatus, number>);

    if (Array.isArray(statusGroups)) {
      statusGroups.forEach((g: any) => {
        if (g.status) {
          statusDistribution[g.status as SelectionStatus] = g._count?.id ?? g._count ?? 0;
        }
      });
    }

    // 5.5 Status distribution for Golden Applications (Optimized with groupBy)
    const goldenGroups = (prisma.goldenApplication as any).groupBy
      ? await (prisma.goldenApplication as any).groupBy({
          by: ['status'],
          _count: { id: true },
        })
      : [];

    const goldenStatusDistribution = Object.values(GoldenStatus).reduce((acc, status) => {
      acc[status] = 0;
      return acc;
    }, {} as Record<GoldenStatus, number>);

    if (Array.isArray(goldenGroups)) {
      goldenGroups.forEach((g: any) => {
        if (g.status) {
          goldenStatusDistribution[g.status as GoldenStatus] = g._count?.id ?? g._count ?? 0;
        }
      });
    }

    // 6. Total Accepted & Projects Assigned
    const totalAccepted = statusDistribution[SelectionStatus.DITERIMA] || 0;
    const totalAssignedProjects = await prisma.oprecRegistration.count({
      where: {
        ...registrationWhere,
        status: SelectionStatus.DITERIMA,
        assignedProject: { not: null },
      },
    });

    // 7. Recent 5 registrations
    const recentRegistrations = await prisma.oprecRegistration.findMany({
      where: registrationWhere,
      take: 5,
      orderBy: { appliedAt: 'desc' },
      include: {
        candidate: {
          select: {
            id: true,
            fullName: true,
            universitas: true,
            roleInterest: true,
            isGoldenCandidate: true,
          },
        },
      },
    });

    // 8. Available Batches list with applicant counts
    const batchesRaw = await prisma.oprecRegistration.groupBy({
      by: ['batchName'],
      _count: { id: true },
      orderBy: { batchName: 'desc' },
    });

    const batches = batchesRaw.map((b) => ({
      batchName: b.batchName,
      totalApplicants: b._count.id,
      isCurrentActive: b.batchName === currentSetting.currentBatch,
    }));

    return {
      overview: {
        totalCandidates,
        totalGoldenCandidates,
        totalGoldenApplications,
        totalRegistrations,
        totalAccepted,
        totalAssignedProjects,
      },
      recruitmentSetting: {
        isOprecActive: currentSetting.isActive,
        isGoldenCandidateActive: currentSetting.isGoldenCandidateActive,
        currentBatch: currentSetting.currentBatch,
        startDate: currentSetting.startDate,
        endDate: currentSetting.endDate,
      },
      distribution: {
        roleInterest: {
          [RoleInterest.RISET]: risetCount,
          [RoleInterest.MAGANG]: magangCount,
        },
        status: statusDistribution,
        goldenStatus: goldenStatusDistribution,
      },
      batches,
      recentRegistrations: recentRegistrations.map((r) => ({
        id: r.id,
        candidateId: r.candidateId,
        candidateName: r.candidate.fullName,
        universitas: r.candidate.universitas,
        roleInterest: r.candidate.roleInterest,
        isGoldenCandidate: r.candidate.isGoldenCandidate,
        batchName: r.batchName,
        status: r.status,
        assignedProject: r.assignedProject,
        appliedAt: r.appliedAt,
      })),
    };
  }
}
