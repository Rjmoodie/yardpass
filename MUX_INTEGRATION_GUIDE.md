# 🎬 Mux Integration Guide for Video Processing

## 📋 Overview

This guide covers the complete Mux integration for professional video processing, streaming, and playback in the YardPass application.

## 🔧 Setup Requirements

### 1. Environment Variables
```bash
# Add to your .env file
MUX_TOKEN_ID=your_mux_token_id
MUX_TOKEN_SECRET=your_mux_token_secret
```

### 2. Mux Account Setup
1. Create a Mux account at [mux.com](https://mux.com)
2. Generate API tokens in the Mux dashboard
3. Configure webhook endpoints (see below)

## 🏗️ Architecture

### Video Upload Flow
```
1. User uploads video → media-upload-sign edge function
2. Creates Mux upload URL → Returns to frontend
3. Frontend uploads to Mux → Mux processes video
4. Mux webhook → mux-webhook edge function
5. Updates database → Video ready for playback
6. User requests video → get-playback-token edge function
7. Returns secure playback URL → Video streams
```

## 🔌 Edge Functions

### 1. media-upload-sign
**Purpose**: Creates upload URLs for videos and images
**Features**:
- ✅ Generates Mux upload URLs for videos
- ✅ Creates Supabase Storage URLs for images
- ✅ Validates user permissions
- ✅ Returns asset IDs and upload URLs

**Request**:
```typescript
{
  filename: "video.mp4",
  content_type: "video/mp4",
  file_size: 10485760,
  event_id: "uuid",
  media_type: "video"
}
```

**Response**:
```typescript
{
  upload_url: "https://storage.supabase.co/...",
  asset_id: "uuid",
  expires_at: "2024-08-29T...",
  mux_upload_url: "https://upload.mux.com/...", // For videos
  mux_asset_id: "mux-asset-id", // For videos
  success: true
}
```

### 2. mux-webhook
**Purpose**: Handles Mux processing events
**Features**:
- ✅ Processes video.asset.ready events
- ✅ Updates database with playback URLs
- ✅ Handles processing errors
- ✅ Generates thumbnails

**Webhook Events**:
- `video.asset.ready` - Video processing complete
- `video.asset.errored` - Processing failed
- `video.upload.asset_created` - Upload started

### 3. get-playback-token
**Purpose**: Generates secure playback URLs
**Features**:
- ✅ Validates user access permissions
- ✅ Returns signed playback URLs
- ✅ Handles both Mux and direct URLs
- ✅ Supports access control

**Request**:
```typescript
{
  media_id: "uuid",
  playback_id: "optional-mux-playback-id"
}
```

**Response**:
```typescript
{
  success: true,
  playback_url: "https://stream.mux.com/playback-id.m3u8",
  expires_at: "2024-08-29T..."
}
```

## 🗄️ Database Schema

### media_assets Table
```sql
CREATE TABLE public.media_assets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id),
    event_id UUID REFERENCES public.events(id),
    type VARCHAR(20) CHECK (type IN ('image', 'video')),
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    duration INTEGER, -- Video duration in seconds
    size INTEGER, -- File size in bytes
    mux_id VARCHAR(255), -- Mux asset ID
    mux_playback_id VARCHAR(255), -- Mux playback ID
    metadata JSONB DEFAULT '{}',
    access_level VARCHAR(20) DEFAULT 'public',
    status VARCHAR(20) DEFAULT 'processing',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes
```sql
CREATE INDEX idx_media_assets_mux_id ON public.media_assets(mux_id);
CREATE INDEX idx_media_assets_status ON public.media_assets(status);
CREATE INDEX idx_media_assets_type ON public.media_assets(type);
```

## 🎯 Frontend Integration

### Upload Video
```typescript
// 1. Get upload URL
const response = await apiGateway.post('/functions/v1/media-upload-sign', {
  filename: file.name,
  content_type: file.type,
  file_size: file.size,
  event_id: eventId,
  media_type: 'video'
});

// 2. Upload to Mux (for videos)
if (response.data.mux_upload_url) {
  await fetch(response.data.mux_upload_url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type }
  });
}

// 3. Upload to Supabase Storage (for images or backup)
await supabase.storage
  .from('event-media')
  .upload(response.data.asset_id, file);
```

### Play Video
```typescript
// Get playback URL
const response = await apiGateway.post('/functions/v1/get-playback-token', {
  media_id: mediaId
});

// Use in video player
const videoUrl = response.data.playback_url;
```

## 🔐 Security Features

### Access Control
- **Media Owner**: Full access to own media
- **Event Attendees**: Access to event media with valid tickets
- **Public Media**: Accessible to all users
- **Private Media**: Owner only

### Secure URLs
- **Signed URLs**: Time-limited access tokens
- **Playback Tokens**: Secure video streaming
- **Permission Validation**: Server-side access checks

## 📊 Video Processing Features

### Automatic Processing
- ✅ **Transcoding**: Multiple formats and qualities
- ✅ **Thumbnail Generation**: Automatic video thumbnails
- ✅ **Adaptive Bitrate**: HLS streaming
- ✅ **MP4 Support**: Standard video format
- ✅ **Error Handling**: Processing failure recovery

### Quality Options
- **Low**: 480p, smaller file size
- **Medium**: 720p, balanced quality
- **High**: 1080p, best quality

## 🚀 Deployment

### 1. Deploy Edge Functions
```bash
supabase functions deploy media-upload-sign
supabase functions deploy mux-webhook
supabase functions deploy get-playback-token
```

### 2. Configure Webhooks
In Mux Dashboard:
- **URL**: `https://your-project.supabase.co/functions/v1/mux-webhook`
- **Events**: `video.asset.ready`, `video.asset.errored`

### 3. Update Database
```sql
-- Run the schema updates
ALTER TABLE public.media_assets 
ADD COLUMN mux_id VARCHAR(255),
ADD COLUMN mux_playback_id VARCHAR(255),
ADD COLUMN status VARCHAR(20) DEFAULT 'processing';

-- Add indexes
CREATE INDEX idx_media_assets_mux_id ON public.media_assets(mux_id);
CREATE INDEX idx_media_assets_status ON public.media_assets(status);
```

## 🧪 Testing

### Test Video Upload
1. Upload a video file
2. Check Mux dashboard for processing
3. Verify webhook events
4. Test playback URL generation

### Test Access Control
1. Upload video as user A
2. Try to access as user B (should fail)
3. Give user B event ticket
4. Try to access again (should succeed)

## 📈 Benefits

### For Users
- ✅ **Professional Streaming**: High-quality video playback
- ✅ **Fast Loading**: Optimized video delivery
- ✅ **Cross-Platform**: Works on all devices
- ✅ **Reliable**: Enterprise-grade infrastructure

### For Developers
- ✅ **Scalable**: Handles thousands of videos
- ✅ **Cost-Effective**: Pay-per-use pricing
- ✅ **Easy Integration**: Simple API
- ✅ **Analytics**: Built-in video analytics

## 🔧 Troubleshooting

### Common Issues
1. **Upload Fails**: Check Mux credentials
2. **Processing Stuck**: Check webhook configuration
3. **Playback Issues**: Verify playback ID
4. **Access Denied**: Check user permissions

### Debug Steps
1. Check edge function logs
2. Verify Mux dashboard
3. Test webhook endpoints
4. Validate database records

This Mux integration provides enterprise-grade video processing and streaming capabilities! 🎬✨
