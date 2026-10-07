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

    // Validate if registrationId actually exists in OprecRegistration
    // (Prevents Foreign Key Violation for Golden candidates who don't have an oprec registration)
    let validRegistrationId: string | null = null;
    if (input.registrationId) {
      const reg = await prisma.oprecRegistration.findUnique({
        where: { id: input.registrationId },
      });
      if (reg) {
        validRegistrationId = reg.id;
      }
    }

    const interviewDate = new Date(input.datetime);

    const interview = await prisma.interview.create({
      data: {
        candidateId: candidate.id,
        registrationId: validRegistrationId,
        datetime: interviewDate,
        location: input.location ?? null,
        type: input.type ?? InterviewType.ONLINE,
        link: input.link ?? null,
        status: InterviewStatus.SCHEDULED,
        notes: input.notes ?? null,
        picName: input.picName ?? null,
        picId: input.picId ?? null,
      },
      include: {
        candidate: {
          include: {
            user: { select: { email: true } },
          },
        },
        pic: { select: { id: true, email: true } },
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
          pic: { select: { id: true, email: true } },
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
        ...(input.picName !== undefined && { picName: input.picName }),
        ...(input.picId !== undefined && { picId: input.picId }),
      },
      include: {
        candidate: {
          include: { user: true },
        },
        pic: { select: { id: true, email: true } },
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
        pic: { select: { id: true, email: true } },
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

  /**
   * Candidate requests a reschedule for their interview (Candidate)
   */
  static async requestReschedule(
    userId: string,
    interviewId: string,
    input: { proposedDatetime: string; reason: string }
  ) {
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

    if (
      interview.status === InterviewStatus.CANCELLED ||
      interview.status === InterviewStatus.COMPLETED
    ) {
      const error: any = new Error(
        `Tidak dapat mengajukan reschedule untuk wawancara yang sudah ${interview.status.toLowerCase()}`
      );
      error.statusCode = 400;
      throw error;
    }

    const proposedDate = new Date(input.proposedDatetime);

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.RESCHEDULE_REQUESTED,
        rescheduleProposedDate: proposedDate,
        rescheduleReason: input.reason.trim(),
        adminRescheduleNote: null,
      },
      include: {
        candidate: true,
        pic: { select: { id: true, email: true } },
      },
    });

    await ActivityLogService.record({
      userId,
      action: 'REQUEST_RESCHEDULE',
      targetType: 'INTERVIEW',
      targetId: interviewId,
      details: { proposedDatetime: input.proposedDatetime, reason: input.reason },
    });

    return updated;
  }

  /**
   * Admin approves interview reschedule request (Admin)
   */
  static async approveReschedule(
    adminId: string,
    interviewId: string,
    input: { datetime?: string; notes?: string | null }
  ) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { candidate: { include: { user: true } } },
    });

    if (!interview) {
      const error: any = new Error('Jadwal wawancara tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (interview.status !== InterviewStatus.RESCHEDULE_REQUESTED) {
      const error: any = new Error('Tidak ada permohonan reschedule yang sedang aktif untuk jadwal ini');
      error.statusCode = 400;
      throw error;
    }

    const newDate = input.datetime
      ? new Date(input.datetime)
      : interview.rescheduleProposedDate || interview.datetime;

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        datetime: newDate,
        status: InterviewStatus.SCHEDULED,
        rescheduleProposedDate: null,
        rescheduleReason: null,
        adminRescheduleNote: null,
        ...(input.notes !== undefined && { notes: input.notes }),
      },
      include: {
        candidate: { include: { user: true } },
        pic: { select: { id: true, email: true } },
      },
    });

    if (interview.candidate.userId) {
      const formattedDate = newDate.toLocaleString('id-ID', {
        dateStyle: 'full',
        timeStyle: 'short',
      });
      await NotificationService.send(
        interview.candidate.userId,
        'Permohonan Reschedule Disetujui',
        `Permohonan reschedule jadwal wawancara Anda telah disetujui. Jadwal baru Anda: ${formattedDate}.`
      );
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'APPROVE_RESCHEDULE',
      targetType: 'INTERVIEW',
      targetId: interviewId,
      details: { newDatetime: newDate },
    });

    return updated;
  }

  /**
   * Admin rejects interview reschedule request with note (Admin)
   */
  static async rejectReschedule(
    adminId: string,
    interviewId: string,
    input: { adminNote: string }
  ) {
    const interview = await prisma.interview.findUnique({
      where: { id: interviewId },
      include: { candidate: { include: { user: true } } },
    });

    if (!interview) {
      const error: any = new Error('Jadwal wawancara tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    if (interview.status !== InterviewStatus.RESCHEDULE_REQUESTED) {
      const error: any = new Error('Tidak ada permohonan reschedule yang sedang aktif untuk jadwal ini');
      error.statusCode = 400;
      throw error;
    }

    const updated = await prisma.interview.update({
      where: { id: interviewId },
      data: {
        status: InterviewStatus.RESCHEDULE_REJECTED,
        adminRescheduleNote: input.adminNote.trim(),
      },
      include: {
        candidate: { include: { user: true } },
        pic: { select: { id: true, email: true } },
      },
    });

    if (interview.candidate.userId) {
      await NotificationService.send(
        interview.candidate.userId,
        'Permohonan Reschedule Ditolak',
        `Permohonan reschedule wawancara Anda belum disetujui: "${input.adminNote.trim()}". Harap ajukan kembali ketersediaan waktu wawancara Anda.`
      );
    }

    await ActivityLogService.record({
      userId: adminId,
      action: 'REJECT_RESCHEDULE',
      targetType: 'INTERVIEW',
      targetId: interviewId,
      details: { adminNote: input.adminNote },
    });

    return updated;
  }
}
