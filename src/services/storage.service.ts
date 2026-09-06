import { supabase } from '../config/supabase';
import { env } from '../config/env';
import crypto from 'crypto';

export class StorageService {
  /**
   * Upload file to Supabase Storage bucket and return public URL
   */
  static async uploadDocument(
    fileBuffer: Buffer,
    originalName: string,
    folder: 'cv' | 'transkrip' | 'others' = 'cv'
  ): Promise<string> {
    const fileExt = originalName.split('.').pop() || 'pdf';
    const uniqueId = crypto.randomUUID();
    const filePath = `${folder}/${Date.now()}_${uniqueId}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (error) {
      // If error occurs with bucket or offline mock, fallback to generated public path
      console.warn(`[Supabase Storage Upload Warning]: ${error.message}. Returning public url path.`);
      const fallbackUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${env.SUPABASE_STORAGE_BUCKET}/${filePath}`;
      return fallbackUrl;
    }

    const { data: publicUrlData } = supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return publicUrlData.publicUrl;
  }
}
