import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

async function main() {
  console.log('Connecting to database...');
  const users = await prisma.user.findMany({
    select: { id: true, email: true, role: true, createdAt: true },
  });
  console.log('Current users:', users);

  // 1. Ensure at least 1 ADMIN exists
  let admin = users.find((u) => u.role === UserRole.ADMIN);
  if (!admin) {
    console.log('No admin found. Creating default admin...');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('AdminStasRg2026!', salt);
    admin = await prisma.user.create({
      data: {
        email: 'admin@stas-rg.ac.id',
        password: hashedPassword,
        role: UserRole.ADMIN,
      },
      select: { id: true, email: true, role: true, createdAt: true },
    });
    console.log('Created default admin:', admin.email);
  } else {
    console.log(`Preserving admin: ${admin.email} (ID: ${admin.id})`);
  }

  // 2. Delete all other admins if more than 1, keeping only this one admin
  const otherAdmins = users.filter((u) => u.role === UserRole.ADMIN && u.id !== admin!.id);
  if (otherAdmins.length > 0) {
    console.log(`Cleaning up ${otherAdmins.length} additional admin(s)...`);
    await prisma.user.deleteMany({
      where: { id: { in: otherAdmins.map((a) => a.id) } },
    });
  }

  // 3. Delete all candidate data and non-admin users
  console.log('Deleting all candidate profiles, registrations, interviews, applications, and notes...');
  await prisma.goldenApplication.deleteMany({});
  await prisma.interview.deleteMany({});
  await prisma.adminNote.deleteMany({});
  await prisma.oprecRegistration.deleteMany({});
  await prisma.candidateProfile.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.activityLog.deleteMany({});

  const deletedCandidates = await prisma.user.deleteMany({
    where: {
      id: { not: admin.id },
    },
  });
  console.log(`Deleted ${deletedCandidates.count} candidate users.`);

  const remainingUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  });
  console.log('Remaining users in database:', remainingUsers);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Error during cleanup:', err);
  process.exit(1);
});
