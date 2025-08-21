import { useState, useCallback } from 'react';
import { MediaUploadService, MediaUploadOptions, MediaUploadResult } from '@yardpass/api/services/mediaUpload';

export interface UseMediaUploadOptions {
  onSuccess?: (result: MediaUploadResult) => void;
  onError?: (error: Error) => void;
  onProgress?: (progress: number) => void;
}

export interface UseMediaUploadReturn {
  uploadMedia: (postId: string, file: File) => Promise<MediaUploadResult | null>;
  uploadMultipleMedia: (postId: string, files: File[]) => Promise<MediaUploadResult[]>;
  deleteMedia: (postId: string) => Promise<boolean>;
  isUploading: boolean;
  progress: number;
  error: Error | null;
  resetError: () => void;
}

export function useMediaUpload(options: UseMediaUploadOptions = {}): UseMediaUploadReturn {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const uploadMedia = useCallback(async (postId: string, file: File): Promise<MediaUploadResult | null> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const uploadOptions: MediaUploadOptions = {
        postId,
        file,
        onProgress: (uploadProgress) => {
          setProgress(uploadProgress);
          options.onProgress?.(uploadProgress);
        },
        onError: (uploadError) => {
          setError(uploadError);
          options.onError?.(uploadError);
        }
      };

      const result = await MediaUploadService.uploadPostMedia(uploadOptions);
      
      if (result.success && result.data) {
        options.onSuccess?.(result.data);
        return result.data;
      } else {
        throw new Error('Upload failed');
      }
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Upload failed');
      setError(uploadError);
      options.onError?.(uploadError);
      return null;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }, [options]);

  const uploadMultipleMedia = useCallback(async (postId: string, files: File[]): Promise<MediaUploadResult[]> => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      const result = await MediaUploadService.uploadMultipleMedia(postId, files);
      
      if (result.success && result.data) {
        result.data.forEach(uploadResult => {
          options.onSuccess?.(uploadResult);
        });
        return result.data;
      } else {
        throw new Error('Multiple upload failed');
      }
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Multiple upload failed');
      setError(uploadError);
      options.onError?.(uploadError);
      return [];
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }, [options]);

  const deleteMedia = useCallback(async (postId: string): Promise<boolean> => {
    try {
      const result = await MediaUploadService.deletePostMedia(postId);
      return result.success;
    } catch (err) {
      const deleteError = err instanceof Error ? err : new Error('Delete failed');
      setError(deleteError);
      options.onError?.(deleteError);
      return false;
    }
  }, [options]);

  return {
    uploadMedia,
    uploadMultipleMedia,
    deleteMedia,
    isUploading,
    progress,
    error,
    resetError
  };
}

// Hook for media processing status
export function useMediaProcessingStatus(postId: string) {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const checkStatus = useCallback(async () => {
    if (!postId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await MediaUploadService.getMediaProcessingStatus(postId);
      
      if (result.success && result.data) {
        setStatus(result.data.status);
      }
    } catch (err) {
      const statusError = err instanceof Error ? err : new Error('Failed to check status');
      setError(statusError);
    } finally {
      setIsLoading(false);
    }
  }, [postId]);

  return {
    status,
    isLoading,
    error,
    checkStatus
  };
}

// Hook for media analytics
export function useMediaAnalytics(userId: string, limit: number = 50) {
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await MediaUploadService.getMediaAnalytics(userId, limit);
      
      if (result.success && result.data) {
        setAnalytics(result.data);
      }
    } catch (err) {
      const analyticsError = err instanceof Error ? err : new Error('Failed to fetch analytics');
      setError(analyticsError);
    } finally {
      setIsLoading(false);
    }
  }, [userId, limit]);

  return {
    analytics,
    isLoading,
    error,
    fetchAnalytics
  };
}
