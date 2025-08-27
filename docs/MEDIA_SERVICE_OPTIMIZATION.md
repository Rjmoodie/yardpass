# 🎬 Media Service Optimization

## 📋 **Overview**

The Media Service has been completely optimized to provide a unified, robust, and scalable solution for all media uploads across the YardPass platform. This replaces the fragmented approach with a single, comprehensive service that handles images, videos, and audio for events, posts, profiles, and organizations.

## 🎯 **Key Improvements**

### **✅ Unified Architecture**
- **Single Edge Function**: `media-service` replaces multiple fragmented functions
- **Universal Support**: Images, videos, and audio for all contexts
- **Consistent API**: One interface for all media operations
- **Centralized Storage**: Unified `media-assets` bucket with organized structure

### **✅ Enhanced Features**
- **Multi-Context Support**: Events, posts, profiles, organizations
- **Advanced Processing**: Optimization, resizing, video conversion
- **Progress Tracking**: Real-time upload progress and status
- **Error Handling**: Comprehensive error management and retry logic
- **Analytics**: Usage tracking and performance metrics

### **✅ Performance Optimizations**
- **Efficient Storage**: Optimized file organization and naming
- **Smart Caching**: Intelligent caching strategies
- **Batch Processing**: Support for multiple file uploads
- **Compression**: Automatic image and video optimization

## 🏗️ **Architecture**

### **Database Schema**
```sql
-- Core media assets table
media_assets (
  id, uploader_id, context_type, context_id,
  media_type, content_type, url, thumbnail_url,
  storage_path, filename, file_size,
  width, height, duration, title, description,
  tags, metadata, status, access_level
)

-- Processing queue for background tasks
media_processing_queue (
  id, media_asset_id, processing_type,
  priority, status, parameters, result_url
)

-- Usage analytics
media_analytics (
  id, media_asset_id, views_count,
  downloads_count, shares_count, likes_count
)

-- Collections for organization
media_collections (
  id, name, description, owner_id,
  owner_type, is_public, access_level
)
```

### **Storage Structure**
```
media-assets/
├── events/
│   └── {event_id}/
│       ├── cover/
│       ├── gallery/
│       └── videos/
├── posts/
│   └── {post_id}/
│       ├── images/
│       └── videos/
├── profiles/
│   └── {user_id}/
│       ├── avatars/
│       └── galleries/
└── organizations/
    └── {org_id}/
        ├── logos/
        ├── banners/
        └── media/
```

## 🚀 **API Reference**

### **Upload Media**
```typescript
// Upload a single media file
const response = await apiGateway.uploadMedia({
  media_data: base64String,
  media_type: 'image' | 'video' | 'audio',
  content_type: 'image/jpeg',
  context_type: 'event' | 'post' | 'profile' | 'organization',
  context_id: 'uuid',
  filename: 'my-image.jpg',
  title: 'Event Cover Image',
  description: 'Main event banner',
  tags: ['cover', 'banner'],
  optimize: true,
  resize: {
    width: 1920,
    height: 1080,
    quality: 85
  },
  convert_video: {
    format: 'mp4',
    quality: 'high'
  }
});
```

### **Get Media Assets**
```typescript
// Get all media for an event
const response = await apiGateway.getMediaAssets(
  'event',
  eventId,
  'image', // optional media type filter
  50,      // limit
  0        // offset
);
```

### **Delete Media Asset**
```typescript
// Delete a media asset
const response = await apiGateway.deleteMediaAsset(mediaId);
```

## 🎨 **Frontend Integration**

### **MediaUpload Component**
```tsx
import { MediaUpload } from '../components/MediaUpload';

// Event media upload
<MediaUpload
  contextType="event"
  contextId={eventId}
  mediaType="all"
  maxFiles={10}
  onUploadComplete={(mediaAssets) => {
    console.log('Upload completed:', mediaAssets);
    // Update event with new media
  }}
  onUploadError={(error) => {
    console.error('Upload failed:', error);
  }}
  onUploadProgress={(progress) => {
    console.log('Upload progress:', progress);
  }}
/>

// Post media upload
<MediaUpload
  contextType="post"
  contextId={postId}
  mediaType="image"
  maxFiles={5}
  onUploadComplete={(mediaAssets) => {
    // Update post with media URLs
  }}
/>

// Profile avatar upload
<MediaUpload
  contextType="profile"
  contextId={userId}
  mediaType="image"
  maxFiles={1}
  onUploadComplete={(mediaAssets) => {
    // Update profile avatar
  }}
/>
```

### **Media Display Component**
```tsx
import { MediaDisplay } from '../components/MediaDisplay';

// Display event media
<MediaDisplay
  contextType="event"
  contextId={eventId}
  mediaType="image"
  layout="grid"
  onMediaPress={(media) => {
    // Open media viewer
  }}
/>

// Display post media
<MediaDisplay
  contextType="post"
  contextId={postId}
  layout="carousel"
  showThumbnails={true}
/>
```

## 🔧 **Configuration**

### **Environment Variables**
```bash
# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# Media Processing (Optional)
CLOUDINARY_URL=your_cloudinary_url
FFMPEG_PATH=/usr/bin/ffmpeg

# Storage Configuration
MAX_FILE_SIZE_IMAGE=10485760    # 10MB
MAX_FILE_SIZE_VIDEO=104857600   # 100MB
MAX_FILE_SIZE_AUDIO=52428800    # 50MB
```

### **Storage Bucket Setup**
```sql
-- Create media-assets bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('media-assets', 'media-assets', true);

-- Set up RLS policies
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'media-assets');

CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'media-assets' 
  AND auth.role() = 'authenticated'
);
```

## 📊 **Usage Examples**

### **Event Media Management**
```typescript
// Upload event cover image
const coverImage = await apiGateway.uploadMedia({
  media_data: coverImageBase64,
  media_type: 'image',
  content_type: 'image/jpeg',
  context_type: 'event',
  context_id: eventId,
  filename: 'event-cover.jpg',
  title: 'Event Cover',
  optimize: true,
  resize: { width: 1920, height: 1080 }
});

// Upload event gallery
const galleryImages = await Promise.all(
  imageFiles.map(file => 
    apiGateway.uploadMedia({
      media_data: file.base64,
      media_type: 'image',
      content_type: file.type,
      context_type: 'event',
      context_id: eventId,
      filename: file.name,
      optimize: true
    })
  )
);

// Get event media
const eventMedia = await apiGateway.getMediaAssets('event', eventId);
```

### **Post Media Management**
```typescript
// Upload post images
const postMedia = await apiGateway.uploadMedia({
  media_data: imageBase64,
  media_type: 'image',
  content_type: 'image/png',
  context_type: 'post',
  context_id: postId,
  filename: 'post-image.png',
  optimize: true
});

// Get post media
const postImages = await apiGateway.getMediaAssets('post', postId, 'image');
```

### **Profile Media Management**
```typescript
// Upload profile avatar
const avatar = await apiGateway.uploadMedia({
  media_data: avatarBase64,
  media_type: 'image',
  content_type: 'image/jpeg',
  context_type: 'profile',
  context_id: userId,
  filename: 'avatar.jpg',
  optimize: true,
  resize: { width: 400, height: 400 }
});

// Get profile media
const profileMedia = await apiGateway.getMediaAssets('profile', userId);
```

## 🔍 **Error Handling**

### **Common Error Scenarios**
```typescript
// File too large
if (fileSize > maxSize) {
  throw new Error(`File too large. Maximum size is ${formatFileSize(maxSize)}`);
}

// Invalid file type
if (!allowedTypes.includes(contentType)) {
  throw new Error('Invalid file type');
}

// Permission denied
if (!hasPermission) {
  throw new Error('Permission denied');
}

// Upload failed
if (uploadError) {
  throw new Error('Failed to upload media');
}
```

### **Retry Logic**
```typescript
// Automatic retry for failed uploads
const uploadWithRetry = async (params, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiGateway.uploadMedia(params);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};
```

## 📈 **Analytics & Monitoring**

### **Usage Tracking**
```typescript
// Track media views
await supabase.rpc('update_media_analytics', {
  p_media_asset_id: mediaId,
  p_action: 'view',
  p_metadata: {
    load_time_ms: 150,
    bandwidth_used_bytes: 1024000
  }
});

// Track media interactions
await supabase.rpc('update_media_analytics', {
  p_media_asset_id: mediaId,
  p_action: 'like'
});
```

### **Performance Metrics**
- **Upload Success Rate**: Track successful vs failed uploads
- **Processing Time**: Monitor media optimization performance
- **Storage Usage**: Track storage consumption and costs
- **User Engagement**: Monitor media views and interactions

## 🔒 **Security & Permissions**

### **Access Control**
```typescript
// Check user permissions
const hasPermission = await validatePermissions(
  userId, 
  contextType, 
  contextId
);

// Context-specific permissions
switch (contextType) {
  case 'event':
    // User must be event creator or organization member
    break;
  case 'post':
    // User must be post author
    break;
  case 'profile':
    // User can only upload to their own profile
    break;
  case 'organization':
    // User must be organization admin/owner
    break;
}
```

### **File Validation**
```typescript
// Validate file size
const maxSize = getMaxFileSize(mediaType);
if (fileSize > maxSize) {
  throw new Error('File too large');
}

// Validate file type
const allowedTypes = ['image/jpeg', 'image/png', 'video/mp4'];
if (!allowedTypes.includes(contentType)) {
  throw new Error('Invalid file type');
}

// Validate file content
const isValidFile = await validateFileContent(fileData);
if (!isValidFile) {
  throw new Error('Invalid file content');
}
```

## 🚀 **Deployment**

### **1. Deploy Database Schema**
```bash
# Run the media assets schema
psql $DATABASE_URL -f docs/sql/MEDIA_ASSETS_SCHEMA.sql
```

### **2. Deploy Edge Function**
```bash
# Deploy the unified media service
supabase functions deploy media-service
```

### **3. Update Frontend**
```bash
# Install new dependencies
npm install expo-image-picker expo-document-picker

# Update API gateway imports
# Replace old upload methods with new unified methods
```

### **4. Test Integration**
```typescript
// Test media upload
const testUpload = await apiGateway.uploadMedia({
  media_data: testImageBase64,
  media_type: 'image',
  content_type: 'image/jpeg',
  context_type: 'event',
  context_id: testEventId,
  optimize: true
});

console.log('Upload result:', testUpload);
```

## 📚 **Migration Guide**

### **From Old Upload Functions**
```typescript
// OLD: upload-event-image
const oldUpload = await apiGateway.uploadEventImage(eventId, imageData, 'cover');

// NEW: unified media service
const newUpload = await apiGateway.uploadMedia({
  media_data: imageData,
  media_type: 'image',
  content_type: 'image/jpeg',
  context_type: 'event',
  context_id: eventId,
  filename: 'cover-image.jpg'
});
```

### **From Old Media Services**
```typescript
// OLD: multiple services
const imageUpload = await imageService.upload(file);
const videoUpload = await videoService.upload(file);

// NEW: single unified service
const mediaUpload = await apiGateway.uploadMedia({
  media_data: file.base64,
  media_type: file.type.startsWith('image/') ? 'image' : 'video',
  content_type: file.type,
  context_type: 'event',
  context_id: eventId
});
```

## 🎉 **Benefits**

### **✅ Developer Experience**
- **Single API**: One interface for all media operations
- **Type Safety**: Full TypeScript support
- **Error Handling**: Comprehensive error management
- **Documentation**: Complete API documentation

### **✅ User Experience**
- **Drag & Drop**: Intuitive file upload interface
- **Progress Tracking**: Real-time upload progress
- **Preview**: Instant media previews
- **Batch Upload**: Multiple file support

### **✅ Performance**
- **Optimization**: Automatic image and video optimization
- **Caching**: Intelligent caching strategies
- **CDN**: Global content delivery
- **Compression**: Efficient file compression

### **✅ Scalability**
- **Storage**: Scalable cloud storage
- **Processing**: Background media processing
- **Analytics**: Comprehensive usage tracking
- **Collections**: Organized media management

## 🔮 **Future Enhancements**

### **Planned Features**
- **AI Processing**: Automatic image tagging and enhancement
- **Video Streaming**: Adaptive bitrate streaming
- **Live Streaming**: Real-time video streaming
- **3D Media**: Support for 3D models and VR content
- **Advanced Analytics**: Machine learning insights

### **Integration Opportunities**
- **Cloudinary**: Advanced image and video processing
- **Mux**: Professional video streaming
- **AWS MediaConvert**: Enterprise video processing
- **Google Cloud Vision**: AI-powered image analysis

---

**🎬 The Media Service is now production-ready and optimized for scale!**
