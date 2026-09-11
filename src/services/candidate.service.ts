import { prisma } from '../config/prisma';
import { UpsertProfileInput, ApplyOprecInput } from '../schemas/candidate.schema';
import { SelectionStatus } from '@prisma/client';
import { SettingService } from './setting.service';

export class CandidateService {
  /**
   * Upsert Candidate Profile
   */
  static async upsertProfile(userId: string, input: UpsertProfileInput) {
    const existingProfile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    const profileData = {
      fullName: input.fullName,
      universitas: input.universitas,
      nim: input.nim,
      programStudi: input.programStudi,
      roleInterest: input.roleInterest,
      cvUrl: input.cvUrl,
      transkripUrl: input.transkripUrl ?? null,
      ipk: input.ipk ?? null,
      semester: input.semester ?? null,
      portfolioUrl: input.portfolioUrl,
      pengalaman: input.pengalaman ?? null,
      // isGoldenCandidate is only set to true once Admin approves/accepts the Golden Application
      isGoldenCandidate: existingProfile?.isGoldenCandidate ?? false,
    };

    const profile = await prisma.candidateProfile.upsert({
      where: { userId },
      update: profileData,
      create: {
        userId,
        ...profileData,
      },
      include: {
        oprecRecords: {
          orderBy: { appliedAt: 'desc' },
        },
        goldenApplications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return profile;
  }

  /**
   * Get Candidate Profile
   */
  static async getProfile(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        oprecRecords: {
          orderBy: { appliedAt: 'desc' },
        },
        goldenApplications: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!profile) {
      const error: any = new Error('Profil kandidat belum diisi');
      error.statusCode = 404;
      throw error;
    }

    return profile;
  }

  /**
   * Apply for active Oprec batch
   */
  static async applyOprec(userId: string, input: ApplyOprecInput) {
    // 1. Check profile existence
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const error: any = new Error('Lengkapi profil kandidat terlebih dahulu sebelum mendaftar Oprec');
      error.statusCode = 400;
      throw error;
    }

    // 2. Validate mandatory fields
    const missingFields: string[] = [];
    if (!profile.fullName) missingFields.push('fullName');
    if (!profile.universitas) missingFields.push('universitas');
    if (!profile.nim) missingFields.push('nim');
    if (!profile.programStudi) missingFields.push('programStudi');
    if (!profile.roleInterest) missingFields.push('roleInterest');
    if (!profile.cvUrl) missingFields.push('cvUrl');
    if (!profile.portfolioUrl) missingFields.push('portfolioUrl');

    if (missingFields.length > 0) {
      const error: any = new Error(
        `Field wajib belum lengkap: ${missingFields.join(', ')}. Harap lengkapi profil terlebih dahulu.`
      );
      error.statusCode = 400;
      throw error;
    }

    // 3. Verify that Oprec is currently active
    const setting = await SettingService.getSetting();
    if (!setting.isActive) {
      const error: any = new Error('Pendaftaran Oprec saat ini sedang ditutup.');
      error.statusCode = 400;
      throw error;
    }

    const targetBatch = input.batchName || setting.currentBatch;

    // 4. Check for duplicate registration in the same batch
    const existingRegistration = await prisma.oprecRegistration.findUnique({
      where: {
        candidateId_batchName: {
          candidateId: profile.id,
          batchName: targetBatch,
        },
      },
    });

    if (existingRegistration) {
      const error: any = new Error(`Anda sudah terdaftar pada batch ${targetBatch}`);
      error.statusCode = 409;
      throw error;
    }

    // Try to find matching Batch record for relational reference
    const batchRecord = (prisma as any).batch
      ? await prisma.batch.findUnique({
          where: { name: targetBatch },
        })
      : null;


    // 5. Create registration record
    const registration = await prisma.oprecRegistration.create({
      data: {
        candidateId: profile.id,
        batchName: targetBatch,
        batchId: batchRecord?.id ?? null,
        status: SelectionStatus.PENDING,
      },
      include: {
        candidate: true,
      },
    });

    return registration;
  }

  /**
   * Get all historical registrations of candidate
   */
  static async getRegistrations(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const error: any = new Error('Profil kandidat belum diisi');
      error.statusCode = 404;
      throw error;
    }

    return prisma.oprecRegistration.findMany({
      where: { candidateId: profile.id },
      orderBy: { appliedAt: 'desc' },
      include: {
        batch: true,
        goldenApplication: true,
        interviews: true,
      },
    });
  }
}

