import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Mux from 'https://esm.sh/@mux/mux-node@7.3.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

interface MuxWebhookEvent {
  type: string;
  data: {
    id: string;
    status: string;
    playback_ids?: Array<{
      id: string;
      policy: string;
    }>;
    tracks?: Array<{
      type: string;
      duration: number;
    }>;
    aspect_ratio?: string;
    created_at?: string;
    updated_at?: string;
  };
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

    if (req.method === 'POST') {
      const event: MuxWebhookEvent = await req.json();

      // Verify webhook signature (optional but recommended)
      const signature = req.headers.get('mux-signature');
      if (signature) {
        // TODO: Implement signature verification
        console.log('Webhook signature:', signature);
      }

      console.log('Mux webhook event:', event.type, event.data.id);

      // Handle different webhook events
      switch (event.type) {
        case 'video.asset.ready':
          await handleAssetReady(supabaseClient, event.data);
          break;
        
        case 'video.asset.errored':
          await handleAssetError(supabaseClient, event.data);
          break;
        
        case 'video.upload.asset_created':
          await handleUploadAssetCreated(supabaseClient, event.data);
          break;
        
        default:
          console.log('Unhandled webhook event:', event.type);
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Mux webhook error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Webhook processing failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function handleAssetReady(supabaseClient: any, assetData: any) {
  try {
    // Find media asset by Mux asset ID
    const { data: mediaAsset, error } = await supabaseClient
      .from('media_assets')
      .select('*')
      .eq('mux_id', assetData.id)
      .single();

    if (error || !mediaAsset) {
      console.error('Media asset not found for Mux asset:', assetData.id);
      return;
    }

    // Get playback URL
    const playbackId = assetData.playback_ids?.[0]?.id;
    const playbackUrl = playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null;

    // Calculate duration from tracks
    const videoTrack = assetData.tracks?.find((track: any) => track.type === 'video');
    const duration = videoTrack?.duration || 0;

    // Update media asset with Mux data
    const { error: updateError } = await supabaseClient
      .from('media_assets')
      .update({
        url: playbackUrl,
        duration: duration,
        metadata: {
          ...mediaAsset.metadata,
          mux_asset_id: assetData.id,
          playback_id: playbackId,
          aspect_ratio: assetData.aspect_ratio,
          status: 'ready',
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', mediaAsset.id);

    if (updateError) {
      console.error('Error updating media asset:', updateError);
    } else {
      console.log('Media asset updated successfully:', mediaAsset.id);
    }
  } catch (error) {
    console.error('Error handling asset ready:', error);
  }
}

async function handleAssetError(supabaseClient: any, assetData: any) {
  try {
    // Find and update media asset with error status
    const { data: mediaAsset, error } = await supabaseClient
      .from('media_assets')
      .select('*')
      .eq('mux_id', assetData.id)
      .single();

    if (error || !mediaAsset) {
      console.error('Media asset not found for Mux asset:', assetData.id);
      return;
    }

    // Update with error status
    const { error: updateError } = await supabaseClient
      .from('media_assets')
      .update({
        metadata: {
          ...mediaAsset.metadata,
          status: 'error',
          error_message: 'Video processing failed',
          updated_at: new Date().toISOString()
        }
      })
      .eq('id', mediaAsset.id);

    if (updateError) {
      console.error('Error updating media asset with error:', updateError);
    }
  } catch (error) {
    console.error('Error handling asset error:', error);
  }
}

async function handleUploadAssetCreated(supabaseClient: any, assetData: any) {
  try {
    console.log('Upload asset created:', assetData.id);
    // This event is fired when a new asset is created from an upload
    // We can use this to track upload progress
  } catch (error) {
    console.error('Error handling upload asset created:', error);
  }
}
