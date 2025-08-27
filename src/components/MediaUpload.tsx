import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import { apiGateway } from '../services/api';

const { width: screenWidth } = Dimensions.get('window');

interface MediaUploadProps {
  contextType: 'event' | 'post' | 'profile' | 'organization';
  contextId: string;
  mediaType?: 'image' | 'video' | 'audio' | 'all';
  maxFiles?: number;
  onUploadComplete?: (mediaAssets: any[]) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: number) => void;
  style?: any;
  disabled?: boolean;
}

interface MediaFile {
  id: string;
  uri: string;
  type: string;
  name: string;
  size: number;
  base64?: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  result?: any;
}

export const MediaUpload: React.FC<MediaUploadProps> = ({
  contextType,
  contextId,
  mediaType = 'all',
  maxFiles = 10,
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  style,
  disabled = false,
}) => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<any>(null);

  // Request permissions
  const requestPermissions = useCallback(async () => {
    if (Platform.OS !== 'web') {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          'Permissions Required',
          'Camera and photo library permissions are required to upload media.',
          [{ text: 'OK' }]
        );
        return false;
      }
    }
    return true;
  }, []);

  // Convert file to base64
  const fileToBase64 = useCallback(async (uri: string): Promise<string> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error('Error converting file to base64:', error);
      throw error;
    }
  }, []);

  // Get content type from file
  const getContentType = useCallback((uri: string, type: string): string => {
    if (type.startsWith('image/')) return type;
    if (type.startsWith('video/')) return type;
    if (type.startsWith('audio/')) return type;
    
    // Fallback based on file extension
    const extension = uri.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      mp4: 'video/mp4',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      m4a: 'audio/mp4',
    };
    
    return mimeTypes[extension || ''] || 'application/octet-stream';
  }, []);

  // Add media files
  const addMediaFiles = useCallback(async (files: any[]) => {
    if (mediaFiles.length + files.length > maxFiles) {
      Alert.alert('Too Many Files', `Maximum ${maxFiles} files allowed.`);
      return;
    }

    const newFiles: MediaFile[] = [];
    
    for (const file of files) {
      const mediaFile: MediaFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        uri: file.uri || file.webPath || file.uri,
        type: file.type || 'image',
        name: file.name || file.fileName || 'unknown',
        size: file.size || 0,
        status: 'pending',
        progress: 0,
      };

      // Convert to base64 for upload
      try {
        mediaFile.base64 = await fileToBase64(mediaFile.uri);
        newFiles.push(mediaFile);
      } catch (error) {
        console.error('Error processing file:', error);
        mediaFile.status = 'error';
        mediaFile.error = 'Failed to process file';
        newFiles.push(mediaFile);
      }
    }

    setMediaFiles(prev => [...prev, ...newFiles]);
  }, [mediaFiles.length, maxFiles, fileToBase64]);

  // Pick from camera
  const pickFromCamera = useCallback(async () => {
    if (disabled) return;
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: mediaType === 'all' ? ImagePicker.MediaTypeOptions.All : 
                   mediaType === 'image' ? ImagePicker.MediaTypeOptions.Images :
                   mediaType === 'video' ? ImagePicker.MediaTypeOptions.Videos :
                   ImagePicker.MediaTypeOptions.All,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await addMediaFiles(result.assets);
      }
    } catch (error) {
      console.error('Error picking from camera:', error);
      onUploadError?.('Failed to access camera');
    }
  }, [disabled, mediaType, requestPermissions, addMediaFiles, onUploadError]);

  // Pick from library
  const pickFromLibrary = useCallback(async () => {
    if (disabled) return;
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: mediaType === 'all' ? ImagePicker.MediaTypeOptions.All : 
                   mediaType === 'image' ? ImagePicker.MediaTypeOptions.Images :
                   mediaType === 'video' ? ImagePicker.MediaTypeOptions.Videos :
                   ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await addMediaFiles(result.assets);
      }
    } catch (error) {
      console.error('Error picking from library:', error);
      onUploadError?.('Failed to access photo library');
    }
  }, [disabled, mediaType, requestPermissions, addMediaFiles, onUploadError]);

  // Pick documents
  const pickDocuments = useCallback(async () => {
    if (disabled) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: mediaType === 'all' ? '*/*' :
              mediaType === 'image' ? 'image/*' :
              mediaType === 'video' ? 'video/*' :
              mediaType === 'audio' ? 'audio/*' : '*/*',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await addMediaFiles(result.assets);
      }
    } catch (error) {
      console.error('Error picking documents:', error);
      onUploadError?.('Failed to pick documents');
    }
  }, [disabled, mediaType, addMediaFiles, onUploadError]);

  // Upload single file
  const uploadFile = useCallback(async (file: MediaFile): Promise<void> => {
    if (!file.base64) {
      throw new Error('No base64 data available');
    }

    const contentType = getContentType(file.uri, file.type);
    
    const uploadParams = {
      media_data: file.base64,
      media_type: contentType.startsWith('image/') ? 'image' :
                  contentType.startsWith('video/') ? 'video' :
                  contentType.startsWith('audio/') ? 'audio' : 'image',
      content_type: contentType,
      context_type: contextType,
      context_id: contextId,
      filename: file.name,
      optimize: true,
    };

    try {
      const response = await apiGateway.uploadMedia(uploadParams);
      
      if (response.success && response.data) {
        file.status = 'completed';
        file.result = response.data;
        file.progress = 100;
      } else {
        throw new Error(response.error || 'Upload failed');
      }
    } catch (error) {
      file.status = 'error';
      file.error = error instanceof Error ? error.message : 'Upload failed';
      throw error;
    }
  }, [contextType, contextId, getContentType]);

  // Upload all files
  const uploadAllFiles = useCallback(async () => {
    if (isUploading || mediaFiles.length === 0) return;

    setIsUploading(true);
    const pendingFiles = mediaFiles.filter(f => f.status === 'pending');
    
    if (pendingFiles.length === 0) {
      setIsUploading(false);
      return;
    }

    let completedCount = 0;
    let errorCount = 0;

    for (const file of pendingFiles) {
      try {
        file.status = 'uploading';
        file.progress = 0;
        setMediaFiles([...mediaFiles]);

        // Simulate progress
        const progressInterval = setInterval(() => {
          if (file.progress < 90) {
            file.progress += Math.random() * 10;
            setMediaFiles([...mediaFiles]);
          }
        }, 200);

        await uploadFile(file);
        clearInterval(progressInterval);
        
        completedCount++;
        onUploadProgress?.(completedCount / pendingFiles.length);
      } catch (error) {
        errorCount++;
        console.error('Upload error for file:', file.name, error);
      }
    }

    setIsUploading(false);

    // Call completion callback
    const completedFiles = mediaFiles.filter(f => f.status === 'completed');
    if (completedFiles.length > 0) {
      onUploadComplete?.(completedFiles.map(f => f.result));
    }

    if (errorCount > 0) {
      onUploadError?.(`${errorCount} files failed to upload`);
    }
  }, [isUploading, mediaFiles, uploadFile, onUploadComplete, onUploadError, onUploadProgress]);

  // Remove file
  const removeFile = useCallback((fileId: string) => {
    setMediaFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  // Clear all files
  const clearAllFiles = useCallback(() => {
    setMediaFiles([]);
  }, []);

  // Handle drag and drop (web only)
  const handleDrag = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      addMediaFiles(files);
    }
  }, [addMediaFiles]);

  const renderMediaPreview = (file: MediaFile) => {
    const isImage = file.type.startsWith('image/');
    const isVideo = file.type.startsWith('video/');
    const isAudio = file.type.startsWith('audio/');

    return (
      <View key={file.id} style={styles.mediaPreview}>
        {isImage && (
          <Image source={{ uri: file.uri }} style={styles.previewImage} />
        )}
        
        {isVideo && (
          <View style={styles.videoPreview}>
            <Ionicons name="videocam" size={24} color="#666" />
            <Text style={styles.videoText}>Video</Text>
          </View>
        )}
        
        {isAudio && (
          <View style={styles.audioPreview}>
            <Ionicons name="musical-notes" size={24} color="#666" />
            <Text style={styles.audioText}>Audio</Text>
          </View>
        )}

        <View style={styles.fileInfo}>
          <Text style={styles.fileName} numberOfLines={1}>
            {file.name}
          </Text>
          <Text style={styles.fileSize}>
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </Text>
        </View>

        {file.status === 'uploading' && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${file.progress}%` }]} />
            <Text style={styles.progressText}>{Math.round(file.progress)}%</Text>
          </View>
        )}

        {file.status === 'completed' && (
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
          </View>
        )}

        {file.status === 'error' && (
          <View style={styles.statusContainer}>
            <Ionicons name="close-circle" size={20} color="#F44336" />
            <Text style={styles.errorText}>{file.error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => removeFile(file.id)}
          disabled={file.status === 'uploading'}
        >
          <Ionicons name="close" size={16} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {/* Upload Area */}
      <View
        style={[
          styles.uploadArea,
          dragActive && styles.uploadAreaDragActive,
          disabled && styles.uploadAreaDisabled,
        ]}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Ionicons 
          name={dragActive ? "cloud-upload" : "cloud-upload-outline"} 
          size={48} 
          color={dragActive ? "#2196F3" : "#666"} 
        />
        <Text style={styles.uploadText}>
          {dragActive ? 'Drop files here' : 'Drag & drop files here'}
        </Text>
        <Text style={styles.uploadSubtext}>
          or click to browse
        </Text>

        {!disabled && (
          <View style={styles.uploadButtons}>
            <TouchableOpacity style={styles.uploadButton} onPress={pickFromCamera}>
              <Ionicons name="camera" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Camera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadButton} onPress={pickFromLibrary}>
              <Ionicons name="images" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Library</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.uploadButton} onPress={pickDocuments}>
              <Ionicons name="document" size={20} color="#FFF" />
              <Text style={styles.buttonText}>Files</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Media Files List */}
      {mediaFiles.length > 0 && (
        <View style={styles.mediaList}>
          <View style={styles.mediaListHeader}>
            <Text style={styles.mediaListTitle}>
              {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''} selected
            </Text>
            <TouchableOpacity onPress={clearAllFiles} style={styles.clearButton}>
              <Text style={styles.clearButtonText}>Clear All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.mediaGrid}>
            {mediaFiles.map(renderMediaPreview)}
          </View>

          {/* Upload Button */}
          <TouchableOpacity
            style={[
              styles.uploadAllButton,
              (isUploading || mediaFiles.filter(f => f.status === 'pending').length === 0) && styles.uploadAllButtonDisabled
            ]}
            onPress={uploadAllFiles}
            disabled={isUploading || mediaFiles.filter(f => f.status === 'pending').length === 0}
          >
            {isUploading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Ionicons name="cloud-upload" size={20} color="#FFF" />
            )}
            <Text style={styles.uploadAllButtonText}>
              {isUploading ? 'Uploading...' : 'Upload All Files'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  uploadArea: {
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFA',
    minHeight: 200,
  },
  uploadAreaDragActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  uploadAreaDisabled: {
    opacity: 0.5,
  },
  uploadText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
    textAlign: 'center',
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  uploadButtons: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  buttonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
  },
  mediaList: {
    marginTop: 24,
  },
  mediaListHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mediaListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  clearButtonText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '500',
  },
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  mediaPreview: {
    width: (screenWidth - 48) / 3,
    aspectRatio: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E3F2FD',
  },
  videoText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  audioPreview: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3E5F5',
  },
  audioText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  fileInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 8,
  },
  fileName: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '500',
  },
  fileSize: {
    fontSize: 8,
    color: '#CCC',
    marginTop: 2,
  },
  progressContainer: {
    position: 'absolute',
    top: 8,
    left: 8,
    right: 8,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressText: {
    position: 'absolute',
    top: 8,
    right: 8,
    fontSize: 10,
    color: '#FFF',
    fontWeight: '600',
  },
  statusContainer: {
    position: 'absolute',
    top: 8,
    right: 8,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 8,
    color: '#F44336',
    marginTop: 2,
    textAlign: 'center',
  },
  removeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    gap: 8,
  },
  uploadAllButtonDisabled: {
    backgroundColor: '#CCC',
  },
  uploadAllButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
