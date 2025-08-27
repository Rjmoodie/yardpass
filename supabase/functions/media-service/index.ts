import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

interface MediaUploadRequest {
  // Media data
  media_data: string; // base64 encoded media
  media_type: 'image' | 'video' | 'audio';
  content_type: string;
  
  // Context
  context_type: 'event' | 'post' | 'profile' | 'organization';
  context_id: string;
  
  // Metadata
  filename?: string;
  title?: string;
  description?: string;
  tags?: string[];
  
  // Processing options
  optimize?: boolean;
  resize?: {
    width?: number;
    height?: number;
    quality?: number;
  };
  convert_video?: {
    format?: 'mp4' | 'webm' | 'mov';
    quality?: 'low' | 'medium' | 'high';
  };
}

interface MediaUploadResponse {
  success: boolean;
  media_id?: string;
  url?: string;
  thumbnail_url?: string;
  duration?: number;
  size?: number;
  width?: number;
  height?: number;
  error?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (req.method === 'POST') {
      const request: MediaUploadRequest = await req.json();

      // Validate required fields
      if (!request.media_data || !request.media_type || !request.context_type || !request.context_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing required fields: media_data, media_type, context_type, context_id' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Validate permissions based on context
      const hasPermission = await validatePermissions(supabaseClient, user.id, request.context_type, request.context_id);
      if (!hasPermission) {
        return new Response(
          JSON.stringify({ success: false, error: 'Permission denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Process and upload media
      const result = await processAndUploadMedia(supabaseClient, user.id, request);

      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'GET') {
      // Get media assets for a context
      const url = new URL(req.url);
      const contextType = url.searchParams.get('context_type');
      const contextId = url.searchParams.get('context_id');
      const mediaType = url.searchParams.get('media_type');

      if (!contextType || !contextId) {
        return new Response(
          JSON.stringify({ error: 'Missing context_type or context_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let query = supabaseClient
        .from('media_assets')
        .select('*')
        .eq('context_type', contextType)
        .eq('context_id', contextId);

      if (mediaType) {
        query = query.eq('media_type', mediaType);
      }

      const { data: mediaAssets, error } = await query;

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch media assets' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, media_assets: mediaAssets || [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'DELETE') {
      // Delete media asset
      const { media_id } = await req.json();

      if (!media_id) {
        return new Response(
          JSON.stringify({ error: 'Missing media_id' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const result = await deleteMediaAsset(supabaseClient, user.id, media_id);

      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Media service error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error', 
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function validatePermissions(supabaseClient: any, userId: string, contextType: string, contextId: string): Promise<boolean> {
  try {
    switch (contextType) {
      case 'event':
        const { data: event } = await supabaseClient
          .from('events')
          .select('created_by, owner_context_id')
          .eq('id', contextId)
          .single();
        
        return event && (event.created_by === userId || event.owner_context_id === userId);

      case 'post':
        const { data: post } = await supabaseClient
          .from('posts')
          .select('user_id')
          .eq('id', contextId)
          .single();
        
        return post && post.user_id === userId;

      case 'profile':
        return userId === contextId; // Users can only upload to their own profile

      case 'organization':
        const { data: orgMember } = await supabaseClient
          .from('org_members')
          .select('role')
          .eq('org_id', contextId)
          .eq('user_id', userId)
          .single();
        
        return orgMember && ['admin', 'owner'].includes(orgMember.role);

      default:
        return false;
    }
  } catch (error) {
    console.error('Permission validation error:', error);
    return false;
  }
}

async function processAndUploadMedia(supabaseClient: any, userId: string, request: MediaUploadRequest): Promise<MediaUploadResponse> {
  try {
    // Decode base64 data
    const base64Data = request.media_data.replace(/^data:[^;]+;base64,/, '');
    const mediaBytes = new Uint8Array(atob(base64Data).split('').map(c => c.charCodeAt(0)));

    // Validate file size
    const maxSize = getMaxFileSize(request.media_type);
    if (mediaBytes.length > maxSize) {
      return {
        success: false,
        error: `File too large. Maximum size for ${request.media_type} is ${formatFileSize(maxSize)}`
      };
    }

    // Generate filename and path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const extension = getFileExtension(request.content_type);
    const filename = request.filename || `${request.context_type}-${request.context_id}-${timestamp}.${extension}`;
    const storagePath = `${request.context_type}s/${request.context_id}/${filename}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('media-assets')
      .upload(storagePath, mediaBytes, {
        contentType: request.content_type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return {
        success: false,
        error: 'Failed to upload media'
      };
    }

    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('media-assets')
      .getPublicUrl(storagePath);

    // Process media if optimization is requested
    let processedUrl = publicUrl;
    let thumbnailUrl = null;
    let width = null;
    let height = null;
    let duration = null;

    if (request.optimize) {
      const processed = await processMedia(publicUrl, request);
      processedUrl = processed.url;
      thumbnailUrl = processed.thumbnail_url;
      width = processed.width;
      height = processed.height;
      duration = processed.duration;
    }

    // Create media asset record
    const mediaAsset = {
      uploader_id: userId,
      context_type: request.context_type,
      context_id: request.context_id,
      media_type: request.media_type,
      content_type: request.content_type,
      url: processedUrl,
      thumbnail_url: thumbnailUrl,
      storage_path: storagePath,
      filename: filename,
      file_size: mediaBytes.length,
      width: width,
      height: height,
      duration: duration,
      title: request.title,
      description: request.description,
      tags: request.tags || [],
      metadata: {
        original_filename: request.filename,
        optimization_applied: request.optimize || false,
        resize_applied: request.resize || false,
        video_conversion_applied: request.convert_video || false
      },
      status: 'ready'
    };

    const { data: asset, error: insertError } = await supabaseClient
      .from('media_assets')
      .insert(mediaAsset)
      .select()
      .single();

    if (insertError) {
      console.error('Error creating media asset:', insertError);
      return {
        success: false,
        error: 'Failed to create media asset record'
      };
    }

    // Update context with media reference if needed
    await updateContextWithMedia(supabaseClient, request.context_type, request.context_id, asset.id, processedUrl);

    // Log media upload
    await supabaseClient
      .from('user_behavior_logs')
      .insert({
        user_id: userId,
        behavior_type: 'media_upload',
        behavior_data: {
          context_type: request.context_type,
          context_id: request.context_id,
          media_type: request.media_type,
          file_size: mediaBytes.length,
          asset_id: asset.id
        }
      });

    return {
      success: true,
      media_id: asset.id,
      url: processedUrl,
      thumbnail_url: thumbnailUrl,
      duration: duration,
      size: mediaBytes.length,
      width: width,
      height: height
    };

  } catch (error) {
    console.error('Media processing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function processMedia(url: string, request: MediaUploadRequest): Promise<any> {
  // This would integrate with image/video processing services
  // For now, return the original URL
  return {
    url: url,
    thumbnail_url: null,
    width: null,
    height: null,
    duration: null
  };
}

async function updateContextWithMedia(supabaseClient: any, contextType: string, contextId: string, mediaId: string, mediaUrl: string) {
  try {
    switch (contextType) {
      case 'event':
        // Update event with cover image if it's the first image
        const { data: existingMedia } = await supabaseClient
          .from('media_assets')
          .select('id')
          .eq('context_type', 'event')
          .eq('context_id', contextId)
          .eq('media_type', 'image');

        if (!existingMedia || existingMedia.length === 0) {
          await supabaseClient
            .from('events')
            .update({ 
              cover_image_url: mediaUrl,
              updated_at: new Date().toISOString()
            })
            .eq('id', contextId);
        }
        break;

      case 'post':
        // Update post with media URLs array
        await supabaseClient
          .from('posts')
          .update({ 
            media_urls: supabaseClient.sql`array_append(media_urls, ${mediaUrl})`,
            updated_at: new Date().toISOString()
          })
          .eq('id', contextId);
        break;

      case 'profile':
        // Update profile with avatar if it's an image
        await supabaseClient
          .from('profiles')
          .update({ 
            avatar_url: mediaUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', contextId);
        break;
    }
  } catch (error) {
    console.error('Error updating context with media:', error);
  }
}

async function deleteMediaAsset(supabaseClient: any, userId: string, mediaId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get media asset
    const { data: asset, error: fetchError } = await supabaseClient
      .from('media_assets')
      .select('*')
      .eq('id', mediaId)
      .single();

    if (fetchError || !asset) {
      return { success: false, error: 'Media asset not found' };
    }

    // Check permissions
    const hasPermission = await validatePermissions(supabaseClient, userId, asset.context_type, asset.context_id);
    if (!hasPermission) {
      return { success: false, error: 'Permission denied' };
    }

    // Delete from storage
    const { error: storageError } = await supabaseClient.storage
      .from('media-assets')
      .remove([asset.storage_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete from database
    const { error: deleteError } = await supabaseClient
      .from('media_assets')
      .delete()
      .eq('id', mediaId);

    if (deleteError) {
      return { success: false, error: 'Failed to delete media asset' };
    }

    return { success: true };

  } catch (error) {
    console.error('Delete media error:', error);
    return { success: false, error: error.message };
  }
}

function getMaxFileSize(mediaType: string): number {
  switch (mediaType) {
    case 'image': return 10 * 1024 * 1024; // 10MB
    case 'video': return 100 * 1024 * 1024; // 100MB
    case 'audio': return 50 * 1024 * 1024; // 50MB
    default: return 10 * 1024 * 1024; // 10MB
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 Bytes';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

function getFileExtension(contentType: string): string {
  const extensions: { [key: string]: string } = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/mov': 'mov',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/m4a': 'm4a'
  };
  return extensions[contentType] || 'bin';
}
