import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

async function checkOrSeedAdmin() {
  console.log('--- Checking Database Connection & Admin Accounts ---');
  try {
    const admins = await prisma.user.findMany({
      where: { role: UserRole.ADMIN },
      select: { id: true, email: true, role: true, createdAt: true },
    });

    if (admins.length > 0) {
      console.log('Found existing admin account(s):');
      admins.forEach((a) => console.log(`- Email: ${a.email} (ID: ${a.id})`));
    } else {
      console.log('No admin found. Creating default admin account...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('AdminStasRg2026!', salt);
      const newAdmin = await prisma.user.create({
        data: {
          email: 'admin@stas-rg.ac.id',
          password: hashedPassword,
          role: UserRole.ADMIN,
        },
      });
      console.log('Successfully created default admin:');
      console.log(`- Email: ${newAdmin.email}`);
      console.log('- Password: AdminStasRg2026!');
    }
  } catch (err: any) {
    console.error('Database connection error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrSeedAdmin();
