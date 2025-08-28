import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { apiGateway } from '@/services/api';

const { width } = Dimensions.get('window');

interface MediaUploadProps {
  contextType: 'event' | 'post' | 'profile' | 'organization';
  contextId: string;
  mediaType?: 'image' | 'video' | 'audio' | 'all';
  maxFiles?: number;
  onUploadComplete?: (mediaAssets: any[]) => void;
  onUploadError?: (error: string) => void;
  onUploadProgress?: (progress: number) => void;
  style?: any;
}

interface MediaFile {
  id: string;
  uri: string;
  type: 'image' | 'video' | 'audio';
  name: string;
  size: number;
  base64?: string;
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
}) => {
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          id: Date.now().toString(),
          uri: asset.uri,
          type: 'image',
          name: asset.fileName || `image_${Date.now()}.jpg`,
          size: asset.fileSize || 0,
          base64: asset.base64,
        };

        if (selectedFiles.length >= maxFiles) {
          Alert.alert('Maximum files reached', `You can only upload up to ${maxFiles} files.`);
          return;
        }

        setSelectedFiles(prev => [...prev, newFile]);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      onUploadError?.('Failed to pick image');
    }
  };

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          id: Date.now().toString(),
          uri: asset.uri,
          type: 'video',
          name: asset.fileName || `video_${Date.now()}.mp4`,
          size: asset.fileSize || 0,
          base64: asset.base64,
        };

        if (selectedFiles.length >= maxFiles) {
          Alert.alert('Maximum files reached', `You can only upload up to ${maxFiles} files.`);
          return;
        }

        setSelectedFiles(prev => [...prev, newFile]);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      onUploadError?.('Failed to pick video');
    }
  };

  const pickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const newFile: MediaFile = {
          id: Date.now().toString(),
          uri: asset.uri,
          type: 'audio',
          name: asset.name,
          size: asset.size,
        };

        if (selectedFiles.length >= maxFiles) {
          Alert.alert('Maximum files reached', `You can only upload up to ${maxFiles} files.`);
          return;
        }

        setSelectedFiles(prev => [...prev, newFile]);
      }
    } catch (error) {
      console.error('Error picking audio:', error);
      onUploadError?.('Failed to pick audio file');
    }
  };

  const handlePickMedia = () => {
    if (mediaType === 'image') {
      pickImage();
    } else if (mediaType === 'video') {
      pickVideo();
    } else if (mediaType === 'audio') {
      pickAudio();
    } else {
      // Show picker options for 'all'
      Alert.alert(
        'Select Media Type',
        'Choose the type of media to upload',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Image', onPress: pickImage },
          { text: 'Video', onPress: pickVideo },
          { text: 'Audio', onPress: pickAudio },
        ]
      );
    }
  };

  const removeFile = (fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const uploadFiles = async () => {
    if (selectedFiles.length === 0) {
      Alert.alert('No files selected', 'Please select at least one file to upload.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const uploadPromises = selectedFiles.map(async (file, index) => {
        // Convert file to base64 if not already
        let base64Data = file.base64;
        if (!base64Data) {
          // For audio files or files without base64, we'd need to read the file
          // This is a simplified version - in production you'd handle file reading
          throw new Error('File conversion not supported for this file type');
        }

        const uploadParams = {
          media_data: `data:${getMimeType(file.type)};base64,${base64Data}`,
          media_type: file.type,
          content_type: getMimeType(file.type),
          context_type: contextType,
          context_id: contextId,
          filename: file.name,
          optimize: true,
        };

        const response = await apiGateway.uploadMedia(uploadParams);
        
        if (!response.success) {
          throw new Error(response.error || 'Upload failed');
        }

        // Update progress
        const progress = ((index + 1) / selectedFiles.length) * 100;
        setUploadProgress(progress);
        onUploadProgress?.(progress);

        return response.data;
      });

      const results = await Promise.all(uploadPromises);
      
      setUploading(false);
      setUploadProgress(0);
      setSelectedFiles([]);
      
      onUploadComplete?.(results);
      
    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      setUploadProgress(0);
      onUploadError?.(error instanceof Error ? error.message : 'Upload failed');
    }
  };

  const getMimeType = (type: string): string => {
    switch (type) {
      case 'image': return 'image/jpeg';
      case 'video': return 'video/mp4';
      case 'audio': return 'audio/mpeg';
      default: return 'application/octet-stream';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <View style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Upload Media</Text>
        <Text style={styles.subtitle}>
          {selectedFiles.length} of {maxFiles} files selected
        </Text>
      </View>

      {/* File Selection */}
      <View style={styles.selectionSection}>
        <TouchableOpacity
          style={styles.pickButton}
          onPress={handlePickMedia}
          disabled={uploading || selectedFiles.length >= maxFiles}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.pickButtonText}>
            {mediaType === 'all' ? 'Add Media' : `Add ${mediaType}`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <View style={styles.filesSection}>
          <Text style={styles.sectionTitle}>Selected Files</Text>
          <ScrollView style={styles.filesList}>
            {selectedFiles.map((file) => (
              <View key={file.id} style={styles.fileItem}>
                <View style={styles.fileInfo}>
                  <Ionicons
                    name={file.type === 'image' ? 'image' : file.type === 'video' ? 'videocam' : 'musical-notes'}
                    size={24}
                    color="#00ff88"
                  />
                  <View style={styles.fileDetails}>
                    <Text style={styles.fileName}>{file.name}</Text>
                    <Text style={styles.fileSize}>{formatFileSize(file.size)}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeFile(file.id)}
                  disabled={uploading}
                >
                  <Ionicons name="close" size={20} color="white" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Upload Progress */}
      {uploading && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%` }]} />
          </View>
          <Text style={styles.progressText}>{Math.round(uploadProgress)}%</Text>
        </View>
      )}

      {/* Upload Button */}
      {selectedFiles.length > 0 && !uploading && (
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={uploadFiles}
        >
          <Text style={styles.uploadButtonText}>Upload {selectedFiles.length} File{selectedFiles.length > 1 ? 's' : ''}</Text>
        </TouchableOpacity>
      )}

      {/* Loading Indicator */}
      {uploading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ff88" />
          <Text style={styles.loadingText}>Uploading files...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  selectionSection: {
    padding: 20,
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#00ff88',
    borderStyle: 'dashed',
  },
  pickButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginLeft: 8,
  },
  filesSection: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  filesList: {
    flex: 1,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#262626',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileDetails: {
    marginLeft: 12,
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: 'white',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  removeButton: {
    backgroundColor: '#ff4444',
    borderRadius: 16,
    padding: 4,
  },
  progressSection: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ff88',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: '#a3a3a3',
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: '#00ff88',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: 'white',
    marginTop: 16,
  },
});
