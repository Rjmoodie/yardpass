import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

interface PushNotificationRequest {
  user_ids?: string[];
  event_id?: string;
  organization_id?: string;
  title: string;
  body: string;
  data?: any;
  notification_type: 'event_reminder' | 'ticket_update' | 'event_update' | 'promo' | 'general';
  scheduled_at?: string;
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
      const { user_ids, event_id, organization_id, title, body, data, notification_type, scheduled_at }: PushNotificationRequest = await req.json();

      if (!title || !body) {
        return new Response(
          JSON.stringify({ error: 'Title and body are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let targetUsers: string[] = [];

      if (user_ids) {
        // Direct user targeting
        targetUsers = user_ids;
      } else if (event_id) {
        // Event participants
        const { data: tickets } = await supabaseClient
          .from('tickets')
          .select('user_id')
          .eq('event_id', event_id)
          .eq('status', 'active');

        targetUsers = [...new Set(tickets?.map(t => t.user_id) || [])];
      } else if (organization_id) {
        // Organization members
        const { data: members } = await supabaseClient
          .from('organization_members')
          .select('user_id')
          .eq('organization_id', organization_id);

        targetUsers = members?.map(m => m.user_id) || [];
      }

      if (targetUsers.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No target users found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create push notification records
      const notifications = targetUsers.map(userId => ({
        user_id: userId,
        title,
        body,
        data: data || {},
        notification_type,
        status: scheduled_at ? 'scheduled' : 'pending',
        scheduled_at: scheduled_at || null,
        created_by: user.id
      }));

      const { data: createdNotifications, error: createError } = await supabaseClient
        .from('push_notifications')
        .insert(notifications)
        .select();

      if (createError) {
        console.error('Error creating push notifications:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create notifications' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If not scheduled, send immediately
      if (!scheduled_at) {
        await sendPushNotifications(supabaseClient, createdNotifications);
      }

      return new Response(
        JSON.stringify({
          success: true,
          notifications_created: createdNotifications.length,
          target_users: targetUsers.length,
          message: scheduled_at ? 'Notifications scheduled' : 'Notifications sent'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'GET') {
      // Get user's push notification settings and history
      const url = new URL(req.url);
      const includeHistory = url.searchParams.get('include_history') === 'true';

      const { data: settings } = await supabaseClient
        .from('user_push_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let history = [];
      if (includeHistory) {
        const { data: notifications } = await supabaseClient
          .from('push_notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        history = notifications || [];
      }

      return new Response(
        JSON.stringify({
          settings: settings || {},
          history: history,
          total_notifications: history.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function sendPushNotifications(supabaseClient: any, notifications: any[]) {
  // Get user push tokens
  const userIds = notifications.map(n => n.user_id);
  const { data: pushTokens } = await supabaseClient
    .from('user_push_tokens')
    .select('user_id, push_token, platform')
    .in('user_id', userIds);

  // Group by platform for batch sending
  const tokensByPlatform = pushTokens?.reduce((acc, token) => {
    if (!acc[token.platform]) {
      acc[token.platform] = [];
    }
    acc[token.platform].push(token);
    return acc;
  }, {}) || {};

  // Send to each platform
  for (const [platform, tokens] of Object.entries(tokensByPlatform)) {
    await sendToPlatform(platform, tokens, notifications);
  }

  // Update notification status
  const notificationIds = notifications.map(n => n.id);
  await supabaseClient
    .from('push_notifications')
    .update({ 
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .in('id', notificationIds);
}

async function sendToPlatform(platform: string, tokens: any[], notifications: any[]) {
  // This would integrate with actual push notification services
  // For now, we'll just log the intent
  console.log(`Sending ${notifications.length} notifications to ${tokens.length} ${platform} devices`);
  
  // In a real implementation, you would:
  // - For iOS: Use Apple Push Notification Service (APNs)
  // - For Android: Use Firebase Cloud Messaging (FCM)
  // - For Web: Use Web Push API
}

