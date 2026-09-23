import { prisma } from '../src/config/prisma';

async function migrateUserActive() {
  console.log('Running migration: add isActive column to User table...');
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE "public"."User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;`
    );
    console.log('✅ Migration succeeded: "isActive" column exists with default true.');

    // Query sample user to verify
    const sample = await prisma.$queryRawUnsafe<any[]>(
      `SELECT "id", "email", "role", "isActive" FROM "public"."User" LIMIT 3;`
    );
    console.log('Sample users after migration:', sample);
  } catch (err: any) {
    console.error('Migration failed:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

migrateUserActive();
