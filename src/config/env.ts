import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('5000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().default('super-secret-stas-rg-jwt-token-key-change-in-production'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SUPABASE_URL: z.string().default('https://mock-project.supabase.co'),
  SUPABASE_ANON_KEY: z.string().default('mock-anon-key'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().default('mock-service-role-key'),
  SUPABASE_STORAGE_BUCKET: z.string().default('documents'),
  OPREC_IS_ACTIVE: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),
  CURRENT_OPREC_BATCH: z.string().default('Oprec Batch 1 - 2026'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

export const env = parsed.success
  ? parsed.data
  : {
      PORT: '5000',
      NODE_ENV: 'test' as const,
      DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/stas_rg_test',
      DIRECT_URL: undefined,
      JWT_SECRET: 'test-jwt-secret',
      JWT_EXPIRES_IN: '7d',
      SUPABASE_URL: 'https://mock.supabase.co',
      SUPABASE_ANON_KEY: 'mock-key',
      SUPABASE_SERVICE_ROLE_KEY: 'mock-service-key',
      SUPABASE_STORAGE_BUCKET: 'documents',
      OPREC_IS_ACTIVE: true,
      CURRENT_OPREC_BATCH: 'Oprec Batch 1 - 2026',
    };
