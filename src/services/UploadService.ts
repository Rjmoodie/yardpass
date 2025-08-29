/**
 * @deprecated This service is deprecated. Use MediaUpload component with apiGateway.uploadMedia() instead.
 * 
 * MIGRATION GUIDE:
 * OLD: import { useUpload } from '@/services/UploadService';
 * NEW: import { MediaUpload } from '@/components/MediaUpload';
 * 
 * Benefits of new approach:
 * - Unified media service
 * - Better error handling
 * - Progress tracking
 * - Support for all media types
 * - Consistent API
 */

// @ts-ignore - Deprecated service, keeping for backward compatibility
import { supabase } from '../integrations/supabase/client';
// @ts-ignore - Deprecated service, keeping for backward compatibility
import * as ImagePicker from 'expo-image-picker';
// @ts-ignore - Deprecated service, keeping for backward compatibility
import * as FileSystem from 'expo-file-system';

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  url: string;
  path: string;
  size: number;
  type: string;
}

export class UploadService {
  private static readonly MAX_IMAGE_SIZE = 25 * 1024 * 1024; // 25MB
  private static readonly MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly MAX_POST_IMAGE_SIZE = 15 * 1024 * 1024; // 15MB
  private static readonly MAX_POST_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

  /**
   * Pick image from gallery or camera
   */
  static async pickImage(options: {
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    mediaTypes?: ImagePicker.MediaTypeOptions;
  } = {}): Promise<string | null> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access camera roll is required!');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        ...options,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error picking image:', error);
      throw error;
    }
  }

  /**
   * Pick video from gallery
   */
  static async pickVideo(): Promise<string | null> {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Permission to access camera roll is required!');
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0].uri;
      }

      return null;
    } catch (error) {
      console.error('Error picking video:', error);
      throw error;
    }
  }

  /**
   * Get file info (size, type, etc.)
   */
  static async getFileInfo(uri: string): Promise<{
    size: number;
    type: string;
    extension: string;
    name: string;
  }> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) {
        throw new Error('File does not exist');
      }

      const extension = uri.split('.').pop()?.toLowerCase() || '';
      const name = uri.split('/').pop() || 'file';
      
      let type = 'application/octet-stream';
      if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
        type = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
      } else if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) {
        type = `video/${extension}`;
      }

      return {
        size: fileInfo.size || 0,
        type,
        extension,
        name,
      };
    } catch (error) {
      console.error('Error getting file info:', error);
      throw error;
    }
  }

  /**
   * Validate file size based on bucket type
   */
  static validateFileSize(size: number, bucketType: 'event-media' | 'avatars' | 'post-media'): boolean {
    switch (bucketType) {
      case 'event-media':
        return size <= this.MAX_IMAGE_SIZE || size <= this.MAX_VIDEO_SIZE;
      case 'avatars':
        return size <= this.MAX_IMAGE_SIZE;
      case 'post-media':
        return size <= this.MAX_POST_IMAGE_SIZE || size <= this.MAX_POST_VIDEO_SIZE;
      default:
        return false;
    }
  }

  /**
   * Upload file to Supabase Storage with progress tracking
   */
  static async uploadFile(
    uri: string,
    bucket: 'event-media' | 'avatars' | 'post-media',
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    try {
      // Get file info
      const fileInfo = await this.getFileInfo(uri);
      
      // Validate file size
      if (!this.validateFileSize(fileInfo.size, bucket)) {
        throw new Error(`File size exceeds limit for ${bucket} bucket`);
      }

      // Generate unique filename
      const timestamp = Date.now();
      const uniquePath = `${path}/${timestamp}_${fileInfo.name}`;

      // Upload file
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(uniquePath, {
          uri,
          type: fileInfo.type,
          name: fileInfo.name,
        }, {
          onUploadProgress: (progress) => {
            if (onProgress) {
              onProgress({
                loaded: progress.loaded,
                total: progress.total,
                percentage: (progress.loaded / progress.total) * 100,
              });
            }
          },
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(uniquePath);

      return {
        url: publicUrl,
        path: uniquePath,
        size: fileInfo.size,
        type: fileInfo.type,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }

  /**
   * Upload event media (images/videos)
   */
  static async uploadEventMedia(
    uri: string,
    eventId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    return this.uploadFile(uri, 'event-media', `events/${eventId}`, onProgress);
  }

  /**
   * Upload avatar image
   */
  static async uploadAvatar(
    uri: string,
    userId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    return this.uploadFile(uri, 'avatars', `users/${userId}`, onProgress);
  }

  /**
   * Upload post media
   */
  static async uploadPostMedia(
    uri: string,
    postId: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    return this.uploadFile(uri, 'post-media', `posts/${postId}`, onProgress);
  }

  /**
   * Delete file from storage
   */
  static async deleteFile(bucket: string, path: string): Promise<void> {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      throw error;
    }
  }

  /**
   * Get file URL (public or signed)
   */
  static getFileUrl(bucket: string, path: string, signed: boolean = false): string {
    if (signed) {
      // For signed URLs, you would need to implement a function to generate them
      // This is a placeholder - you'd need to call your edge function
      return `https://your-project.supabase.co/storage/v1/object/sign/${bucket}/${path}`;
    } else {
      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(path);
      return publicUrl;
    }
  }

  /**
   * Compress image before upload
   */
  static async compressImage(uri: string, quality: number = 0.8): Promise<string> {
    try {
      // This is a placeholder - you'd need to implement image compression
      // You could use expo-image-manipulator for this
      return uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri; // Return original if compression fails
    }
  }

  /**
   * Batch upload multiple files
   */
  static async uploadMultipleFiles(
    files: Array<{ uri: string; bucket: 'event-media' | 'avatars' | 'post-media'; path: string }>,
    onProgress?: (progress: { current: number; total: number; percentage: number }) => void
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const total = files.length;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const result = await this.uploadFile(file.uri, file.bucket, file.path);
        results.push(result);

        if (onProgress) {
          onProgress({
            current: i + 1,
            total,
            percentage: ((i + 1) / total) * 100,
          });
        }
      } catch (error) {
        console.error(`Error uploading file ${i + 1}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Upload with retry logic
   */
  static async uploadWithRetry(
    uri: string,
    bucket: 'event-media' | 'avatars' | 'post-media',
    path: string,
    maxRetries: number = 3,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.uploadFile(uri, bucket, path, onProgress);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Upload attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError!;
  }
}

// Hook for using upload service in components
// @deprecated Use MediaUpload component instead
export const useUpload = () => {
  console.warn('useUpload is deprecated. Use MediaUpload component with apiGateway.uploadMedia() instead.');
  
  const uploadImage = async (
    bucket: 'event-media' | 'avatars' | 'post-media',
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult | null> => {
    console.warn('uploadImage is deprecated. Use MediaUpload component instead.');
    try {
      const uri = await UploadService.pickImage();
      if (!uri) return null;

      return await UploadService.uploadFile(uri, bucket, path, onProgress);
    } catch (error) {
      console.error('Error in uploadImage:', error);
      throw error;
    }
  };

  const uploadVideo = async (
    bucket: 'event-media' | 'avatars' | 'post-media',
    path: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult | null> => {
    console.warn('uploadVideo is deprecated. Use MediaUpload component instead.');
    try {
      const uri = await UploadService.pickVideo();
      if (!uri) return null;

      return await UploadService.uploadFile(uri, bucket, path, onProgress);
    } catch (error) {
      console.error('Error in uploadVideo:', error);
      throw error;
    }
  };

  return {
    uploadImage,
    uploadVideo,
    uploadFile: UploadService.uploadFile.bind(UploadService),
    uploadEventMedia: UploadService.uploadEventMedia.bind(UploadService),
    uploadAvatar: UploadService.uploadAvatar.bind(UploadService),
    uploadPostMedia: UploadService.uploadPostMedia.bind(UploadService),
    deleteFile: UploadService.deleteFile.bind(UploadService),
    getFileUrl: UploadService.getFileUrl.bind(UploadService),
    uploadWithRetry: UploadService.uploadWithRetry.bind(UploadService),
  };
};

