import { supabase } from '../../lib/supabase';
import { BaseService } from './base/BaseService';
import { ApiResponse } from '@yardpass/types';
import { 
  MediaUploadOptions, 
  MediaUploadResult, 
  MediaDeleteResult, 
  MediaUploadUrlResult,
  MediaProcessingStatus,
  MediaAnalytics,
  MediaFileType,
  MediaFileValidation,
  MEDIA_CONSTANTS 
} from '@yardpass/types/media';

// Types are now imported from @yardpass/types/media

export class MediaUploadService extends BaseService {
  // Constants are now imported from MEDIA_CONSTANTS

  /**
   * Upload media for a post
   */
  static async uploadPostMedia(options: MediaUploadOptions): Promise<ApiResponse<MediaUploadResult>> {
    return this.withPerformanceMonitoring(async () => {
      const { postId, file, onProgress, onError } = options;
      const startTime = Date.now();

      try {
        // Validate file
        const validation = this.validateFile(file);
        if (!validation.isValid) {
          throw new Error(validation.error);
        }

        // Get upload URL from database
        const { data: uploadData, error: uploadError } = await supabase.rpc('get_media_upload_url', {
          post_id: postId,
          file_name: file.name,
          file_type: this.getFileType(file.type)
        });

        if (uploadError) throw uploadError;
        if (!uploadData?.success) throw new Error('Failed to get upload URL');

        // Upload file to storage
        const { data: uploadResult, error: storageError } = await supabase.storage
          .from(MEDIA_CONSTANTS.STORAGE_BUCKET)
          .upload(uploadData.media_path, file, {
            cacheControl: MEDIA_CONSTANTS.CACHE_CONTROL,
            upsert: false,
            onUploadProgress: (progress) => {
              if (onProgress) {
                const percentage = (progress.loaded / progress.total) * 100;
                onProgress(percentage);
              }
            }
          });

        if (storageError) throw storageError;

        // Update post with media information
        const { data: updateResult, error: updateError } = await supabase.rpc('upload_post_media', {
          post_id: postId,
          file_name: file.name,
          file_type: this.getFileType(file.type),
          file_size: file.size,
          mime_type: file.type
        });

        if (updateError) throw updateError;
        if (!updateResult?.success) throw new Error('Failed to update post with media');

        // Track analytics
        const uploadDuration = Date.now() - startTime;
        await this.trackMediaUpload(postId, file.size, file.type, uploadDuration);

        const result: MediaUploadResult = {
          success: true,
          postId,
          mediaPath: uploadData.media_path,
          mediaUrl: updateResult.media_url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          uploadDuration
        };

        return this.formatResponse(result);

      } catch (error) {
        if (onError) onError(error as Error);
        throw error;
      }
    }, 'MediaUploadService', 'uploadPostMedia');
  }

  /**
   * Delete media from a post
   */
  static async deletePostMedia(postId: string): Promise<ApiResponse<MediaDeleteResult>> {
    return this.withPerformanceMonitoring(async () => {
      // Get media information from database
      const { data: deleteResult, error: deleteError } = await supabase.rpc('delete_post_media', {
        post_id: postId
      });

      if (deleteError) throw deleteError;
      if (!deleteResult?.success) throw new Error('Failed to delete media from database');

      // Delete file from storage
      if (deleteResult.media_path) {
        const { error: storageError } = await supabase.storage
          .from(MEDIA_CONSTANTS.STORAGE_BUCKET)
          .remove([deleteResult.media_path]);

        if (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
          // Don't throw error as database record is already updated
        }
      }

      return this.formatResponse(deleteResult);
    }, 'MediaUploadService', 'deletePostMedia');
  }

  /**
   * Get media upload URL for direct upload
   */
  static async getUploadUrl(postId: string, fileName: string, fileType: string = 'image'): Promise<ApiResponse<any>> {
    return this.withPerformanceMonitoring(async () => {
      const { data, error } = await supabase.rpc('get_media_upload_url', {
        post_id: postId,
        file_name: fileName,
        file_type: fileType
      });

      if (error) throw error;
      return this.formatResponse(data);
    }, 'MediaUploadService', 'getUploadUrl');
  }

  /**
   * Upload multiple media files for a post
   */
  static async uploadMultipleMedia(postId: string, files: File[]): Promise<ApiResponse<MediaUploadResult[]>> {
    return this.withPerformanceMonitoring(async () => {
      const results: MediaUploadResult[] = [];
      const errors: Error[] = [];

      // Upload files in parallel with concurrency limit
      const chunks = this.chunkArray(files, MEDIA_CONSTANTS.CONCURRENCY_LIMIT);

      for (const chunk of chunks) {
        const chunkPromises = chunk.map(async (file) => {
          try {
            const result = await this.uploadPostMedia({ postId, file });
            return result.data;
          } catch (error) {
            errors.push(error as Error);
            return null;
          }
        });

        const chunkResults = await Promise.all(chunkPromises);
        results.push(...chunkResults.filter(Boolean));
      }

      if (errors.length > 0) {
        console.warn('Some media uploads failed:', errors);
      }

      return this.formatResponse(results);
    }, 'MediaUploadService', 'uploadMultipleMedia');
  }

  /**
   * Get media processing status
   */
  static async getMediaProcessingStatus(postId: string): Promise<ApiResponse<any>> {
    return this.withPerformanceMonitoring(async () => {
      const { data, error } = await supabase
        .from('media_processing_queue')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;
      return this.formatResponse(data);
    }, 'MediaUploadService', 'getMediaProcessingStatus');
  }

  /**
   * Get media analytics for a user
   */
  static async getMediaAnalytics(userId: string, limit: number = 50): Promise<ApiResponse<any>> {
    return this.withPerformanceMonitoring(async () => {
      const { data, error } = await supabase
        .from('media_analytics')
        .select(`
          *,
          post:posts(
            id,
            content,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return this.formatResponse(data);
    }, 'MediaUploadService', 'getMediaAnalytics');
  }

  /**
   * Validate file before upload
   */
  private static validateFile(file: File): MediaFileValidation {
    if (!file) {
      return {
        isValid: false,
        error: 'No file provided',
        fileType: 'file',
        size: 0,
        mimeType: ''
      };
    }

    if (file.size > MEDIA_CONSTANTS.MAX_FILE_SIZE) {
      return {
        isValid: false,
        error: `File size exceeds maximum limit of ${MEDIA_CONSTANTS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
        fileType: this.getFileType(file.type),
        size: file.size,
        mimeType: file.type
      };
    }

    if (!MEDIA_CONSTANTS.ALLOWED_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${MEDIA_CONSTANTS.ALLOWED_TYPES.join(', ')}`,
        fileType: this.getFileType(file.type),
        size: file.size,
        mimeType: file.type
      };
    }

    return {
      isValid: true,
      fileType: this.getFileType(file.type),
      size: file.size,
      mimeType: file.type
    };
  }

  /**
   * Get file type category
   */
  private static getFileType(mimeType: string): MediaFileType {
    if (MEDIA_CONSTANTS.ALLOWED_IMAGE_TYPES.includes(mimeType)) {
      return 'image';
    } else if (MEDIA_CONSTANTS.ALLOWED_VIDEO_TYPES.includes(mimeType)) {
      return 'video';
    }
    return 'file';
  }

  /**
   * Track media upload analytics
   */
  private static async trackMediaUpload(postId: string, fileSize: number, mimeType: string, uploadDuration: number): Promise<void> {
    try {
      await supabase.rpc('track_media_upload', {
        post_id: postId,
        file_size: fileSize,
        mime_type: mimeType,
        upload_duration_ms: uploadDuration
      });
    } catch (error) {
      console.warn('Failed to track media upload analytics:', error);
    }
  }

  /**
   * Split array into chunks for concurrency control
   */
  private static chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Get file preview URL
   */
  static getFilePreviewUrl(filePath: string): string {
    return `${supabase.supabaseUrl}/storage/v1/object/public/${MEDIA_CONSTANTS.STORAGE_BUCKET}/${filePath}`;
  }

  /**
   * Get optimized image URL with transformations
   */
  static getOptimizedImageUrl(filePath: string, width: number = 800, height?: number): string {
    const baseUrl = this.getFilePreviewUrl(filePath);
    const params = new URLSearchParams({
      width: width.toString(),
      quality: '80'
    });
    
    if (height) {
      params.append('height', height.toString());
    }
    
    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Health check for media upload service
   */
  static async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    return this.withPerformanceMonitoring(async () => {
      try {
        // Test storage bucket access
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        
        if (bucketError) {
          return { status: 'unhealthy', details: { bucketError } };
        }

        // Test database function access
        const { error: functionError } = await supabase.rpc('generate_media_path', {
          user_id: '00000000-0000-0000-0000-000000000000',
          file_name: 'test.jpg',
          file_type: 'image'
        });

        if (functionError) {
          return { status: 'unhealthy', details: { functionError } };
        }

        return { status: 'healthy', details: { buckets: buckets?.length || 0 } };
      } catch (error) {
        return { status: 'unhealthy', details: { error } };
      }
    }, 'MediaUploadService', 'healthCheck');
  }
}
