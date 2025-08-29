import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Mux from 'https://esm.sh/@mux/mux-node@7.3.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

interface PlaybackTokenRequest {
  media_id: string;
  playback_id?: string;
}

interface PlaybackTokenResponse {
  success: boolean;
  token?: string;
  expires_at?: string;
  playback_url?: string;
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
      const request: PlaybackTokenRequest = await req.json();

      if (!request.media_id) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Media ID is required' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get media asset
      const { data: mediaAsset, error } = await supabaseClient
        .from('media_assets')
        .select('*')
        .eq('id', request.media_id)
        .single();

      if (error || !mediaAsset) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Media asset not found' 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if user has access to this media
      const hasAccess = await checkMediaAccess(supabaseClient, user.id, mediaAsset);
      if (!hasAccess) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Access denied' 
          }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If it's a video with Mux, generate signed playback URL
      if (mediaAsset.type === 'video' && mediaAsset.mux_id) {
        try {
          const mux = new Mux({
            tokenId: Deno.env.get('MUX_TOKEN_ID')!,
            tokenSecret: Deno.env.get('MUX_TOKEN_SECRET')!,
          });

          const playbackId = mediaAsset.metadata?.playback_id || request.playback_id;
          if (!playbackId) {
            return new Response(
              JSON.stringify({ 
                success: false, 
                error: 'Playback ID not found' 
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          // Generate signed playback URL
          const expiresIn = 3600; // 1 hour
          const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

          const playbackUrl = `https://stream.mux.com/${playbackId}.m3u8`;
          
          // For now, return the public URL
          // In production, you might want to generate a signed URL with Mux
          const response: PlaybackTokenResponse = {
            success: true,
            playback_url: playbackUrl,
            expires_at: expiresAt
          };

          return new Response(
            JSON.stringify(response),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );

        } catch (error) {
          console.error('Error generating playback token:', error);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'Failed to generate playback token' 
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } else {
        // For images or non-Mux videos, return the direct URL
        const response: PlaybackTokenResponse = {
          success: true,
          playback_url: mediaAsset.url,
          expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
        };

        return new Response(
          JSON.stringify(response),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Get playback token error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to get playback token'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function checkMediaAccess(supabaseClient: any, userId: string, mediaAsset: any): Promise<boolean> {
  try {
    // Media owner has access
    if (mediaAsset.user_id === userId) {
      return true;
    }

    // If media is public, allow access
    if (mediaAsset.access_level === 'public') {
      return true;
    }

    // If media is associated with an event, check event access
    if (mediaAsset.event_id) {
      const { data: tickets } = await supabaseClient
        .from('tickets_owned')
        .select('id')
        .eq('user_id', userId)
        .eq('tickets.event_id', mediaAsset.event_id)
        .limit(1);

      if (tickets && tickets.length > 0) {
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error('Error checking media access:', error);
    return false;
  }
}
