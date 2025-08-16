import { supabase } from '../lib/supabase';
import { UploadRequest, UploadResponse, MediaAsset } from '@yardpass/types';

export class UploadService {
  /**
   * Upload a file to Supabase Storage
   */
  static async uploadFile(
    file: File | Blob,
    path: string,
    options?: {
      contentType?: string;
      cacheControl?: string;
    }
  ): Promise<{ path: string; url: string }> {
    try {
      const { data, error } = await supabase.storage
        .from('media')
        .upload(path, file, {
          contentType: options?.contentType,
          cacheControl: options?.cacheControl || '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`Upload failed: ${error.message}`);
      }

      const { data: urlData } = supabase.storage
        .from('media')
        .getPublicUrl(data.path);

      return {
        path: data.path,
        url: urlData.publicUrl,
      };
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload video file and create media asset record
   */
  static async uploadVideo(request: UploadRequest): Promise<UploadResponse> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `videos/${timestamp}-${request.filename}`;
      
      // Upload to Supabase Storage
      const uploadResult = await this.uploadFile(request.file, filename, {
        contentType: 'video/mp4',
        cacheControl: '31536000', // 1 year
      });

      // Create media asset record
      const mediaAsset: Omit<MediaAsset, 'id' | 'created_at' | 'updated_at'> = {
        uploader_id: request.userId,
        org_id: request.orgId,
        type: 'video',
        url: uploadResult.url,
        storage_path: uploadResult.path,
        filename: request.filename,
        file_size: request.file.size,
        mime_type: request.file.type,
        duration: request.duration,
        width: request.width,
        height: request.height,
        thumbnail_url: request.thumbnailUrl,
        metadata: request.metadata || {},
        status: 'processing',
      };

      const { data: asset, error } = await supabase
        .from('media_assets')
        .insert(mediaAsset)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create media asset: ${error.message}`);
      }

      return {
        success: true,
        mediaAsset: asset,
        uploadUrl: uploadResult.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Upload image file and create media asset record
   */
  static async uploadImage(request: UploadRequest): Promise<UploadResponse> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const filename = `images/${timestamp}-${request.filename}`;
      
      // Upload to Supabase Storage
      const uploadResult = await this.uploadFile(request.file, filename, {
        contentType: request.file.type,
        cacheControl: '31536000', // 1 year
      });

      // Create media asset record
      const mediaAsset: Omit<MediaAsset, 'id' | 'created_at' | 'updated_at'> = {
        uploader_id: request.userId,
        org_id: request.orgId,
        type: 'image',
        url: uploadResult.url,
        storage_path: uploadResult.path,
        filename: request.filename,
        file_size: request.file.size,
        mime_type: request.file.type,
        width: request.width,
        height: request.height,
        metadata: request.metadata || {},
        status: 'ready',
      };

      const { data: asset, error } = await supabase
        .from('media_assets')
        .insert(mediaAsset)
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to create media asset: ${error.message}`);
      }

      return {
        success: true,
        mediaAsset: asset,
        uploadUrl: uploadResult.url,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  static async deleteFile(path: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from('media')
        .remove([path]);

      if (error) {
        throw new Error(`Delete failed: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('Delete failed:', error);
      return false;
    }
  }

  /**
   * Get signed URL for private file access
   */
  static async getSignedUrl(path: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabase.storage
        .from('media')
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      throw new Error(`Failed to create signed URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}


