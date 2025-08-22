import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user from JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: 'No authorization header'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const unreadOnly = url.searchParams.get('unread_only') === 'true';
    const notificationType = url.searchParams.get('type');

    if (req.method === 'POST') {
      const requestBody = await req.json();
      const { 
        notification_type, 
        title, 
        message, 
        data, 
        recipient_id,
        event_id 
      } = requestBody;

      // Create notification
      if (notification_type && title && message) {
        const { data: notificationId, error: notificationError } = await supabase.rpc('create_notification', {
          p_user_id: recipient_id || user.id,
          p_notification_type: notification_type,
          p_title: title,
          p_message: message,
          p_data: data || {}
        });

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          return new Response(JSON.stringify({
            error: 'Failed to create notification'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          notification_id: notificationId,
          message: 'Notification created successfully'
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create message
      const { 
        recipient_id: msgRecipientId, 
        content, 
        message_type, 
        media_urls,
        conversation_id 
      } = requestBody;

      if (msgRecipientId && content) {
        const { data: message, error: messageError } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            recipient_id: msgRecipientId,
            conversation_id,
            content,
            message_type: message_type || 'text',
            media_urls: media_urls || []
          })
          .select(`
            *,
            sender:user_profiles!sender_id(id, display_name, avatar_url, username),
            recipient:user_profiles!recipient_id(id, display_name, avatar_url, username)
          `)
          .single();

        if (messageError) {
          console.error('Error creating message:', messageError);
          return new Response(JSON.stringify({
            error: 'Failed to create message'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          message,
          message_id: message.id
        }), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (req.method === 'PUT') {
      const { notification_id } = await req.json();
      
      if (notification_id) {
        const { data: success, error: updateError } = await supabase.rpc('mark_notification_read', {
          p_notification_id: notification_id
        });

        if (updateError) {
          console.error('Error marking notification as read:', updateError);
          return new Response(JSON.stringify({
            error: 'Failed to update notification'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({
          success,
          message: 'Notification marked as read'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // GET - Fetch notifications
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    if (notificationType) {
      query = query.eq('notification_type', notificationType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return new Response(JSON.stringify({
        error: 'Failed to fetch notifications'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get unread count
    const { data: unreadCount } = await supabase.rpc('get_unread_notifications_count', {
      p_user_id: user.id
    });

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return new Response(JSON.stringify({
      notifications: notifications || [],
      unread_count: unreadCount || 0,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        total_pages: Math.ceil((totalCount || 0) / limit)
      }
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notifications error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
