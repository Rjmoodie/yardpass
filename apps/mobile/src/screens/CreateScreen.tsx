import React, { useState, Fragment } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';
import VideoRecorder from '../components/video/VideoRecorder';
import VideoEditor from '../components/video/VideoEditor';
import { MediaUpload } from '../components/MediaUpload';
import { apiGateway } from '@yardpass/api';

const { width, height } = Dimensions.get('window');

const CreateScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [recordedVideoUri, setRecordedVideoUri] = useState<string | null>(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadedMediaAssets, setUploadedMediaAssets] = useState<any[]>([]);

  const createOptions = [
    {
      id: 'record',
      title: 'Record Video',
      subtitle: 'Create a new video post',
      icon: 'videocam',
      color: theme.colors.primary,
      onPress: () => handleRecordVideo(),
    },
    {
      id: 'upload',
      title: 'Upload Media',
      subtitle: 'Share photos or videos',
      icon: 'cloud-upload',
      color: theme.colors.secondary,
      onPress: () => handleUploadMedia(),
    },
    {
      id: 'event',
      title: 'Create Event',
      subtitle: 'Organize a new event',
      icon: 'calendar',
      color: '#FF6B6B',
      onPress: () => handleCreateEvent(),
    },
    {
      id: 'story',
      title: 'Story Mode',
      subtitle: 'Share a quick story',
      icon: 'camera',
      color: '#4ECDC4',
      onPress: () => handleCreateStory(),
    },
  ];

  const recentEvents = [
    {
      id: '1',
      name: 'Summer Music Festival 2024',
      date: '2024-08-20',
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop',
    },
    {
      id: '2',
      name: 'Tech Conference 2024',
      date: '2024-09-15',
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=100&h=100&fit=crop',
    },
  ];

  const handleRecordVideo = () => {
    setShowVideoRecorder(true);
  };

  const handleVideoRecorded = (videoUri: string) => {
    setRecordedVideoUri(videoUri);
    setShowVideoRecorder(false);
    setShowVideoEditor(true);
  };

  const handleVideoEdited = (editedVideoUri: string) => {
    setSelectedMedia(editedVideoUri);
    setShowVideoEditor(false);
    setRecordedVideoUri(null);
  };

  const handleUploadMedia = () => {
    setShowMediaUpload(true);
  };

  const handleMediaUploadComplete = (mediaAssets: any[]) => {
    setUploadedMediaAssets(mediaAssets);
    if (mediaAssets.length > 0) {
      setSelectedMedia(mediaAssets[0].url);
    }
    setShowMediaUpload(false);
  };

  const handleMediaUploadError = (error: string) => {
    Alert.alert('Upload Error', error);
    setShowMediaUpload(false);
  };

  const handleCreateEvent = () => {
    Alert.alert('Coming Soon', 'Event creation functionality will be available soon');
  };

  const handleCreateStory = () => {
    Alert.alert('Coming Soon', 'Story creation functionality will be available soon');
  };

  const handlePost = () => {
    if (!selectedMedia && !caption.trim()) {
      Alert.alert('Error', 'Please add some content to your post');
      return;
    }
    Alert.alert('Success', 'Your post has been created!');
    // Reset form
    setSelectedMedia(null);
    setCaption('');
    setSelectedEvent(null);
  };

  const renderCreateOption = (option: any) => (
    <TouchableOpacity
      key={option.id}
      style={[styles.createOption, { borderColor: theme.colors.border }]}
      onPress={option.onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.optionIcon, { backgroundColor: option.color + '20' }]}>
        <Ionicons name={option.icon as any} size={24} color={option.color} />
      </View>
      <View style={styles.optionContent}>
        <Text style={[styles.optionTitle, { color: theme.colors.text }]}>
          {option.title}
        </Text>
        <Text style={[styles.optionSubtitle, { color: theme.colors.textSecondary }]}>
          {option.subtitle}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Create</Text>
          <TouchableOpacity
            style={[
              styles.postButton,
              { backgroundColor: selectedMedia || caption.trim() ? theme.colors.primary : theme.colors.border }
            ]}
            onPress={handlePost}
            disabled={!selectedMedia && !caption.trim()}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.postButtonText,
              { color: selectedMedia || caption.trim() ? theme.colors.white : theme.colors.textSecondary }
            ]}>
              Post
            </Text>
          </TouchableOpacity>
        </View>

        {/* Create Options */}
        <View style={styles.createOptionsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            What would you like to create?
          </Text>
          <View style={styles.createOptions}>
            {createOptions.map(renderCreateOption)}
          </View>
        </View>

        {/* Quick Post Section */}
        <View style={styles.quickPostSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Quick Post
          </Text>
          
          {/* Media Preview */}
          {selectedMedia && (
            <View style={styles.mediaPreview}>
              <Image source={{ uri: selectedMedia }} style={styles.mediaImage} />
              <TouchableOpacity
                style={styles.removeMediaButton}
                onPress={() => setSelectedMedia(null)}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle" size={24} color={theme.colors.white} />
              </TouchableOpacity>
            </View>
          )}

          {/* Caption Input */}
          <View style={styles.captionContainer}>
            <TextInput
              style={[styles.captionInput, { color: theme.colors.text }]}
              placeholder="What's happening at this event?"
              placeholderTextColor={theme.colors.textSecondary}
              value={caption}
              onChangeText={setCaption}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <Text style={[styles.characterCount, { color: theme.colors.textSecondary }]}>
              {caption.length}/500
            </Text>
          </View>

          {/* Event Selection */}
          <View style={styles.eventSelection}>
            <Text style={[styles.eventSelectionTitle, { color: theme.colors.text }]}>
              Tag an Event (Optional)
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.eventScroll}
              contentContainerStyle={styles.eventScrollContent}
            >
              {recentEvents.map((event) => (
                <TouchableOpacity
                  key={event.id}
                  style={[
                    styles.eventOption,
                    selectedEvent?.id === event.id && { borderColor: theme.colors.primary }
                  ]}
                  onPress={() => setSelectedEvent(event)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: event.image }} style={styles.eventOptionImage} />
                  <Text style={[styles.eventOptionName, { color: theme.colors.text }]} numberOfLines={1}>
                    {event.name}
                  </Text>
                  <Text style={[styles.eventOptionDate, { color: theme.colors.textSecondary }]}>
                    {new Date(event.date).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Post Actions */}
          <View style={styles.postActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleUploadMedia}
              activeOpacity={0.7}
            >
              <Ionicons name="image-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Photo/Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Alert.alert('Coming Soon', 'Location tagging will be available soon')}
              activeOpacity={0.7}
            >
              <Ionicons name="location-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Location</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => Alert.alert('Coming Soon', 'Tagging people will be available soon')}
              activeOpacity={0.7}
            >
              <Ionicons name="people-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.actionText, { color: theme.colors.primary }]}>Tag People</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Tips for Great Posts
          </Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Ionicons name="bulb-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                Share your experience and excitement about the event
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="camera-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                Use high-quality photos and videos
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="hashtag-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
                Add relevant hashtags to reach more people
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>

    {/* Video Recorder Modal */}
    <Modal
      visible={showVideoRecorder}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <VideoRecorder
        onVideoRecorded={handleVideoRecorded}
        onClose={() => setShowVideoRecorder(false)}
      />
    </Modal>

    {/* Video Editor Modal */}
    <Modal
      visible={showVideoEditor}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <VideoEditor
        videoUri={recordedVideoUri!}
        onSave={handleVideoEdited}
        onClose={() => {
          setShowVideoEditor(false);
          setRecordedVideoUri(null);
        }}
      />
    </Modal>

    {/* Media Upload Modal */}
    <Modal
      visible={showMediaUpload}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowMediaUpload(false)}
          >
            <Ionicons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Upload Media</Text>
          <View style={styles.placeholder} />
        </View>
        <MediaUpload
          contextType="post"
          contextId="temp-post-id"
          mediaType="all"
          maxFiles={10}
          onUploadComplete={handleMediaUploadComplete}
          onUploadError={handleMediaUploadError}
          style={styles.mediaUploadContainer}
        />
      </View>
    </Modal>
  </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  mediaUploadContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  postButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createOptionsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  createOptions: {
    gap: 12,
  },
  createOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
  },
  quickPostSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  mediaPreview: {
    position: 'relative',
    marginBottom: 16,
  },
  mediaImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
  },
  captionContainer: {
    marginBottom: 20,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  characterCount: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  eventSelection: {
    marginBottom: 20,
  },
  eventSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  eventScroll: {
    marginHorizontal: -20,
  },
  eventScrollContent: {
    paddingHorizontal: 20,
  },
  eventOption: {
    width: 120,
    marginRight: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.border,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  eventOptionImage: {
    width: '100%',
    height: 60,
    borderRadius: 8,
    marginBottom: 8,
  },
  eventOptionName: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventOptionDate: {
    fontSize: 10,
  },
  postActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tipsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});

export default CreateScreen;
