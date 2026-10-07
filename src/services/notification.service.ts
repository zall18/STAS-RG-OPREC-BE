import { prisma } from '../config/prisma';
import { EmailService } from './email.service';

export class NotificationService {
  /**
   * Send notification to a specific user and alert via email
   */
  static async send(userId: string, title: string, message: string) {
    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
      },
    });

    // Kirim notifikasi via Gmail (Asynchronous non-blocking)
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true },
      });

      if (user && user.email) {
        EmailService.sendNotificationAlertEmail(user.email, title, message).catch((err) => {
          console.error(`[Notification Email Error] Gagal mengirim email ke ${user.email}:`, err);
        });
      }
    } catch (err) {
      console.error('[Notification Email Dispatch Error]:', err);
    }

    return notification;
  }

  /**
   * Get candidate notifications (paginated)
   */
  static async getNotifications(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [total, notifications] = await Promise.all([
      prisma.notification.count({ where: { userId } }),
      prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data: notifications,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Mark a specific notification as read
   */
  static async markAsRead(userId: string, notificationId: string) {
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      const error: any = new Error('Notifikasi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Get total unread count for user
   */
  static async getUnreadCount(userId: string) {
    const count = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return { unreadCount: count };
  }
}
