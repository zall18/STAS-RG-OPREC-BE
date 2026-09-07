import { prisma } from '../config/prisma';
import { CreateInterviewInput, UpdateInterviewInput } from '../schemas/interview.schema';
import { InterviewStatus, InterviewType } from '@prisma/client';
import { AdminService } from './admin.service';
import { NotificationService } from './notification.service';
import { ActivityLogService } from './activity-log.service';

export interface GetInterviewsFilter {
  batch?: string;
  status?: InterviewStatus;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export class InterviewService {
  /**
   * Create new interview schedule for candidate (Admin)
   */
  static async createInterview(adminId: string, input: CreateInterviewInput) {
    const candidate = await AdminService.getCandidateById(input.candidateId);

    const interviewDate = new Date(input.datetime);

    const interview = await prisma.interview.create({
      data: {
        candidateId: candidate.id,
        registrationId: input.registrationId ?? null,
        datetime: interviewDate,
        location: input.location ?? null,
        type: input.type ?? InterviewType.ONLINE,
        link: input.link ?? null,
        status: InterviewStatus.SCHEDULED,
        notes: input.notes ?? null,
      },
      include: {
        candidate: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
    });

    // Notify candidate
    if (candidate.userId) {
      const formattedDate = interviewDate.toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
      await NotificationService.send(
        candidate.userId,
        'Jadwal Wawancara Baru',
        `Anda memiliki jadwal wawancara pada ${formattedDate} (${interview.type}). Silakan konfirmasi kehadiran Anda.`
      );
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'SCHEDULE_INTERVIEW',
      targetType: 'INTERVIEW',
      targetId: interview.id,
      details: { candidateId: candidate.id, datetime: input.datetime },
    });

    return interview;
  }

  /**
   * List all interviews with filters (Admin)
   */
  static async getAdminInterviews(filter: GetInterviewsFilter) {
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.status) {
      where.status = filter.status;
    }

    if (filter.startDate || filter.endDate) {
      where.datetime = {};
      if (filter.startDate) where.datetime.gte = new Date(filter.startDate);
      if (filter.endDate) where.datetime.lte = new Date(filter.endDate);
    }

    if (filter.batch) {
      where.registration = {
        batchName: { contains: filter.batch, mode: 'insensitive' },
      };
    }

    const [total, interviews] = await Promise.all([
      prisma.interview.count({ where }),
      prisma.interview.findMany({
        where,
        skip,
        take: limit,
        orderBy: { datetime: 'asc' },
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
          registration: true,
        },
      }),
    ]);

    return {
      data: interviews,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Update interview schedule details (Admin)
   */
  static async updateInterview(adminId: string, id: string, input: UpdateInterviewInput) {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { candidate: true },
    });

    if (!interview) {
      const error: any = new Error('Jadwal wawancara tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.interview.update({
      where: { id },
      data: {
        ...(input.datetime && { datetime: new Date(input.datetime) }),
        ...(input.location !== undefined && { location: input.location }),
        ...(input.type !== undefined && { type: input.type }),
        ...(input.link !== undefined && { link: input.link }),
        ...(input.status !== undefined && { status: input.status }),
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      include: {
        candidate: {
          include: { user: true },
        },
      },
    });

    // Notify candidate if date/location/link changed
    if (interview.candidate.userId && (input.datetime || input.location || input.link)) {
      await NotificationService.send(
        interview.candidate.userId,
        'Perubahan Jadwal Wawancara',
        `Jadwal wawancara Anda telah diperbarui. Silakan periksa detail jadwal terbaru di portal Anda.`
      );
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'UPDATE_INTERVIEW',
      targetType: 'INTERVIEW',
      targetId: id,
      details: input,
    });

    return updated;
  }

  /**
   * Cancel interview schedule (Admin)
   */
  static async cancelInterview(adminId: string, id: string) {
    const interview = await prisma.interview.findUnique({
      where: { id },
      include: { candidate: true },
    });

    if (!interview) {
      const error: any = new Error('Jadwal wawancara tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const cancelled = await prisma.interview.update({
      where: { id },
      data: { status: InterviewStatus.CANCELLED },
    });

    if (interview.candidate.userId) {
      await NotificationService.send(
        interview.candidate.userId,
        'Jadwal Wawancara Dibatalkan',
        'Jadwal wawancara Anda telah dibatalkan oleh pihak administrator. Kami akan menghubungi Anda kembali untuk informasi lebih lanjut.'
      );
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'CANCEL_INTERVIEW',
      targetType: 'INTERVIEW',
      targetId: id,
    });

    return cancelled;
  }

  /**
   * Get Candidate's interviews (Candidate)
   */
  static async getCandidateInterviews(userId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const error: any = new Error('Profil kandidat belum diisi');
      error.statusCode = 404;
      throw error;
    }

    return prisma.interview.findMany({
      where: { candidateId: profile.id },
      orderBy: { datetime: 'asc' },
      include: {
        registration: true,
      },
    });
  }

  /**
   * Candidate confirms attendance for interview (Candidate)
   */
  static async confirmInterview(userId: string, interviewId: string) {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      const error: any = new Error('Profil kandidat tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const interview = await prisma.interview.findFirst({
      where: { id: interviewId, candidateId: profile.id },
    });

    if (!interview) {
      const error: any = new Error('Jadwal wawancara tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (interview.status === InterviewStatus.CANCELLED) {
      const error: any = new Error('Tidak dapat mengonfirmasi jadwal yang sudah dibatalkan');
      error.statusCode = 400;
      throw error;
    }

    const confirmed = await prisma.interview.update({
      where: { id: interviewId },
      data: { status: InterviewStatus.CONFIRMED },
    });

    await ActivityLogService.record({
      userId,
      action: 'CONFIRM_INTERVIEW',
      targetType: 'INTERVIEW',
      targetId: interviewId,
    });

    return confirmed;
  }
}
