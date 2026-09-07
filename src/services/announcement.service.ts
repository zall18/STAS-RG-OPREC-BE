import { prisma } from '../config/prisma';
import { CreateAnnouncementInput, UpdateAnnouncementInput } from '../schemas/announcement.schema';
import { ActivityLogService } from './activity-log.service';

export class AnnouncementService {
  /**
   * Create announcement (Admin)
   */
  static async createAnnouncement(authorId: string, input: CreateAnnouncementInput) {
    const announcement = await prisma.announcement.create({
      data: {
        title: input.title,
        content: input.content,
        isActive: input.isActive ?? true,
        authorId,
      },
    });

    await ActivityLogService.record({
      userId: authorId,
      action: 'CREATE_ANNOUNCEMENT',
      targetType: 'ANNOUNCEMENT',
      targetId: announcement.id,
      details: { title: announcement.title },
    });

    return announcement;
  }

  /**
   * Update announcement (Admin)
   */
  static async updateAnnouncement(adminId: string, id: string, input: UpdateAnnouncementInput) {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      const error: any = new Error('Pengumuman tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(input.title !== undefined && { title: input.title }),
        ...(input.content !== undefined && { content: input.content }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
    });

    await ActivityLogService.record({
      userId: adminId,
      action: 'UPDATE_ANNOUNCEMENT',
      targetType: 'ANNOUNCEMENT',
      targetId: id,
      details: input,
    });

    return updated;
  }

  /**
   * Delete announcement (Admin)
   */
  static async deleteAnnouncement(adminId: string, id: string) {
    const announcement = await prisma.announcement.findUnique({
      where: { id },
    });

    if (!announcement) {
      const error: any = new Error('Pengumuman tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    await prisma.announcement.delete({
      where: { id },
    });

    await ActivityLogService.record({
      userId: adminId,
      action: 'DELETE_ANNOUNCEMENT',
      targetType: 'ANNOUNCEMENT',
      targetId: id,
    });

    return { message: 'Pengumuman berhasil dihapus' };
  }

  /**
   * Get active announcements (Public)
   */
  static async getActiveAnnouncements() {
    return prisma.announcement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  /**
   * Get all announcements (Admin)
   */
  static async getAllAnnouncements() {
    return prisma.announcement.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: {
            email: true,
          },
        },
      },
    });
  }
}
