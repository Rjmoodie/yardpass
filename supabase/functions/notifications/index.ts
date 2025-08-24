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
    // Create Supabase client with proper authentication
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
        const notificationData = {
          user_id: recipient_id || user.id,
          type: notification_type,
          title,
          message,
          data: data || {},
          status: 'unread',
          created_at: new Date().toISOString()
        };

        const { data: notification, error: notificationError } = await supabaseClient
          .from('notifications')
          .insert(notificationData)
          .select()
          .single();

        if (notificationError) {
          console.error('Error creating notification:', notificationError);
          return new Response(
            JSON.stringify({ error: 'Failed to create notification' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            notification,
            message: 'Notification created successfully'
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
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
        const { data: message, error: messageError } = await supabaseClient
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
            sender:user_profiles!messages_sender_id_fkey(id, display_name, avatar_url, username),
            recipient:user_profiles!messages_recipient_id_fkey(id, display_name, avatar_url, username)
          `)
          .single();

        if (messageError) {
          console.error('Error creating message:', messageError);
          return new Response(
            JSON.stringify({ error: 'Failed to create message' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message,
            message_id: message.id
          }),
          { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'PUT') {
      const { notification_id } = await req.json();
      
      if (notification_id) {
        const { data: notification, error: updateError } = await supabaseClient
          .from('notifications')
          .update({ 
            status: 'read',
            read_at: new Date().toISOString()
          })
          .eq('id', notification_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError || !notification) {
          return new Response(
            JSON.stringify({ error: 'Notification not found or you do not have permission to update it' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            notification,
            message: 'Notification marked as read'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    if (req.method === 'DELETE') {
      const { notification_id } = await req.json();
      
      if (notification_id) {
        const { error: deleteError } = await supabaseClient
          .from('notifications')
          .delete()
          .eq('id', notification_id)
          .eq('user_id', user.id);

        if (deleteError) {
          return new Response(
            JSON.stringify({ error: 'Notification not found or you do not have permission to delete it' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Notification deleted successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // GET - Fetch notifications
    let query = supabaseClient
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('status', 'unread');
    }

    if (notificationType) {
      query = query.eq('type', notificationType);
    }

    query = query.range(offset, offset + limit - 1);

    const { data: notifications, error: notificationsError } = await query;

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch notifications' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get unread count
    const { count: unreadCount } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'unread');

    // Get total count for pagination
    const { count: totalCount } = await supabaseClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({
        success: true,
        notifications: notifications || [],
        unread_count: unreadCount || 0,
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          total_pages: Math.ceil((totalCount || 0) / limit)
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Notifications error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
