import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Mux from 'https://esm.sh/@mux/mux-node@7.3.5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

interface UploadSignRequest {
  filename: string;
  content_type: string;
  file_size: number;
  event_id?: string;
  org_id?: string;
  media_type?: 'image' | 'video';
}

interface UploadSignResponse {
  upload_url: string;
  asset_id: string;
  expires_at: string;
  success: boolean;
  mux_upload_url?: string;
  mux_asset_id?: string;
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
      const request: UploadSignRequest = await req.json();

      // Validate required fields
      if (!request.filename || !request.content_type || !request.file_size) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Missing required fields' 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine media type
      const isVideo = request.content_type.startsWith('video/');
      const mediaType = isVideo ? 'video' : 'image';

      // Generate asset ID
      const assetId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 3600000).toISOString(); // 1 hour

      let response: UploadSignResponse = {
        upload_url: `${Deno.env.get('SUPABASE_URL')}/storage/v1/object/sign/event-media/${assetId}`,
        asset_id: assetId,
        expires_at: expiresAt,
        success: true
      };

      // If it's a video, create Mux upload URL
      if (isVideo) {
        try {
          const mux = new Mux({
            tokenId: Deno.env.get('MUX_TOKEN_ID')!,
            tokenSecret: Deno.env.get('MUX_TOKEN_SECRET')!,
          });

          // Create Mux upload
          const upload = await mux.Video.Uploads.create({
            new_asset_settings: {
              playback_policy: ['public'],
              mp4_support: 'standard'
            },
            cors_origin: '*'
          });

          response.mux_upload_url = upload.url;
          response.mux_asset_id = upload.asset_id;
        } catch (error) {
          console.error('Mux upload creation error:', error);
          // Fallback to regular upload if Mux fails
        }
      }

      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Media upload sign error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to sign upload'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
