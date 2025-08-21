import { supabase } from '../lib/supabase';
import { UploadRequest, UploadResponse, MediaAsset } from '@yardpass/types';
import { MediaUploadService } from './mediaUpload';
import { MEDIA_CONSTANTS } from '@yardpass/types/media';

export class UploadService {
  /**
   * Upload a file to Supabase Storage (Legacy method - use MediaUploadService for posts)
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
   * Upload media for a post (New method - uses MediaUploadService)
   */
  static async uploadPostMedia(
    postId: string,
    file: File,
    options?: {
      onProgress?: (progress: number) => void;
      onError?: (error: Error) => void;
    }
  ) {
    return MediaUploadService.uploadPostMedia({
      postId,
      file,
      onProgress: options?.onProgress,
      onError: options?.onError
    });
  }

  /**
   * Upload video file and create media asset record (Legacy method)
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
   * Upload image file and create media asset record (Legacy method)
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
   * Delete media from a post (New method - uses MediaUploadService)
   */
  static async deletePostMedia(postId: string) {
    return MediaUploadService.deletePostMedia(postId);
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

  /**
   * Get media upload URL for a post (New method - uses MediaUploadService)
   */
  static async getPostMediaUploadUrl(postId: string, fileName: string, fileType: string = 'image') {
    return MediaUploadService.getUploadUrl(postId, fileName, fileType);
  }

  /**
   * Get media analytics for a user (New method - uses MediaUploadService)
   */
  static async getMediaAnalytics(userId: string, limit: number = 50) {
    return MediaUploadService.getMediaAnalytics(userId, limit);
  }

  /**
   * Get media processing status (New method - uses MediaUploadService)
   */
  static async getMediaProcessingStatus(postId: string) {
    return MediaUploadService.getMediaProcessingStatus(postId);
  }

  /**
   * Health check for upload service
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    try {
      // Test legacy storage bucket access
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      
      if (bucketError) {
        return { status: 'unhealthy', details: { bucketError } };
      }

      // Test new media upload service
      const mediaHealth = await MediaUploadService.healthCheck();
      
      return {
        status: mediaHealth.status === 'healthy' ? 'healthy' : 'unhealthy',
        details: {
          legacyBuckets: buckets?.length || 0,
          mediaService: mediaHealth
        }
      };
    } catch (error) {
      return { status: 'unhealthy', details: { error } };
    }
  }
}


