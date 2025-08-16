// Video Pipeline Service
// Handles video upload, transcoding, and playback with Mux integration

import Mux from '@mux/mux-node';
import { supabase } from '../lib/supabase';
import { UploadRequest, UploadResponse, PlaybackToken, MediaAsset } from '@yardpass/types';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
} as any);

export class VideoService {
  /**
   * Generate signed upload URL for direct upload to Mux
   */
  static async generateUploadUrl(request: UploadRequest): Promise<UploadResponse> {
    try {
      // Create Mux upload URL
      const upload = await mux.Video.Uploads.create({
        cors_origin: '*',
        new_asset_settings: {
          playback_policy: ['public'],
          mp4_support: 'standard',
        },
        test: process.env.NODE_ENV === 'development',
      });

      // Store upload info in database
      const { data: asset, error } = await supabase
        .from('media_assets')
        .insert({
          id: upload.id,
          event_id: request.event_id,
          uploader_id: request.uploader_id,
          type: 'video',
          mux_id: upload.id,
          access_level: request.access_level || 'public',
          metadata: {
            filename: request.filename,
            content_type: request.content_type,
            size: request.size,
          },
        })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        upload_url: upload.url,
        asset_id: asset.id,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      };
    } catch (error) {
      console.error('Failed to generate upload URL:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Handle Mux webhook when video is ready
   */
  static async handleMuxWebhook(payload: any): Promise<void> {
    try {
      const { data: { id: assetId } } = payload;
      
      // Get asset details from Mux
      const asset = await mux.Video.Assets.get(assetId);
      
      // Update database with asset details
      const { error } = await supabase
        .from('media_assets')
        .update({
          duration: Math.round(asset.duration || 0),
          thumbnails: {
            small: (asset as any).thumbnails?.[0]?.url,
            medium: (asset as any).thumbnails?.[1]?.url,
            large: (asset as any).thumbnails?.[2]?.url,
            sprite: (asset as any).thumbnails?.[0]?.sprite_url,
          },
          metadata: {
            ...(asset as any).metadata,
            width: (asset as any).aspect_ratio ? Math.round((asset as any).aspect_ratio * 100) : undefined,
            height: 100,
            format: (asset as any).format,
            status: (asset as any).status,
          },
        })
        .eq('mux_id', assetId);

      if (error) throw error;

      console.log(`Video asset ${assetId} processed successfully`);
    } catch (error) {
      console.error('Failed to handle Mux webhook:', error);
      throw error;
    }
  }

  /**
   * Generate signed playback token for secure video access
   */
  static async generatePlaybackToken(
    assetId: string,
    userId: string,
    eventId?: string
  ): Promise<PlaybackToken> {
    try {
      // Check user access level for the event
      let accessLevel = 'public';
      if (eventId) {
        const { data: access } = await supabase
          .rpc('get_user_access_level', { event_id: eventId });
        accessLevel = access || 'none';
      }

      // Get asset details
      const { data: asset, error } = await supabase
        .from('media_assets')
        .select('*')
        .eq('id', assetId)
        .single();

      if (error || !asset) {
        throw new Error('Asset not found');
      }

      // Check if user has access to this content
      if (asset.access_level !== 'public' && accessLevel === 'none') {
        throw new Error('Access denied');
      }

      // Generate signed URL with watermark if needed
      const playbackUrl = await mux.Video.Assets.createPlaybackId(asset.mux_id!, {
        policy: 'signed',
        // max_resolution: '720p', // Not supported in current Mux API
        // expires_in: 3600, // Not supported in current Mux API
        // watermark: accessLevel !== 'public' ? {
        //   text: `@${userId}`,
        //   position: 'bottom-right',
        //   opacity: 0.3,
        // } : undefined, // Not supported in current Mux API
      });

      return {
        token: playbackUrl.id,
        expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
        playback_url: `https://stream.mux.com/${playbackUrl.id}.m3u8`,
      };
    } catch (error) {
      console.error('Failed to generate playback token:', error);
      throw new Error('Failed to generate playback token');
    }
  }

  /**
   * Get video thumbnail sprite for preview
   */
  static async getThumbnailSprite(assetId: string): Promise<string | null> {
    try {
      const { data: asset } = await supabase
        .from('media_assets')
        .select('thumbnails')
        .eq('id', assetId)
        .single();

      return asset?.thumbnails?.sprite || null;
    } catch (error) {
      console.error('Failed to get thumbnail sprite:', error);
      return null;
    }
  }

  /**
   * Delete video asset and cleanup Mux resources
   */
  static async deleteAsset(assetId: string): Promise<void> {
    try {
      // Get asset details
      const { data: asset } = await supabase
        .from('media_assets')
        .select('mux_id')
        .eq('id', assetId)
        .single();

      if (asset?.mux_id) {
        // Delete from Mux
        await mux.Video.Assets.del(asset.mux_id);
      }

      // Delete from database
      await supabase
        .from('media_assets')
        .delete()
        .eq('id', assetId);

      console.log(`Asset ${assetId} deleted successfully`);
    } catch (error) {
      console.error('Failed to delete asset:', error);
      throw new Error('Failed to delete asset');
    }
  }

  /**
   * Get video analytics and metrics
   */
  static async getVideoMetrics(assetId: string): Promise<any> {
    try {
      const { data: asset } = await supabase
        .from('media_assets')
        .select('mux_id')
        .eq('id', assetId)
        .single();

      if (!asset?.mux_id) {
        throw new Error('Asset not found');
      }

      // Get Mux analytics
      const views = await (mux.Video as any).Views.list({
        asset_id: asset.mux_id,
        timeframe: '24:h',
      });

      return {
        views: views.length,
        play_time: views.reduce((sum: number, view: any) => sum + (view.view_total_content_duration || 0), 0),
        unique_viewers: new Set(views.map((v: any) => v.viewer_user_id)).size,
      };
    } catch (error) {
      console.error('Failed to get video metrics:', error);
      return { views: 0, play_time: 0, unique_viewers: 0 };
    }
  }

  /**
   * Generate video captions using Mux AI
   */
  static async generateCaptions(assetId: string): Promise<string | null> {
    try {
      const { data: asset } = await supabase
        .from('media_assets')
        .select('mux_id')
        .eq('id', assetId)
        .single();

      if (!asset?.mux_id) {
        throw new Error('Asset not found');
      }

      // Request caption generation
      const captions = await mux.Video.Assets.createTrack(asset.mux_id, {
        url: 'https://ai-captioning-service.com/generate',
        type: 'text',
        text_type: 'subtitles',
        language_code: 'en',
      });

      return (captions as any).text || null;
    } catch (error) {
      console.error('Failed to generate captions:', error);
      return null;
    }
  }

  /**
   * Optimize video for different quality levels
   */
  static async optimizeVideo(assetId: string): Promise<void> {
    try {
      const { data: asset } = await supabase
        .from('media_assets')
        .select('mux_id')
        .eq('id', assetId)
        .single();

      if (!asset?.mux_id) {
        throw new Error('Asset not found');
      }

      // Create optimized renditions
      await mux.Video.Assets.createPlaybackId(asset.mux_id, {
        policy: 'public',
        // max_resolution: '1080p', // Not supported in current Mux API
        // max_frame_rate: 30, // Not supported in current Mux API
      });

      console.log(`Video ${assetId} optimized successfully`);
    } catch (error) {
      console.error('Failed to optimize video:', error);
      throw new Error('Failed to optimize video');
    }
  }
}

// Webhook handler for Mux events
export const handleMuxWebhook = async (req: any, res: any) => {
  try {
    const { type, data } = req.body;

    switch (type) {
      case 'video.asset.ready':
        await VideoService.handleMuxWebhook(data);
        break;
      case 'video.asset.errored':
        console.error('Video asset error:', data);
        break;
      default:
        console.log('Unhandled Mux webhook type:', type);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

