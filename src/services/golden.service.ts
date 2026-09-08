import { prisma } from '../config/prisma';
import { SubmitGoldenAppInput, UpdateGoldenAppInput } from '../schemas/golden.schema';
import { GoldenStatus } from '@prisma/client';
import { ActivityLogService } from './activity-log.service';
import { NotificationService } from './notification.service';

export class GoldenService {
  /**
   * Submit new Golden Candidate Application
   * Note: isGoldenCandidate remains false until approved by Admin
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

    const application = await prisma.goldenApplication.create({
      data: {
        candidateId: profile.id,
        registrationId: input.registrationId ?? null,
        motivasi: input.motivasi,
        pencapaian: input.pencapaian,
        rekomendasi: input.rekomendasi ?? null,
        status: GoldenStatus.PENDING,
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

    if (application.status !== GoldenStatus.PENDING) {
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

  /**
   * Update Golden Application status (Admin only)
   * Marks isGoldenCandidate = true ONLY IF status === ACCEPTED
   */
  static async updateGoldenStatus(adminId: string, identifier: string, status: GoldenStatus) {
    // 1. Try finding by GoldenApplication.id
    let application = await prisma.goldenApplication.findUnique({
      where: { id: identifier },
      include: { candidate: true },
    });

    // 2. Try finding by registrationId
    if (!application) {
      application = await prisma.goldenApplication.findFirst({
        where: { registrationId: identifier },
        include: { candidate: true },
      });
    }

    // 3. Try finding by candidateId (CandidateProfile.id)
    if (!application) {
      application = await prisma.goldenApplication.findFirst({
        where: { candidateId: identifier },
        orderBy: { createdAt: 'desc' },
        include: { candidate: true },
      });
    }

    // 4. Try finding by userId
    if (!application) {
      const profile = await prisma.candidateProfile.findUnique({
        where: { userId: identifier },
      });
      if (profile) {
        application = await prisma.goldenApplication.findFirst({
          where: { candidateId: profile.id },
          orderBy: { createdAt: 'desc' },
          include: { candidate: true },
        });
      }
    }

    if (!application) {
      const error: any = new Error('Aplikasi Golden Candidate tidak ditemukan untuk kandidat/registrasi ini');
      error.statusCode = 404;
      throw error;
    }

    // Update Golden Application status
    const updated = await prisma.goldenApplication.update({
      where: { id: application.id },
      data: { status },
      include: {
        candidate: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    // isGoldenCandidate becomes true only when ACCEPTED
    const isAccepted = status === GoldenStatus.ACCEPTED;
    await prisma.candidateProfile.update({
      where: { id: application.candidateId },
      data: { isGoldenCandidate: isAccepted },
    });

    // Notify candidate
    if (application.candidate.userId) {
      const message =
        status === GoldenStatus.ACCEPTED
          ? 'Selamat! Aplikasi Jalur Golden Candidate Anda telah DITERIMA.'
          : status === GoldenStatus.REJECTED
          ? 'Mohon maaf, aplikasi Jalur Golden Candidate Anda belum dapat diterima.'
          : status === GoldenStatus.REVIEW
          ? 'Aplikasi Jalur Golden Candidate Anda saat ini sedang dalam tahap REVIEW oleh tim penilai.'
          : `Status aplikasi Jalur Golden Candidate Anda telah diperbarui menjadi: ${status}.`;

      await NotificationService.send(
        application.candidate.userId,
        'Pembaruan Status Golden Candidate',
        message
      );
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'UPDATE_GOLDEN_STATUS',
      targetType: 'GOLDEN_APPLICATION',
      targetId: application.id,
      details: { status, candidateId: application.candidateId, isGoldenCandidate: isAccepted },
    });

    return updated;
  }
}
