import { prisma } from '../config/prisma';
import { SubmitGoldenAppInput, UpdateGoldenAppInput } from '../schemas/golden.schema';
import { SelectionStatus } from '@prisma/client';
import { ActivityLogService } from './activity-log.service';

export class GoldenService {
  /**
   * Submit new Golden Candidate Application
   */
  static async submitApplication(userId: string, input: SubmitGoldenAppInput) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const error: any = new Error('Lengkapi profil kandidat terlebih dahulu sebelum mengajukan Golden Application');
      error.statusCode = 400;
      throw error;
    }

    // Check if an application already exists
    const existing = await prisma.goldenApplication.findFirst({
      where: { candidateId: profile.id },
    });

    if (existing) {
      const error: any = new Error('Anda sudah pernah mengajukan Golden Application');
      error.statusCode = 409;
      throw error;
    }

    // Ensure candidate is marked as Golden
    await prisma.candidateProfile.update({
      where: { id: profile.id },
      data: { isGoldenCandidate: true },
    });

    const application = await prisma.goldenApplication.create({
      data: {
        candidateId: profile.id,
        registrationId: input.registrationId ?? null,
        motivasi: input.motivasi,
        pencapaian: input.pencapaian,
        rekomendasi: input.rekomendasi ?? null,
        status: SelectionStatus.PENDING,
      },
      include: {
        candidate: true,
      },
    });

    await ActivityLogService.record({
      userId,
      action: 'SUBMIT_GOLDEN_APP',
      targetType: 'GOLDEN_APPLICATION',
      targetId: application.id,
    });

    return application;
  }

  /**
   * Get Candidate's Golden Application
   */
  static async getApplication(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const error: any = new Error('Profil kandidat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const application = await prisma.goldenApplication.findFirst({
      where: { candidateId: profile.id },
      orderBy: { createdAt: 'desc' },
      include: {
        registration: true,
      },
    });

    if (!application) {
      const error: any = new Error('Belum ada Golden Application yang diajukan');
      error.statusCode = 404;
      throw error;
    }

    return application;
  }

  /**
   * Update Golden Application (Only permitted if status is still PENDING)
   */
  static async updateApplication(userId: string, input: UpdateGoldenAppInput) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const error: any = new Error('Profil kandidat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const application = await prisma.goldenApplication.findFirst({
      where: { candidateId: profile.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!application) {
      const error: any = new Error('Golden Application tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (application.status !== SelectionStatus.PENDING) {
      const error: any = new Error(
        `Aplikasi tidak dapat diubah karena sedang dalam proses atau sudah diputuskan (Status: ${application.status})`
      );
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.goldenApplication.update({
      where: { id: application.id },
      data: {
        ...(input.motivasi !== undefined && { motivasi: input.motivasi }),
        ...(input.pencapaian !== undefined && { pencapaian: input.pencapaian }),
        ...(input.rekomendasi !== undefined && { rekomendasi: input.rekomendasi }),
      },
    });

    await ActivityLogService.record({
      userId,
      action: 'UPDATE_GOLDEN_APP',
      targetType: 'GOLDEN_APPLICATION',
      targetId: application.id,
    });

    return updated;
  }
}
