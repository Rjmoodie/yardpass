# 📁 Storage Configuration Guide

## 🚨 **Current Issues:**

### **1. File Size Limits Too Small** ❌
- **Videos**: 10MB max (too small)
- **Images**: 5MB max (too small)
- **Impact**: Users can't upload high-quality content

### **2. RLS Policy Violations** ❌
- **Error**: "new row violates RLS policy" on picture upload
- **Impact**: Organization users can't upload media

## ✅ **Step-by-Step Fix:**

### **Step 1: Update Storage Bucket Settings**

Go to **Supabase Dashboard > Storage > Settings**

#### **1.1 Increase File Size Limits**

**For `event-media` bucket:**
```
Maximum file size: 100 MB (for videos)
Maximum file size: 25 MB (for images)
```

**For `avatars` bucket:**
```
Maximum file size: 10 MB (for profile pictures)
```

**For `post-media` bucket:**
```
Maximum file size: 50 MB (for post videos)
Maximum file size: 15 MB (for post images)
```

#### **1.2 Update Allowed MIME Types**

**For `event-media` bucket:**
```
Images: image/jpeg, image/png, image/webp, image/gif
Videos: video/mp4, video/mov, video/avi, video/webm
Documents: application/pdf
```

**For `avatars` bucket:**
```
Images: image/jpeg, image/png, image/webp
```

**For `post-media` bucket:**
```
Images: image/jpeg, image/png, image/webp, image/gif
Videos: video/mp4, video/mov, video/webm
```

### **Step 2: Update Storage Bucket Policies**

Go to **Supabase Dashboard > Storage > Policies**

#### **2.1 Event Media Bucket Policies**

**INSERT Policy (Allow Uploads):**
```sql
-- Allow authenticated users to upload event media
CREATE POLICY "Allow authenticated users to upload event media" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'event-media' AND
    auth.role() = 'authenticated'
);
```

**SELECT Policy (Allow Public Read):**
```sql
-- Allow public read access to event media
CREATE POLICY "Allow public read access to event media" ON storage.objects
FOR SELECT USING (bucket_id = 'event-media');
```

**UPDATE Policy (Allow Event Owners to Update):**
```sql
-- Allow event owners to update their media
CREATE POLICY "Allow event owners to update event media" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'event-media' AND
    (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.cover_image_url LIKE '%' || name || '%'
            AND (e.created_by = auth.uid() OR
                 EXISTS (
                     SELECT 1 FROM org_members 
                     WHERE org_id = e.owner_context_id 
                     AND user_id = auth.uid() 
                     AND role IN ('admin', 'editor')
                 ))
        )
    )
);
```

**DELETE Policy (Allow Event Owners to Delete):**
```sql
-- Allow event owners to delete their media
CREATE POLICY "Allow event owners to delete event media" ON storage.objects
FOR DELETE USING (
    bucket_id = 'event-media' AND
    (
        auth.uid()::text = (storage.foldername(name))[1] OR
        EXISTS (
            SELECT 1 FROM events e
            WHERE e.cover_image_url LIKE '%' || name || '%'
            AND (e.created_by = auth.uid() OR
                 EXISTS (
                     SELECT 1 FROM org_members 
                     WHERE org_id = e.owner_context_id 
                     AND user_id = auth.uid() 
                     AND role IN ('admin', 'editor')
                 ))
        )
    )
);
```

#### **2.2 Avatar Bucket Policies**

**INSERT Policy:**
```sql
-- Allow users to upload their own avatars
CREATE POLICY "Allow users to upload avatars" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'avatars' AND
    auth.role() = 'authenticated' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
```

**SELECT Policy:**
```sql
-- Allow public read access to avatars
CREATE POLICY "Allow public read access to avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
```

**UPDATE Policy:**
```sql
-- Allow users to update their own avatars
CREATE POLICY "Allow users to update avatars" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
```

**DELETE Policy:**
```sql
-- Allow users to delete their own avatars
CREATE POLICY "Allow users to delete avatars" ON storage.objects
FOR DELETE USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
);
```

#### **2.3 Post Media Bucket Policies**

**INSERT Policy:**
```sql
-- Allow authenticated users to upload post media
CREATE POLICY "Allow authenticated users to upload post media" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'post-media' AND
    auth.role() = 'authenticated'
);
```

**SELECT Policy:**
```sql
-- Allow public read access to post media
CREATE POLICY "Allow public read access to post media" ON storage.objects
FOR SELECT USING (bucket_id = 'post-media');
```

**UPDATE Policy:**
```sql
-- Allow post authors to update their media
CREATE POLICY "Allow post authors to update post media" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'post-media' AND
    EXISTS (
        SELECT 1 FROM posts p
        WHERE p.media_urls LIKE '%' || name || '%'
        AND p.author_id = auth.uid()
    )
);
```

**DELETE Policy:**
```sql
-- Allow post authors to delete their media
CREATE POLICY "Allow post authors to delete post media" ON storage.objects
FOR DELETE USING (
    bucket_id = 'post-media' AND
    EXISTS (
        SELECT 1 FROM posts p
        WHERE p.media_urls LIKE '%' || name || '%'
        AND p.author_id = auth.uid()
    )
);
```

### **Step 3: Create Storage Helper Functions**

Run this SQL in **Supabase SQL Editor**:

```sql
-- Function to get upload URL with proper folder structure
CREATE OR REPLACE FUNCTION public.get_upload_url(
    bucket_name TEXT,
    file_path TEXT,
    file_type TEXT DEFAULT 'image/jpeg'
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    upload_url TEXT;
BEGIN
    -- Generate signed URL for upload
    SELECT storage.get_presigned_url(
        bucket_name,
        file_path,
        'PUT',
        '1 hour',
        file_type
    ) INTO upload_url;
    
    RETURN upload_url;
END;
$$;

-- Function to get download URL
CREATE OR REPLACE FUNCTION public.get_download_url(
    bucket_name TEXT,
    file_path TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    download_url TEXT;
BEGIN
    -- Generate signed URL for download
    SELECT storage.get_presigned_url(
        bucket_name,
        file_path,
        'GET',
        '1 hour'
    ) INTO download_url;
    
    RETURN download_url;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_upload_url(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_download_url(TEXT, TEXT) TO authenticated;
```

### **Step 4: Update Frontend Upload Logic**

```typescript
// Updated upload function with proper error handling
const uploadEventMedia = async (file: File, eventId: string) => {
  try {
    // Generate unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${eventId}/${Date.now()}.${fileExt}`;
    
    // Get upload URL
    const { data: uploadData, error: uploadError } = await supabase
      .rpc('get_upload_url', {
        bucket_name: 'event-media',
        file_path: fileName,
        file_type: file.type
      });
    
    if (uploadError) throw uploadError;
    
    // Upload file
    const uploadResponse = await fetch(uploadData, {
      method: 'PUT',
      body: file,
      headers: {
        'Content-Type': file.type,
      },
    });
    
    if (!uploadResponse.ok) {
      throw new Error('Upload failed');
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('event-media')
      .getPublicUrl(fileName);
    
    return publicUrl;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
};
```

## 🧪 **Testing the Fix:**

### **Test File Uploads:**
```typescript
// Test with different file sizes
const testFiles = [
  { name: 'small.jpg', size: '2MB' },
  { name: 'medium.jpg', size: '15MB' },
  { name: 'large.jpg', size: '25MB' },
  { name: 'video.mp4', size: '50MB' },
  { name: 'large-video.mp4', size: '100MB' }
];

// Test organization uploads
const testOrgUpload = async () => {
  const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
  const url = await uploadEventMedia(file, 'org-event-id');
  console.log('Upload successful:', url);
};
```

### **Expected Results:**
- ✅ No RLS policy violations
- ✅ Large files upload successfully
- ✅ Organization users can upload media
- ✅ Public access to uploaded files
- ✅ Proper file organization by event ID

## 🔧 **Troubleshooting:**

### **If Still Getting RLS Errors:**
```sql
-- Check current policies
SELECT * FROM storage.policies WHERE bucket_id = 'event-media';

-- Check user permissions
SELECT auth.uid() as current_user, auth.role() as current_role;
```

### **If File Size Still Limited:**
1. Check bucket settings in Supabase Dashboard
2. Verify MIME types are allowed
3. Check if there are any client-side limits

### **If Organization Uploads Fail:**
```sql
-- Verify organization membership
SELECT * FROM org_members 
WHERE user_id = auth.uid() 
AND org_id = 'your-org-id';
```

## 📋 **Implementation Checklist:**

- [ ] **Update bucket settings** with larger file limits
- [ ] **Apply storage policies** for all buckets
- [ ] **Create helper functions** for upload/download
- [ ] **Update frontend upload logic** with proper error handling
- [ ] **Test with various file sizes** and types
- [ ] **Test organization uploads** specifically
- [ ] **Verify public access** to uploaded files
