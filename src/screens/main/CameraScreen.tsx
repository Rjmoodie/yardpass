import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const CameraScreen: React.FC = () => {
  const [captureMode, setCaptureMode] = useState<'photo' | 'video'>('photo');
  const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto'>('off');
  const [timerMode, setTimerMode] = useState<'off' | '3s' | '10s'>('off');
  const [filterMode, setFilterMode] = useState<'none' | 'portrait' | 'landscape' | 'night' | 'food'>('none');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const handleCapture = () => {
    if (captureMode === 'photo') {
      Alert.alert('Photo Captured', 'Photo has been saved to your gallery!');
    } else {
      if (!isRecording) {
        setIsRecording(true);
        // Simulate recording timer
        let time = 0;
        const interval = setInterval(() => {
          time += 1;
          setRecordingTime(time);
          if (time >= 60) { // Max 60 seconds
            clearInterval(interval);
            setIsRecording(false);
            setRecordingTime(0);
            Alert.alert('Video Recorded', 'Video has been saved to your gallery!');
          }
        }, 1000);
      } else {
        setIsRecording(false);
        setRecordingTime(0);
        Alert.alert('Video Recorded', 'Video has been saved to your gallery!');
      }
    }
  };

  const handleFlashToggle = () => {
    const modes: Array<'off' | 'on' | 'auto'> = ['off', 'on', 'auto'];
    const currentIndex = modes.indexOf(flashMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setFlashMode(modes[nextIndex]);
  };

  const handleTimerToggle = () => {
    const modes: Array<'off' | '3s' | '10s'> = ['off', '3s', '10s'];
    const currentIndex = modes.indexOf(timerMode);
    const nextIndex = (currentIndex + 1) % modes.length;
    setTimerMode(modes[nextIndex]);
  };

  const handleFilterSelect = (filter: typeof filterMode) => {
    setFilterMode(filter);
    setShowFilters(false);
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderCameraView = () => (
    <View style={styles.cameraView}>
      {/* Camera Preview Placeholder */}
      <View style={styles.cameraPreview}>
        <View style={styles.cameraOverlay}>
          <View style={styles.gridLines}>
            {/* Grid lines for composition */}
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
            <View style={styles.gridLine} />
          </View>
          
          {/* Focus indicator */}
          <View style={styles.focusIndicator}>
            <View style={styles.focusSquare} />
          </View>
        </View>
      </View>

      {/* Recording indicator */}
      {isRecording && (
        <View style={styles.recordingIndicator}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingTime}>{formatRecordingTime(recordingTime)}</Text>
        </View>
      )}
    </View>
  );

  const renderTopControls = () => (
    <View style={styles.topControls}>
      <TouchableOpacity style={styles.controlButton}>
        <Ionicons name="close" size={24} color="white" />
      </TouchableOpacity>

      <View style={styles.centerControls}>
        <TouchableOpacity 
          style={styles.flashButton} 
          onPress={handleFlashToggle}
        >
          <Ionicons 
            name={flashMode === 'off' ? 'flash-off' : flashMode === 'on' ? 'flash' : 'flash-outline'} 
            size={24} 
            color="white" 
          />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.timerButton} 
          onPress={handleTimerToggle}
        >
          <Ionicons name="timer-outline" size={24} color="white" />
          {timerMode !== 'off' && (
            <Text style={styles.timerText}>{timerMode}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.filterButton} 
          onPress={() => setShowFilters(!showFilters)}
        >
          <Ionicons name="color-palette-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.controlButton}>
        <Ionicons name="settings-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderCaptureModeToggle = () => (
    <View style={styles.captureModeToggle}>
      <TouchableOpacity 
        style={[styles.modeButton, captureMode === 'photo' && styles.modeButtonActive]}
        onPress={() => setCaptureMode('photo')}
      >
        <Text style={[styles.modeText, captureMode === 'photo' && styles.modeTextActive]}>
          Photo
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={[styles.modeButton, captureMode === 'video' && styles.modeButtonActive]}
        onPress={() => setCaptureMode('video')}
      >
        <Text style={[styles.modeText, captureMode === 'video' && styles.modeTextActive]}>
          Video
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderCaptureButton = () => (
    <View style={styles.captureButtonContainer}>
      <TouchableOpacity style={styles.galleryButton}>
        <View style={styles.galleryThumbnail}>
          <Ionicons name="image" size={20} color="white" />
        </View>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.captureButton, isRecording && styles.captureButtonRecording]}
        onPress={handleCapture}
      >
        <View style={styles.captureButtonInner}>
          {captureMode === 'video' && isRecording && (
            <View style={styles.recordingIndicatorInner} />
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.switchCameraButton}>
        <Ionicons name="camera-reverse-outline" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterOption, filterMode === 'none' && styles.filterOptionActive]}
          onPress={() => handleFilterSelect('none')}
        >
          <View style={[styles.filterPreview, { backgroundColor: '#ffffff' }]} />
          <Text style={[styles.filterText, filterMode === 'none' && styles.filterTextActive]}>
            Normal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterOption, filterMode === 'portrait' && styles.filterOptionActive]}
          onPress={() => handleFilterSelect('portrait')}
        >
          <View style={[styles.filterPreview, { backgroundColor: '#ffb3d9' }]} />
          <Text style={[styles.filterText, filterMode === 'portrait' && styles.filterTextActive]}>
            Portrait
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterOption, filterMode === 'landscape' && styles.filterOptionActive]}
          onPress={() => handleFilterSelect('landscape')}
        >
          <View style={[styles.filterPreview, { backgroundColor: '#87ceeb' }]} />
          <Text style={[styles.filterText, filterMode === 'landscape' && styles.filterTextActive]}>
            Landscape
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterOption, filterMode === 'night' && styles.filterOptionActive]}
          onPress={() => handleFilterSelect('night')}
        >
          <View style={[styles.filterPreview, { backgroundColor: '#2f2f2f' }]} />
          <Text style={[styles.filterText, filterMode === 'night' && styles.filterTextActive]}>
            Night
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterOption, filterMode === 'food' && styles.filterOptionActive]}
          onPress={() => handleFilterSelect('food')}
        >
          <View style={[styles.filterPreview, { backgroundColor: '#ffd700' }]} />
          <Text style={[styles.filterText, filterMode === 'food' && styles.filterTextActive]}>
            Food
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {renderCameraView()}
      
      {renderTopControls()}
      
      {renderCaptureModeToggle()}
      
      {renderCaptureButton()}
      
      {showFilters && renderFilters()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  cameraView: {
    flex: 1,
    position: 'relative',
  },
  cameraPreview: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.3,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: 'white',
    opacity: 0.5,
  },
  focusIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -25,
    marginTop: -25,
  },
  focusSquare: {
    width: 50,
    height: 50,
    borderWidth: 2,
    borderColor: '#00ff88',
    borderRadius: 8,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 4,
  },
  recordingTime: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  topControls: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  controlButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  flashButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    position: 'absolute',
    bottom: -5,
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureModeToggle: {
    position: 'absolute',
    top: 120,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modeButtonActive: {
    backgroundColor: '#00ff88',
  },
  modeText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  modeTextActive: {
    color: '#000000',
  },
  captureButtonContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 40,
  },
  galleryButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#00ff88',
  },
  captureButtonRecording: {
    backgroundColor: '#ff4444',
    borderColor: '#ff4444',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordingIndicatorInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
  },
  switchCameraButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    position: 'absolute',
    bottom: 150,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
  },
  filterOption: {
    alignItems: 'center',
    marginRight: 20,
  },
  filterOptionActive: {
    transform: [{ scale: 1.1 }],
  },
  filterPreview: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#00ff88',
    fontWeight: '600',
  },
});

export default CameraScreen;
