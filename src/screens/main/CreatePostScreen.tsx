import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  FlatList,
  Dimensions,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MediaUpload } from '../../components/MediaUpload';

interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video';
  duration?: number;
}

interface Location {
  id: string;
  name: string;
  address: string;
  distance?: string;
}

interface AudienceOption {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const { width } = Dimensions.get('window');

const CreatePostScreen: React.FC = () => {
  const [postText, setPostText] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<MediaItem[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<AudienceOption | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showAudiencePicker, setShowAudiencePicker] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [uploadedMediaAssets, setUploadedMediaAssets] = useState<any[]>([]);

  const mockLocations: Location[] = [
    {
      id: '1',
      name: 'Central Park',
      address: 'New York, NY',
      distance: '0.5 mi away',
    },
    {
      id: '2',
      name: 'Times Square',
      address: 'Manhattan, NY',
      distance: '1.2 mi away',
    },
    {
      id: '3',
      name: 'Brooklyn Bridge',
      address: 'Brooklyn, NY',
      distance: '2.1 mi away',
    },
  ];

  const audienceOptions: AudienceOption[] = [
    {
      id: 'public',
      name: 'Public',
      description: 'Anyone can see this post',
      icon: 'globe',
      color: '#00ff88',
    },
    {
      id: 'friends',
      name: 'Friends',
      description: 'Only your friends can see this post',
      icon: 'people',
      color: '#1DA1F2',
    },
    {
      id: 'private',
      name: 'Private',
      description: 'Only you can see this post',
      icon: 'lock-closed',
      color: '#ffaa00',
    },
  ];

  const handleAddMedia = () => {
    setShowMediaUpload(true);
  };

  const handleMediaUploadComplete = (mediaAssets: any[]) => {
    setUploadedMediaAssets(mediaAssets);
    const newMediaItems: MediaItem[] = mediaAssets.map(asset => ({
      id: asset.id,
      uri: asset.url,
      type: asset.media_type === 'video' ? 'video' : 'image',
      duration: asset.duration,
    }));
    setSelectedMedia(prev => [...prev, ...newMediaItems]);
    setShowMediaUpload(false);
  };

  const handleMediaUploadError = (error: string) => {
    Alert.alert('Upload Error', error);
    setShowMediaUpload(false);
  };

  const handleRemoveMedia = (mediaId: string) => {
    setSelectedMedia(prev => prev.filter(media => media.id !== mediaId));
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setShowLocationPicker(false);
  };

  const handleAudienceSelect = (audience: AudienceOption) => {
    setSelectedAudience(audience);
    setShowAudiencePicker(false);
  };

  const handlePublish = () => {
    if (!postText.trim() && selectedMedia.length === 0) {
      Alert.alert('Empty Post', 'Please add some text or media to your post.');
      return;
    }

    setIsPublishing(true);
    
    // Simulate publishing
    setTimeout(() => {
      setIsPublishing(false);
      Alert.alert(
        'Success!',
        'Your post has been published successfully!',
        [{ text: 'OK', onPress: () => console.log('Post published') }]
      );
    }, 2000);
  };

  const renderMediaGrid = () => {
    if (selectedMedia.length === 0) {
      return (
        <TouchableOpacity style={styles.addMediaButton} onPress={handleAddMedia}>
          <Ionicons name="add" size={32} color="#00ff88" />
          <Text style={styles.addMediaText}>Add Photo or Video</Text>
        </TouchableOpacity>
      );
    }

    return (
      <View style={styles.mediaContainer}>
        <View style={styles.mediaHeader}>
          <Text style={styles.mediaTitle}>Media ({selectedMedia.length})</Text>
          <TouchableOpacity style={styles.addMoreButton} onPress={handleAddMedia}>
            <Ionicons name="add" size={20} color="#00ff88" />
            <Text style={styles.addMoreText}>Add More</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={selectedMedia}
          horizontal
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.mediaItem}>
              <Image source={{ uri: item.uri }} style={styles.mediaImage} />
              {item.type === 'video' && (
                <View style={styles.videoOverlay}>
                  <Ionicons name="play" size={24} color="white" />
                  <Text style={styles.videoDuration}>{item.duration}s</Text>
                </View>
              )}
              <TouchableOpacity 
                style={styles.removeMediaButton}
                onPress={() => handleRemoveMedia(item.id)}
              >
                <Ionicons name="close" size={16} color="white" />
              </TouchableOpacity>
            </View>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
    );
  };

  const renderLocationPicker = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose Location</Text>
          <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={mockLocations}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.locationItem}
              onPress={() => handleLocationSelect(item)}
            >
              <Ionicons name="location" size={20} color="#00ff88" />
              <View style={styles.locationInfo}>
                <Text style={styles.locationName}>{item.name}</Text>
                <Text style={styles.locationAddress}>{item.address}</Text>
              </View>
              {item.distance && (
                <Text style={styles.locationDistance}>{item.distance}</Text>
              )}
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
    </View>
  );

  const renderAudiencePicker = () => (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Choose Audience</Text>
          <TouchableOpacity onPress={() => setShowAudiencePicker(false)}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={audienceOptions}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.audienceItem}
              onPress={() => handleAudienceSelect(item)}
            >
              <View style={[styles.audienceIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={20} color="white" />
              </View>
              <View style={styles.audienceInfo}>
                <Text style={styles.audienceName}>{item.name}</Text>
                <Text style={styles.audienceDescription}>{item.description}</Text>
              </View>
              {selectedAudience?.id === item.id && (
                <Ionicons name="checkmark" size={20} color="#00ff88" />
              )}
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item.id}
        />
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
        <TouchableOpacity 
          style={[
            styles.publishButton, 
            (!postText.trim() && selectedMedia.length === 0) && styles.publishButtonDisabled
          ]}
          onPress={handlePublish}
          disabled={!postText.trim() && selectedMedia.length === 0 || isPublishing}
        >
          <Text style={[
            styles.publishButtonText,
            (!postText.trim() && selectedMedia.length === 0) && styles.publishButtonTextDisabled
          ]}>
            {isPublishing ? 'Publishing...' : 'Publish'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* User Info */}
        <View style={styles.userSection}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100' }} 
            style={styles.userAvatar} 
          />
          <View style={styles.userInfo}>
            <Text style={styles.userName}>Sarah Dancer</Text>
            <TouchableOpacity 
              style={styles.audienceSelector}
              onPress={() => setShowAudiencePicker(true)}
            >
              <Ionicons 
                name={selectedAudience?.icon as any || 'globe'} 
                size={16} 
                color={selectedAudience?.color || '#00ff88'} 
              />
              <Text style={styles.audienceText}>
                {selectedAudience?.name || 'Public'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#a3a3a3" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Post Text Input */}
        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="What's happening?"
            placeholderTextColor="#a3a3a3"
            value={postText}
            onChangeText={setPostText}
            multiline
            textAlignVertical="top"
          />
        </View>

        {/* Media Grid */}
        {renderMediaGrid()}

        {/* Post Options */}
        <View style={styles.optionsSection}>
          <Text style={styles.optionsTitle}>Add to your post</Text>
          
          <View style={styles.optionsGrid}>
            <TouchableOpacity style={styles.optionButton} onPress={handleAddMedia}>
              <View style={[styles.optionIcon, { backgroundColor: '#00ff88' }]}>
                <Ionicons name="image" size={20} color="white" />
              </View>
              <Text style={styles.optionText}>Photo/Video</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.optionButton}
              onPress={() => setShowLocationPicker(true)}
            >
              <View style={[styles.optionIcon, { backgroundColor: '#1DA1F2' }]}>
                <Ionicons name="location" size={20} color="white" />
              </View>
              <Text style={styles.optionText}>Location</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton}>
              <View style={[styles.optionIcon, { backgroundColor: '#E4405F' }]}>
                <Ionicons name="happy" size={20} color="white" />
              </View>
              <Text style={styles.optionText}>Feeling</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton}>
              <View style={[styles.optionIcon, { backgroundColor: '#FF6B35' }]}>
                <Ionicons name="calendar" size={20} color="white" />
              </View>
              <Text style={styles.optionText}>Event</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Selected Location */}
        {selectedLocation && (
          <View style={styles.selectedLocation}>
            <View style={styles.locationHeader}>
              <Text style={styles.locationTitle}>Location</Text>
              <TouchableOpacity onPress={() => setSelectedLocation(null)}>
                <Ionicons name="close" size={16} color="#a3a3a3" />
              </TouchableOpacity>
            </View>
            <View style={styles.locationDisplay}>
              <Ionicons name="location" size={16} color="#00ff88" />
              <Text style={styles.locationDisplayText}>{selectedLocation.name}</Text>
            </View>
          </View>
        )}

        {/* Post Preview */}
        {(postText.trim() || selectedMedia.length > 0) && (
          <View style={styles.previewSection}>
            <Text style={styles.previewTitle}>Preview</Text>
            <View style={styles.previewContent}>
              <View style={styles.previewHeader}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50' }} 
                  style={styles.previewAvatar} 
                />
                <View style={styles.previewUserInfo}>
                  <Text style={styles.previewUserName}>Sarah Dancer</Text>
                  <Text style={styles.previewTime}>Just now</Text>
                </View>
              </View>
              
              {postText.trim() && (
                <Text style={styles.previewText}>{postText}</Text>
              )}
              
              {selectedMedia.length > 0 && (
                <View style={styles.previewMedia}>
                  <Image 
                    source={{ uri: selectedMedia[0].uri }} 
                    style={styles.previewImage} 
                  />
                  {selectedMedia.length > 1 && (
                    <View style={styles.mediaCount}>
                      <Text style={styles.mediaCountText}>+{selectedMedia.length - 1}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      {showLocationPicker && renderLocationPicker()}
      {showAudiencePicker && renderAudiencePicker()}

      {/* Media Upload Modal */}
      <Modal
        visible={showMediaUpload}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <View style={styles.mediaModalContainer}>
          <View style={styles.mediaModalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowMediaUpload(false)}
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.mediaModalTitle}>Upload Media</Text>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#a3a3a3',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  publishButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishButtonDisabled: {
    backgroundColor: '#333333',
  },
  publishButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  publishButtonTextDisabled: {
    color: '#a3a3a3',
  },
  content: {
    flex: 1,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  audienceSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  audienceText: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  textInputContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  textInput: {
    fontSize: 18,
    color: 'white',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  mediaContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  mediaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  mediaTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addMoreText: {
    fontSize: 14,
    color: '#00ff88',
  },
  addMediaButton: {
    borderWidth: 2,
    borderColor: '#333333',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 40,
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  addMediaText: {
    fontSize: 16,
    color: '#a3a3a3',
    marginTop: 8,
  },
  mediaItem: {
    position: 'relative',
    marginRight: 12,
  },
  mediaImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoDuration: {
    fontSize: 12,
    color: 'white',
    marginTop: 4,
  },
  removeMediaButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  optionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#262626',
    borderRadius: 20,
  },
  optionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 14,
    color: 'white',
  },
  selectedLocation: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#262626',
    borderRadius: 12,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  locationDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationDisplayText: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  previewSection: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#262626',
    borderRadius: 12,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  previewContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  previewUserInfo: {
    flex: 1,
  },
  previewUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  previewTime: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  previewText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    marginBottom: 8,
  },
  previewMedia: {
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  mediaCount: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mediaCountText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#262626',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  locationInfo: {
    flex: 1,
    marginLeft: 12,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  locationAddress: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  locationDistance: {
    fontSize: 12,
    color: '#00ff88',
  },
  audienceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  audienceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audienceInfo: {
    flex: 1,
    marginLeft: 12,
  },
  audienceName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  audienceDescription: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  mediaModalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  mediaModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  closeButton: {
    padding: 8,
  },
  mediaModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  mediaUploadContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
});

export default CreatePostScreen;
