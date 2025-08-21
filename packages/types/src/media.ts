// ============================================================================
// MEDIA UPLOAD TYPES
// ============================================================================

export interface MediaUploadOptions {
  postId: string;
  file: File;
  onProgress?: (progress: number) => void;
  onError?: (error: Error) => void;
}

export interface MediaUploadResult {
  success: boolean;
  postId: string;
  mediaPath: string;
  mediaUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadDuration: number;
}

export interface MediaDeleteResult {
  success: boolean;
  postId: string;
  mediaPath: string;
  message: string;
}

export interface MediaUploadUrlResult {
  success: boolean;
  postId: string;
  mediaPath: string;
  uploadUrl: string;
  bucketId: string;
}

export interface MediaProcessingStatus {
  id: string;
  postId: string;
  mediaPath: string;
  processingStatus: 'pending' | 'processing' | 'completed' | 'failed';
  retryCount: number;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAnalytics {
  id: string;
  userId: string;
  postId: string;
  mediaPath: string;
  fileSize: number;
  mimeType: string;
  uploadDurationMs?: number;
  processingDurationMs?: number;
  createdAt: string;
  
  // Computed fields
  post?: {
    id: string;
    content: string;
    createdAt: string;
  };
}

export interface MediaUploadRequest {
  postId: string;
  fileName: string;
  fileType: 'image' | 'video';
  fileSize: number;
  mimeType: string;
}

export interface MediaUploadResponse {
  success: boolean;
  postId: string;
  mediaPath: string;
  mediaUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadDuration: number;
  error?: string;
}

// ============================================================================
// MEDIA CONSTANTS
// ============================================================================

export const MEDIA_CONSTANTS = {
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm'],
  STORAGE_BUCKET: 'post-media',
  PROCESSED_BUCKET: 'processed-media',
  CACHE_CONTROL: '3600',
  CONCURRENCY_LIMIT: 3
} as const;

// ============================================================================
// MEDIA UTILITY TYPES
// ============================================================================

export type MediaFileType = 'image' | 'video' | 'file';

export type MediaProcessingStatusType = 'pending' | 'processing' | 'completed' | 'failed';

export interface MediaFileValidation {
  isValid: boolean;
  error?: string;
  fileType: MediaFileType;
  size: number;
  mimeType: string;
}

// ============================================================================
// MEDIA API RESPONSES
// ============================================================================

export interface MediaUploadApiResponse {
  data: MediaUploadResult;
  meta?: {
    uploadTime: number;
    fileSize: number;
    processingStatus: MediaProcessingStatusType;
  };
}

export interface MediaDeleteApiResponse {
  data: MediaDeleteResult;
  meta?: {
    deleteTime: number;
    storageCleaned: boolean;
  };
}

export interface MediaAnalyticsApiResponse {
  data: MediaAnalytics[];
  meta: {
    total: number;
    averageUploadTime: number;
    totalFileSize: number;
    mostUsedType: string;
  };
}
