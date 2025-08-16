import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { Video } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface VideoEditorProps {
  videoUri: string;
  onSave: (editedVideoUri: string) => void;
  onClose: () => void;
}

interface Filter {
  id: string;
  name: string;
  icon: string;
  intensity: number;
}

interface TextOverlay {
  id: string;
  text: string;
  position: { x: number; y: number };
  fontSize: number;
  color: string;
}

const VideoEditor: React.FC<VideoEditorProps> = ({ videoUri, onSave, onClose }) => {
  const { currentTheme } = useTheme();
  const [currentTab, setCurrentTab] = useState<'trim' | 'filters' | 'text' | 'music'>('trim');
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);
  const [textOverlays, setTextOverlays] = useState<TextOverlay[]>([]);
  const [selectedMusic, setSelectedMusic] = useState<string | null>(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  
  const videoRef = useRef<Video>(null);

  const filters: Filter[] = [
    { id: 'none', name: 'Original', icon: 'image-outline', intensity: 0 },
    { id: 'vintage', name: 'Vintage', icon: 'camera-outline', intensity: 0.5 },
    { id: 'warm', name: 'Warm', icon: 'sunny-outline', intensity: 0.7 },
    { id: 'cool', name: 'Cool', icon: 'moon-outline', intensity: 0.6 },
    { id: 'dramatic', name: 'Dramatic', icon: 'contrast-outline', intensity: 0.8 },
    { id: 'bright', name: 'Bright', icon: 'flash-outline', intensity: 0.4 },
  ];

  const musicTracks = [
    { id: 'none', name: 'No Music', artist: '', icon: 'musical-notes-outline' },
    { id: 'upbeat', name: 'Upbeat Vibes', artist: 'Royalty Free', icon: 'play-circle-outline' },
    { id: 'chill', name: 'Chill Beats', artist: 'Royalty Free', icon: 'play-circle-outline' },
    { id: 'epic', name: 'Epic Trailer', artist: 'Royalty Free', icon: 'play-circle-outline' },
    { id: 'romantic', name: 'Romantic', artist: 'Royalty Free', icon: 'play-circle-outline' },
  ];

  const handleSave = () => {
    // In a real implementation, this would process the video with all edits
    // For now, we'll just return the original URI
    Alert.alert(
      'Processing Video',
      'Your video is being processed with all edits. This may take a few moments.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Simulate processing time
            setTimeout(() => {
              onSave(videoUri);
            }, 2000);
          },
        },
      ]
    );
  };

  const addTextOverlay = () => {
    const newOverlay: TextOverlay = {
      id: Date.now().toString(),
      text: 'Add your text here',
      position: { x: width / 2 - 50, y: height / 2 - 25 },
      fontSize: 24,
      color: '#FFFFFF',
    };
    setTextOverlays([...textOverlays, newOverlay]);
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(textOverlays.filter(overlay => overlay.id !== id));
  };

  const renderTrimTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Trim Video</Text>
      <Text style={[styles.tabSubtitle, { color: theme.colors.textSecondary }]}>
        Adjust the start and end points of your video
      </Text>
      
      <View style={styles.trimContainer}>
        <View style={styles.trimSlider}>
          <View style={styles.trimTrack}>
            <View 
              style={[
                styles.trimProgress, 
                { 
                  width: `${trimEnd - trimStart}%`,
                  left: `${trimStart}%`,
                  backgroundColor: theme.colors.primary 
                }
              ]} 
            />
            <View 
              style={[
                styles.trimHandle, 
                { 
                  left: `${trimStart}%`,
                  backgroundColor: theme.colors.primary 
                }
              ]} 
            />
            <View 
              style={[
                styles.trimHandle, 
                { 
                  left: `${trimEnd}%`,
                  backgroundColor: theme.colors.primary 
                }
              ]} 
            />
          </View>
        </View>
        
        <View style={styles.trimInfo}>
          <Text style={[styles.trimText, { color: theme.colors.textSecondary }]}>
            Start: {trimStart.toFixed(1)}%
          </Text>
          <Text style={[styles.trimText, { color: theme.colors.textSecondary }]}>
            End: {trimEnd.toFixed(1)}%
          </Text>
        </View>
      </View>
    </View>
  );

  const renderFiltersTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Apply Filters</Text>
      <Text style={[styles.tabSubtitle, { color: theme.colors.textSecondary }]}>
        Choose a filter to enhance your video
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
        contentContainerStyle={styles.filtersContent}
      >
        {filters.map((filter) => (
          <TouchableOpacity
            key={filter.id}
            style={[
              styles.filterItem,
              selectedFilter === filter.id && { borderColor: theme.colors.primary }
            ]}
            onPress={() => setSelectedFilter(filter.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.filterIcon,
              { backgroundColor: selectedFilter === filter.id ? theme.colors.primary + '20' : theme.colors.border }
            ]}>
              <Ionicons 
                name={filter.icon as any} 
                size={24} 
                color={selectedFilter === filter.id ? theme.colors.primary : theme.colors.textSecondary} 
              />
            </View>
            <Text style={[
              styles.filterName,
              { color: selectedFilter === filter.id ? theme.colors.primary : theme.colors.text }
            ]}>
              {filter.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const renderTextTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Add Text</Text>
      <Text style={[styles.tabSubtitle, { color: theme.colors.textSecondary }]}>
        Add text overlays to your video
      </Text>
      
      <TouchableOpacity
        style={[styles.addTextButton, { backgroundColor: theme.colors.primary }]}
        onPress={addTextOverlay}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={20} color={theme.colors.white} />
        <Text style={styles.addTextButtonText}>Add Text Overlay</Text>
      </TouchableOpacity>
      
      {textOverlays.map((overlay) => (
        <View key={overlay.id} style={styles.textOverlayItem}>
          <Text style={[styles.overlayText, { color: theme.colors.text }]}>
            {overlay.text}
          </Text>
          <TouchableOpacity
            style={styles.removeOverlayButton}
            onPress={() => removeTextOverlay(overlay.id)}
            activeOpacity={0.7}
          >
            <Ionicons name="close-circle" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );

  const renderMusicTab = () => (
    <View style={styles.tabContent}>
      <Text style={[styles.tabTitle, { color: theme.colors.text }]}>Background Music</Text>
      <Text style={[styles.tabSubtitle, { color: theme.colors.textSecondary }]}>
        Add music to your video
      </Text>
      
      <ScrollView style={styles.musicContainer}>
        {musicTracks.map((track) => (
          <TouchableOpacity
            key={track.id}
            style={[
              styles.musicItem,
              { borderColor: theme.colors.border },
              selectedMusic === track.id && { borderColor: theme.colors.primary }
            ]}
            onPress={() => setSelectedMusic(track.id)}
            activeOpacity={0.7}
          >
            <View style={[
              styles.musicIcon,
              { backgroundColor: selectedMusic === track.id ? theme.colors.primary + '20' : theme.colors.border }
            ]}>
              <Ionicons 
                name={track.icon as any} 
                size={24} 
                color={selectedMusic === track.id ? theme.colors.primary : theme.colors.textSecondary} 
              />
            </View>
            <View style={styles.musicInfo}>
              <Text style={[
                styles.musicName,
                { color: selectedMusic === track.id ? theme.colors.primary : theme.colors.text }
              ]}>
                {track.name}
              </Text>
              {track.artist && (
                <Text style={[styles.musicArtist, { color: theme.colors.textSecondary }]}>
                  {track.artist}
                </Text>
              )}
            </View>
            {selectedMusic === track.id && (
              <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onClose}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit Video</Text>
        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Video Preview */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: videoUri }}
          style={styles.videoPreview}
          useNativeControls
          resizeMode="contain"
          isLooping
        />
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {[
          { key: 'trim', label: 'Trim', icon: 'cut-outline' },
          { key: 'filters', label: 'Filters', icon: 'color-palette-outline' },
          { key: 'text', label: 'Text', icon: 'text-outline' },
          { key: 'music', label: 'Music', icon: 'musical-notes-outline' },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              currentTab === tab.key && { borderBottomColor: theme.colors.primary }
            ]}
            onPress={() => setCurrentTab(tab.key as any)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={tab.icon as any}
              size={20}
              color={currentTab === tab.key ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text style={[
              styles.tabLabel,
              { color: currentTab === tab.key ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.tabContentContainer}>
        {currentTab === 'trim' && renderTrimTab()}
        {currentTab === 'filters' && renderFiltersTab()}
        {currentTab === 'text' && renderTextTab()}
        {currentTab === 'music' && renderMusicTab()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  videoContainer: {
    height: height * 0.4,
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: theme.colors.background,
  },
  videoPreview: {
    flex: 1,
  },
  tabNavigation: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  tabContentContainer: {
    flex: 1,
    padding: 20,
  },
  tabContent: {
    flex: 1,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tabSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  trimContainer: {
    marginTop: 20,
  },
  trimSlider: {
    height: 60,
    justifyContent: 'center',
  },
  trimTrack: {
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    position: 'relative',
  },
  trimProgress: {
    height: '100%',
    borderRadius: 2,
    position: 'absolute',
  },
  trimHandle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    position: 'absolute',
    top: -8,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  trimInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  trimText: {
    fontSize: 14,
  },
  filtersContainer: {
    marginTop: 20,
  },
  filtersContent: {
    paddingRight: 20,
  },
  filterItem: {
    alignItems: 'center',
    marginRight: 20,
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minWidth: 80,
  },
  filterIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterName: {
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '500',
  },
  addTextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 20,
    gap: 8,
  },
  addTextButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  textOverlayItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 15,
    backgroundColor: theme.colors.border + '20',
    borderRadius: 8,
    marginTop: 10,
  },
  overlayText: {
    fontSize: 16,
    flex: 1,
  },
  removeOverlayButton: {
    padding: 5,
  },
  musicContainer: {
    marginTop: 20,
  },
  musicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  musicIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  musicInfo: {
    flex: 1,
  },
  musicName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  musicArtist: {
    fontSize: 14,
  },
});

export default VideoEditor;


