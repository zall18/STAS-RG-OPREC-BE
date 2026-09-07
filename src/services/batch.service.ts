import { prisma } from '../config/prisma';
import { CreateBatchInput, UpdateBatchInput } from '../schemas/batch.schema';
import { SettingService } from './setting.service';
import { ActivityLogService } from './activity-log.service';

export class BatchService {
  /**
   * Create a new recruitment batch
   */
  static async createBatch(adminId: string, input: CreateBatchInput) {
    const existing = await prisma.batch.findUnique({
      where: { name: input.name },
    });

    if (existing) {
      const error: any = new Error(`Batch dengan nama "${input.name}" sudah ada`);
      error.statusCode = 409;
      throw error;
    }

    const batch = await prisma.batch.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        quota: input.quota ?? null,
        isActive: input.isActive ?? false,
      },
    });

    if (batch.isActive) {
      await this.activateBatch(adminId, batch.id);
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'CREATE_BATCH',
      targetType: 'BATCH',
      targetId: batch.id,
      details: { name: batch.name, quota: batch.quota },
    });

    return batch;
  }

  /**
   * Get list of all batches with basic candidate counts
   */
  static async getBatches() {
    const batches = await prisma.batch.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { registrations: true },
        },
      },
    });

    return batches.map((b) => ({
      id: b.id,
      name: b.name,
      description: b.description,
      startDate: b.startDate,
      endDate: b.endDate,
      quota: b.quota,
      isActive: b.isActive,
      isArchived: b.isArchived,
      totalApplicants: b._count.registrations,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }));
  }

  /**
   * Get single batch detail + aggregated statistics
   */
  static async getBatchById(id: string) {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        registrations: {
          include: {
            candidate: {
              select: {
                roleInterest: true,
                isGoldenCandidate: true,
              },
            },
          },
        },
      },
    });

    if (!batch) {
      const error: any = new Error('Batch tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Calculate detailed statistics
    const totalApplicants = batch.registrations.length;
    const statusBreakdown: Record<string, number> = {};
    const roleBreakdown: Record<string, number> = { RISET: 0, MAGANG: 0 };
    let goldenCount = 0;

    batch.registrations.forEach((reg) => {
      statusBreakdown[reg.status] = (statusBreakdown[reg.status] || 0) + 1;
      if (reg.candidate?.roleInterest) {
        roleBreakdown[reg.candidate.roleInterest] =
          (roleBreakdown[reg.candidate.roleInterest] || 0) + 1;
      }
      if (reg.candidate?.isGoldenCandidate) {
        goldenCount++;
      }
    });

    return {
      batch: {
        id: batch.id,
        name: batch.name,
        description: batch.description,
        startDate: batch.startDate,
        endDate: batch.endDate,
        quota: batch.quota,
        isActive: batch.isActive,
        isArchived: batch.isArchived,
        createdAt: batch.createdAt,
        updatedAt: batch.updatedAt,
      },
      stats: {
        totalApplicants,
        quota: batch.quota,
        remainingQuota: batch.quota ? Math.max(0, batch.quota - (statusBreakdown['DITERIMA'] || 0)) : null,
        goldenCandidates: goldenCount,
        statusBreakdown,
        roleBreakdown,
      },
    };
  }

  /**
   * Update batch details
   */
  static async updateBatch(adminId: string, id: string, input: UpdateBatchInput) {
    const batch = await prisma.batch.findUnique({ where: { id } });

    if (!batch) {
      const error: any = new Error('Batch tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (input.name && input.name !== batch.name) {
      const nameConflict = await prisma.batch.findUnique({
        where: { name: input.name },
      });
      if (nameConflict) {
        const error: any = new Error(`Batch dengan nama "${input.name}" sudah ada`);
        error.statusCode = 409;
        throw error;
      }
    }

    const updated = await prisma.batch.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.startDate !== undefined && {
          startDate: input.startDate ? new Date(input.startDate) : null,
        }),
        ...(input.endDate !== undefined && {
          endDate: input.endDate ? new Date(input.endDate) : null,
        }),
        ...(input.quota !== undefined && { quota: input.quota }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    if (input.isActive) {
      await this.activateBatch(adminId, id);
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'UPDATE_BATCH',
      targetType: 'BATCH',
      targetId: id,
      details: input,
    });

    return updated;
  }

  /**
   * Delete or archive batch
   */
  static async deleteBatch(adminId: string, id: string) {
    const batch = await prisma.batch.findUnique({
      where: { id },
      include: {
        _count: { select: { registrations: true } },
      },
    });

    if (!batch) {
      const error: any = new Error('Batch tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // If batch already has registrations, archive it instead of hard deleting
    if (batch._count.registrations > 0) {
      const archived = await prisma.batch.update({
        where: { id },
        data: {
          isArchived: true,
          isActive: false,
        },
      });

      await ActivityLogService.record({
        userId: adminId,
        action: 'ARCHIVE_BATCH',
        targetType: 'BATCH',
        targetId: id,
        details: { reason: 'Has applicants, archived instead of deleted' },
      });

      return {
        action: 'archived',
        message: 'Batch memiliki data pendaftar sehingga berhasil diarsipkan',
        batch: archived,
      };
    }

    await prisma.batch.delete({ where: { id } });

    await ActivityLogService.record({
      userId: adminId,
      action: 'DELETE_BATCH',
      targetType: 'BATCH',
      targetId: id,
    });

    return {
      action: 'deleted',
      message: 'Batch berhasil dihapus',
    };
  }

  /**
   * Set this batch as active and deactivate all others
   */
  static async activateBatch(adminId: string, id: string) {
    const batch = await prisma.batch.findUnique({ where: { id } });

    if (!batch) {
      const error: any = new Error('Batch tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    // Deactivate all other batches
    await prisma.batch.updateMany({
      where: { id: { not: id } },
      data: { isActive: false },
    });

    // Activate the targeted batch
    const activated = await prisma.batch.update({
      where: { id },
      data: {
        isActive: true,
        isArchived: false,
      },
    });

    // Synchronize with dynamic RecruitmentSetting for backward compatibility
    await SettingService.updateSetting({
      isActive: true,
      currentBatch: activated.name,
      startDate: activated.startDate ? activated.startDate.toISOString() : undefined,
      endDate: activated.endDate ? activated.endDate.toISOString() : undefined,
      description: activated.description ?? undefined,
    });

    await ActivityLogService.record({
      userId: adminId,
      action: 'ACTIVATE_BATCH',
      targetType: 'BATCH',
      targetId: id,
      details: { name: activated.name },
    });

    return activated;
  }
}
