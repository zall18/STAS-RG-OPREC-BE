import { z } from 'zod';

export const createAnnouncementSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Judul pengumuman wajib diisi'),
    content: z.string().min(1, 'Isi pengumuman wajib diisi'),
    isActive: z.boolean().optional().default(true),
  }),
});

export const updateAnnouncementSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID Pengumuman tidak valid'),
  }),
  body: z.object({
    title: z.string().min(1, 'Judul pengumuman tidak boleh kosong').optional(),
    content: z.string().min(1, 'Isi pengumuman tidak boleh kosong').optional(),
    isActive: z.boolean().optional(),
  }),
});

export const announcementIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID Pengumuman tidak valid'),
  }),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>['body'];
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>['body'];
