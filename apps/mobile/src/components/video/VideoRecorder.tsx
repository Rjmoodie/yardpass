import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Camera, CameraType, FlashMode } from 'expo-camera';
import { Video, ResizeMode } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface VideoRecorderProps {
  onVideoRecorded: (uri: string) => void;
  onClose: () => void;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onVideoRecorded, onClose }) => {
  const { currentTheme } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraType, setCameraType] = useState(CameraType.back);
  const [flashMode, setFlashMode] = useState(FlashMode.off);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedVideo, setRecordedVideo] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  
  const cameraRef = useRef<Camera>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      const audioStatus = await Camera.requestMicrophonePermissionsAsync();
      setHasPermission(status === 'granted' && audioStatus.status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (isRecording && !isPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording, isPaused]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startRecording = async () => {
    if (!cameraRef.current) return;

    try {
      setIsRecording(true);
      setRecordingTime(0);
      setIsPaused(false);

      const video = await cameraRef.current.recordAsync({
        quality: '720p',
        maxDuration: 60, // 60 seconds max
        mute: false,
      });

      setRecordedVideo(video.uri);
      setIsRecording(false);
    } catch (error) {
      console.error('Error recording video:', error);
      Alert.alert('Error', 'Failed to record video. Please try again.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (cameraRef.current && isRecording) {
      cameraRef.current.stopRecording();
    }
  };

  const pauseRecording = () => {
    if (cameraRef.current && isRecording) {
      setIsPaused(true);
      // cameraRef.current.pauseRecording();
    }
  };

  const resumeRecording = () => {
    if (cameraRef.current && isRecording) {
      setIsPaused(false);
      // cameraRef.current.resumeRecording();
    }
  };

  const retakeVideo = () => {
    setRecordedVideo(null);
    setRecordingTime(0);
    setIsRecording(false);
    setIsPaused(false);
  };

  const confirmVideo = () => {
    if (recordedVideo) {
      onVideoRecorded(recordedVideo);
    }
  };

  const toggleCameraType = () => {
    setCameraType(current => 
      current === CameraType.back ? CameraType.front : CameraType.back
    );
  };

  const toggleFlash = () => {
    setFlashMode(current => 
      current === FlashMode.off ? FlashMode.on : FlashMode.off
    );
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.permissionText, { color: theme.colors.text }]}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.permissionText, { color: theme.colors.text }]}>
          No access to camera
        </Text>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
          onPress={onClose}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (recordedVideo) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Video
          source={{ uri: recordedVideo }}
          style={styles.videoPreview}
          useNativeControls
          resizeMode={ResizeMode.COVER}
          isLooping
        />
        
        <View style={styles.previewControls}>
          <TouchableOpacity
            style={[styles.previewButton, { backgroundColor: theme.colors.secondary }]}
            onPress={retakeVideo}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh" size={24} color={theme.colors.white} />
            <Text style={styles.previewButtonText}>Retake</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.previewButton, { backgroundColor: theme.colors.primary }]}
            onPress={confirmVideo}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark" size={24} color={theme.colors.white} />
            <Text style={styles.previewButtonText}>Use Video</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        ref={cameraRef}
        style={styles.camera}
        type={cameraType}
        flashMode={flashMode}
        ratio="16:9"
      >
        <View style={styles.cameraOverlay}>
          {/* Top Controls */}
          <View style={styles.topControls}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={theme.colors.white} />
            </TouchableOpacity>

            <View style={styles.topRightControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleFlash}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={flashMode === FlashMode.on ? 'flash' : 'flash-off'}
                  size={24}
                  color={theme.colors.white}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleCameraType}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-reverse" size={24} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Recording Timer */}
          {isRecording && (
            <View style={styles.timerContainer}>
              <View style={styles.timerBackground}>
                <Text style={styles.timerText}>{formatTime(recordingTime)}</Text>
                {isPaused && (
                  <View style={styles.pauseIndicator}>
                    <Text style={styles.pauseText}>PAUSED</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <View style={styles.recordingControls}>
              {!isRecording ? (
                <TouchableOpacity
                  style={styles.recordButton}
                  onPress={startRecording}
                  activeOpacity={0.8}
                >
                  <View style={styles.recordButtonInner} />
                </TouchableOpacity>
              ) : (
                <View style={styles.recordingButtons}>
                  <TouchableOpacity
                    style={[styles.controlButton, styles.stopButton]}
                    onPress={stopRecording}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="stop" size={24} color={theme.colors.white} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.controlButton, styles.pauseButton]}
                    onPress={isPaused ? resumeRecording : pauseRecording}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isPaused ? 'play' : 'pause'}
                      size={24}
                      color={theme.colors.white}
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
    gap: 15,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 120 : 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  timerBackground: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  timerText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  pauseIndicator: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pauseText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  bottomControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  recordingControls: {
    alignItems: 'center',
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: theme.colors.white,
  },
  recordButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: theme.colors.primary,
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: 30,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  pauseButton: {
    backgroundColor: theme.colors.primary,
  },
  videoPreview: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  previewControls: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    paddingHorizontal: 40,
  },
  previewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
  },
  previewButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  permissionButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default VideoRecorder;


