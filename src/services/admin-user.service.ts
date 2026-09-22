import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';
import { CreateAdminInput } from '../schemas/admin-user.schema';
import { ActivityLogService } from './activity-log.service';

export class AdminUserService {
  /**
   * Get list of all admin users
   */
  static async getAdmins() {
    return prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create a new administrator account
   */
  static async createAdmin(creatorAdminId: string, input: CreateAdminInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existingUser) {
      const error: any = new Error('Email sudah terdaftar pada sistem');
      error.statusCode = 409;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(input.password, salt);

    const newAdmin = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await ActivityLogService.record({
      userId: creatorAdminId,
      action: 'CREATE_ADMIN',
      targetType: 'USER',
      targetId: newAdmin.id,
      details: { email: newAdmin.email },
    });

    return newAdmin;
  }

  /**
   * Delete an admin account with safeguards:
   * 1. Admin cannot delete self
   * 2. Cannot delete the last remaining admin
   */
  static async deleteAdmin(currentAdminId: string, targetAdminId: string) {
    if (currentAdminId === targetAdminId) {
      const error: any = new Error('Anda tidak dapat menghapus akun admin Anda sendiri');
      error.statusCode = 400;
      throw error;
    }

    const targetAdmin = await prisma.user.findFirst({
      where: { id: targetAdminId, role: UserRole.ADMIN },
    });

    if (!targetAdmin) {
      const error: any = new Error('Akun admin yang akan dihapus tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const totalAdmins = await prisma.user.count({
      where: { role: UserRole.ADMIN },
    });

    if (totalAdmins <= 1) {
      const error: any = new Error('Tidak dapat menghapus admin: minimal harus tersisa satu admin aktif pada sistem');
      error.statusCode = 400;
      throw error;
    }

    await prisma.user.delete({
      where: { id: targetAdminId },
    });

    await ActivityLogService.record({
      userId: currentAdminId,
      action: 'DELETE_ADMIN',
      targetType: 'USER',
      targetId: targetAdminId,
      details: { deletedEmail: targetAdmin.email },
    });

    return {
      message: `Akun admin (${targetAdmin.email}) berhasil dihapus`,
    };
  }

  /**
   * Reset / update an admin user password
   */
  static async resetPassword(currentAdminId: string, targetAdminId: string, newPassword: string) {
    const targetAdmin = await prisma.user.findFirst({
      where: { id: targetAdminId, role: UserRole.ADMIN },
    });

    if (!targetAdmin) {
      const error: any = new Error('Akun admin tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await prisma.user.update({
      where: { id: targetAdminId },
      data: { password: hashedPassword },
    });

    await ActivityLogService.record({
      userId: currentAdminId,
      action: 'RESET_ADMIN_PASSWORD',
      targetType: 'USER',
      targetId: targetAdminId,
      details: { email: targetAdmin.email },
    });

    return {
      message: `Password akun admin (${targetAdmin.email}) berhasil diperbarui`,
    };
  }
}
