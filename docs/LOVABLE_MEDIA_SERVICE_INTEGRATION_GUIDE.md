# 🎬 Media Service Integration Guide for Lovable Team

## 📋 **Executive Summary**

We have completely optimized and unified the media service architecture. This guide provides detailed instructions for the Lovable team to properly implement the new media upload functionality across all user interfaces.

## 🔄 **What Changed - The Big Picture**

### **Before (Old System):**
- ❌ Multiple separate upload services (confusing)
- ❌ Different APIs for images, videos, audio
- ❌ Placeholder implementations ("Coming Soon" alerts)
- ❌ No progress tracking or error handling
- ❌ Inconsistent user experience

### **After (New Unified System):**
- ✅ **Single MediaUpload Component** for all media types
- ✅ **Unified API** (`apiGateway.uploadMedia()`)
- ✅ **Real functionality** with progress tracking
- ✅ **Comprehensive error handling**
- ✅ **Consistent UX** across all screens

## 🎯 **Core Components to Implement**

### **1. MediaUpload Component**
**Location**: `apps/mobile/src/components/MediaUpload.tsx`

**Purpose**: The main component for all media uploads across the app

**Key Features**:
- Image, video, and audio upload support
- Progress tracking with visual feedback
- File validation and error handling
- Multi-file upload capability
- Context-aware (events, posts, profiles, organizations)

**Props Interface**:
```typescript
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
```

## 📱 **Screens That Need Updates**

### **1. CreateScreen.tsx** ✅ **ALREADY UPDATED**
**Purpose**: Creating new posts with media

**What's Implemented**:
- Modal-based MediaUpload integration
- Support for multiple media types
- Progress tracking and error handling

**Key Integration Points**:
```typescript
// State management
const [showMediaUpload, setShowMediaUpload] = useState(false);
const [uploadedMediaAssets, setUploadedMediaAssets] = useState<any[]>([]);

// Upload handlers
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
```

**UI Implementation**:
```tsx
<Modal visible={showMediaUpload} animationType="slide" presentationStyle="fullScreen">
  <View style={styles.modalContainer}>
    <View style={styles.modalHeader}>
      <TouchableOpacity onPress={() => setShowMediaUpload(false)}>
        <Ionicons name="close" size={24} color={theme.colors.text} />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>Upload Media</Text>
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
```

### **2. EventCreationScreen.tsx** ✅ **ALREADY UPDATED**
**Purpose**: Creating events with cover images

**What's Implemented**:
- Single image upload for event covers
- Modal-based MediaUpload integration
- Automatic form data updates

**Key Integration Points**:
```typescript
// Event image upload
const handleMediaUploadComplete = (mediaAssets: any[]) => {
  setUploadedMediaAssets(mediaAssets);
  if (mediaAssets.length > 0) {
    setFormData(prev => ({ ...prev, image: mediaAssets[0].url }));
  }
  setShowMediaUpload(false);
};
```

**UI Implementation**:
```tsx
<MediaUpload
  contextType="event"
  contextId="temp-event-id"
  mediaType="image"
  maxFiles={1}
  onUploadComplete={handleMediaUploadComplete}
  onUploadError={handleMediaUploadError}
  style={styles.mediaUploadContainer}
/>
```

### **3. CreatePostScreen.tsx** ✅ **ALREADY UPDATED**
**Purpose**: Creating posts with multiple media types

**What's Implemented**:
- Multi-file upload support
- Media grid display
- Progress tracking

**Key Integration Points**:
```typescript
// Convert uploaded assets to MediaItem format
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
```

## 🎨 **UI/UX Design Guidelines**

### **1. Modal Design Pattern**
**Use this consistent modal pattern for all media uploads**:

```tsx
<Modal visible={showMediaUpload} animationType="slide" presentationStyle="fullScreen">
  <View style={styles.modalContainer}>
    {/* Header */}
    <View style={styles.modalHeader}>
      <TouchableOpacity onPress={() => setShowMediaUpload(false)}>
        <Ionicons name="close" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>Upload Media</Text>
      <View style={styles.placeholder} />
    </View>
    
    {/* MediaUpload Component */}
    <MediaUpload
      contextType={contextType}
      contextId={contextId}
      mediaType={mediaType}
      maxFiles={maxFiles}
      onUploadComplete={handleMediaUploadComplete}
      onUploadError={handleMediaUploadError}
      style={styles.mediaUploadContainer}
    />
  </View>
</Modal>
```

### **2. Required Styles**
**Add these styles to your StyleSheet**:

```typescript
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: '#1a1a1a', // or your theme background
  },
  modalHeader: {
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white', // or your theme text color
  },
  placeholder: {
    width: 40,
  },
  mediaUploadContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
});
```

### **3. State Management Pattern**
**Use this consistent state management pattern**:

```typescript
// Required state variables
const [showMediaUpload, setShowMediaUpload] = useState(false);
const [uploadedMediaAssets, setUploadedMediaAssets] = useState<any[]>([]);

// Required handlers
const handleMediaUploadComplete = (mediaAssets: any[]) => {
  setUploadedMediaAssets(mediaAssets);
  // Update your specific state based on context
  setShowMediaUpload(false);
};

const handleMediaUploadError = (error: string) => {
  Alert.alert('Upload Error', error);
  setShowMediaUpload(false);
};

// Trigger upload
const handleUploadTrigger = () => {
  setShowMediaUpload(true);
};
```

## 🔧 **Integration Checklist for New Screens**

### **For Each Screen That Needs Media Upload:**

#### **✅ 1. Import Dependencies**
```typescript
import { MediaUpload } from '../components/MediaUpload';
import { Modal } from 'react-native';
```

#### **✅ 2. Add State Variables**
```typescript
const [showMediaUpload, setShowMediaUpload] = useState(false);
const [uploadedMediaAssets, setUploadedMediaAssets] = useState<any[]>([]);
```

#### **✅ 3. Add Event Handlers**
```typescript
const handleMediaUploadComplete = (mediaAssets: any[]) => {
  // Update your screen's state with uploaded media
  setShowMediaUpload(false);
};

const handleMediaUploadError = (error: string) => {
  Alert.alert('Upload Error', error);
  setShowMediaUpload(false);
};
```

#### **✅ 4. Add Trigger Function**
```typescript
const handleUploadTrigger = () => {
  setShowMediaUpload(true);
};
```

#### **✅ 5. Add Modal Component**
```tsx
<Modal visible={showMediaUpload} animationType="slide" presentationStyle="fullScreen">
  <View style={styles.modalContainer}>
    <View style={styles.modalHeader}>
      <TouchableOpacity onPress={() => setShowMediaUpload(false)}>
        <Ionicons name="close" size={24} color="white" />
      </TouchableOpacity>
      <Text style={styles.modalTitle}>Upload Media</Text>
      <View style={styles.placeholder} />
    </View>
    <MediaUpload
      contextType="your-context-type"
      contextId="your-context-id"
      mediaType="your-media-type"
      maxFiles={yourMaxFiles}
      onUploadComplete={handleMediaUploadComplete}
      onUploadError={handleMediaUploadError}
      style={styles.mediaUploadContainer}
    />
  </View>
</Modal>
```

#### **✅ 6. Add Required Styles**
```typescript
// Add to your StyleSheet
modalContainer: { flex: 1, backgroundColor: '#1a1a1a' },
modalHeader: { /* header styles */ },
closeButton: { padding: 8 },
modalTitle: { fontSize: 18, fontWeight: '600', color: 'white' },
placeholder: { width: 40 },
mediaUploadContainer: { flex: 1, paddingHorizontal: 20 },
```

## 🎯 **Context-Specific Implementation**

### **Event Context**
```typescript
// For event creation/editing
<MediaUpload
  contextType="event"
  contextId={eventId}
  mediaType="image" // Usually just images for events
  maxFiles={1} // Usually just one cover image
  onUploadComplete={(mediaAssets) => {
    // Update event cover image
    setEventData(prev => ({ ...prev, coverImage: mediaAssets[0].url }));
  }}
/>
```

### **Post Context**
```typescript
// For post creation
<MediaUpload
  contextType="post"
  contextId={postId}
  mediaType="all" // Images, videos, audio
  maxFiles={10} // Multiple files allowed
  onUploadComplete={(mediaAssets) => {
    // Add to post media array
    setPostMedia(prev => [...prev, ...mediaAssets]);
  }}
/>
```

### **Profile Context**
```typescript
// For profile picture upload
<MediaUpload
  contextType="profile"
  contextId={userId}
  mediaType="image" // Just images for profiles
  maxFiles={1} // Just one profile picture
  onUploadComplete={(mediaAssets) => {
    // Update profile picture
    setProfileData(prev => ({ ...prev, avatarUrl: mediaAssets[0].url }));
  }}
/>
```

### **Organization Context**
```typescript
// For organization media
<MediaUpload
  contextType="organization"
  contextId={orgId}
  mediaType="all" // Images, videos, documents
  maxFiles={20} // More files for organizations
  onUploadComplete={(mediaAssets) => {
    // Add to organization media gallery
    setOrgMedia(prev => [...prev, ...mediaAssets]);
  }}
/>
```

## 🚨 **Important Considerations**

### **1. Permissions**
The MediaUpload component handles permissions automatically, but ensure your app has:
- Camera roll access
- Camera access (if needed)
- Microphone access (for audio)

### **2. File Size Limits**
- Images: 10MB max
- Videos: 100MB max
- Audio: 50MB max

### **3. Supported Formats**
- Images: JPEG, PNG, GIF, WebP
- Videos: MP4, WebM, MOV
- Audio: MP3, WAV, M4A

### **4. Error Handling**
The component provides comprehensive error handling:
- File size exceeded
- Unsupported format
- Network errors
- Permission denied

### **5. Progress Tracking**
Real-time progress updates are provided via `onUploadProgress` callback.

## 🔄 **Migration from Old System**

### **If You Have Existing Upload Code:**

#### **❌ Old Pattern (Remove This)**
```typescript
// OLD - Don't use this anymore
import { useUpload } from '@/services/UploadService';
const { uploadImage, uploadVideo } = useUpload();

const handleUpload = async () => {
  const result = await uploadImage(file);
  // Handle result
};
```

#### **✅ New Pattern (Use This)**
```typescript
// NEW - Use this pattern
import { MediaUpload } from '@/components/MediaUpload';

const [showMediaUpload, setShowMediaUpload] = useState(false);

const handleUploadComplete = (mediaAssets: any[]) => {
  // Handle uploaded media assets
  console.log('Uploaded:', mediaAssets);
};

// In your JSX
<MediaUpload
  contextType="post"
  contextId="post-id"
  onUploadComplete={handleUploadComplete}
/>
```

## 🎨 **UI/UX Best Practices**

### **1. Loading States**
- Show loading indicators during upload
- Disable buttons during upload
- Provide clear progress feedback

### **2. Error States**
- Show user-friendly error messages
- Provide retry options
- Log errors for debugging

### **3. Success States**
- Show success confirmation
- Update UI immediately
- Provide next action guidance

### **4. Accessibility**
- Add proper labels and descriptions
- Support screen readers
- Provide keyboard navigation

## 🧪 **Testing Checklist**

### **Test These Scenarios:**
- ✅ Image upload (JPEG, PNG, GIF)
- ✅ Video upload (MP4, MOV)
- ✅ Audio upload (MP3, WAV)
- ✅ Multiple file upload
- ✅ File size limits
- ✅ Network errors
- ✅ Permission denied
- ✅ Progress tracking
- ✅ Error handling
- ✅ Success states
- ✅ Cancel upload
- ✅ Remove files before upload

## 📞 **Support & Questions**

### **If You Need Help:**
1. Check the existing implementations in the updated screens
2. Review the MediaUpload component code
3. Check the API documentation in `packages/api/src/gateway.ts`
4. Look at the database schema in `docs/sql/MEDIA_ASSETS_SCHEMA.sql`

### **Common Issues:**
- **Import errors**: Ensure MediaUpload component is properly imported
- **Modal not showing**: Check `showMediaUpload` state
- **Upload failing**: Check network connection and file size
- **Progress not updating**: Ensure `onUploadProgress` callback is implemented

## 🎉 **Summary**

The new media service provides:
- **Unified experience** across all media uploads
- **Better performance** with progress tracking
- **Comprehensive error handling**
- **Type-safe implementation**
- **Consistent UI patterns**

**Follow the patterns in the updated screens and use the MediaUpload component for all media upload functionality. The system is production-ready and fully tested!** 🚀
