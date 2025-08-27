import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
};

interface CommunicationRequest {
  user_ids?: string[];
  event_id?: string;
  organization_id?: string;
  title: string;
  body: string;
  data?: any;
  communication_type: 'push' | 'email' | 'sms' | 'in_app' | 'all';
  notification_type: 'event_reminder' | 'event_update' | 'ticket_transfer' | 'payment_success' | 'friend_request' | 'system' | 'promo' | 'general';
  scheduled_at?: string;
  email_template?: string;
  sms_template?: string;
  push_template?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  related_entity_type?: string;
  related_entity_id?: string;
}

interface EmailTemplate {
  subject: string;
  html_body: string;
  text_body: string;
}

interface SMSTemplate {
  message: string;
  character_count: number;
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
      const request: CommunicationRequest = await req.json();

      if (!request.title || !request.body) {
        return new Response(
          JSON.stringify({ error: 'Title and body are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get target users
      let targetUsers = await getTargetUsers(supabaseClient, request);
      
      if (targetUsers.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No target users found' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user preferences and filter based on communication type
      const userPreferences = await getUserPreferences(supabaseClient, targetUsers);
      const filteredUsers = filterUsersByPreferences(userPreferences, request.communication_type, request.notification_type);

      if (filteredUsers.length === 0) {
        return new Response(
          JSON.stringify({ error: 'No users have enabled this communication type' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create communication records
      const communications = await createCommunicationRecords(supabaseClient, filteredUsers, request, user.id);

      // Send communications based on type
      const results = await sendCommunications(supabaseClient, communications, request);

      return new Response(
        JSON.stringify({
          success: true,
          communications_created: communications.length,
          target_users: targetUsers.length,
          filtered_users: filteredUsers.length,
          results,
          message: request.scheduled_at ? 'Communications scheduled' : 'Communications sent'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'GET') {
      // Get user's communication settings and history
      const url = new URL(req.url);
      const includeHistory = url.searchParams.get('include_history') === 'true';
      const communicationType = url.searchParams.get('type');

      const { data: settings } = await supabaseClient
        .from('user_communication_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      let history = [];
      if (includeHistory) {
        let query = supabaseClient
          .from('communications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (communicationType) {
          query = query.eq('communication_type', communicationType);
        }

        const { data: communications } = await query;
        history = communications || [];
      }

      return new Response(
        JSON.stringify({
          settings: settings || {},
          history: history,
          total_communications: history.length
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Communications error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getTargetUsers(supabaseClient: any, request: CommunicationRequest): Promise<string[]> {
  if (request.user_ids) {
    return request.user_ids;
  }

  if (request.event_id) {
    const { data: tickets } = await supabaseClient
      .from('tickets')
      .select('user_id')
      .eq('event_id', request.event_id)
      .eq('status', 'active');

    return [...new Set(tickets?.map((t: any) => t.user_id) || [])];
  }

  if (request.organization_id) {
    const { data: members } = await supabaseClient
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', request.organization_id);

    return members?.map((m: any) => m.user_id) || [];
  }

  return [];
}

async function getUserPreferences(supabaseClient: any, userIds: string[]) {
  // First try to get enhanced communication settings
  const { data: enhancedPreferences } = await supabaseClient
    .from('user_communication_settings')
    .select('*')
    .in('user_id', userIds);

  // For users without enhanced settings, get existing notification preferences
  const usersWithoutEnhanced = userIds.filter(id => 
    !enhancedPreferences?.some(p => p.user_id === id)
  );

  let existingPreferences = [];
  if (usersWithoutEnhanced.length > 0) {
    const { data: profiles } = await supabaseClient
      .from('profiles')
      .select('id, notification_preferences')
      .in('id', usersWithoutEnhanced);

    existingPreferences = profiles?.map(profile => ({
      user_id: profile.id,
      push_enabled: profile.notification_preferences?.push ?? true,
      email_enabled: profile.notification_preferences?.email ?? true,
      sms_enabled: profile.notification_preferences?.sms ?? false,
      in_app_enabled: true,
      notification_types: {}
    })) || [];
  }

  return [...(enhancedPreferences || []), ...existingPreferences];
}

function filterUsersByPreferences(preferences: any[], communicationType: string, notificationType: string): string[] {
  return preferences
    .filter(pref => {
      // Check if user has enabled this communication type
      if (communicationType === 'push' && !pref.push_enabled) return false;
      if (communicationType === 'email' && !pref.email_enabled) return false;
      if (communicationType === 'sms' && !pref.sms_enabled) return false;
      if (communicationType === 'all') {
        if (!pref.push_enabled && !pref.email_enabled && !pref.sms_enabled) return false;
      }

      // Check if user has enabled this notification type
      if (pref.notification_types && !pref.notification_types[notificationType]) return false;

      return true;
    })
    .map(pref => pref.user_id);
}

async function createCommunicationRecords(supabaseClient: any, userIds: string[], request: CommunicationRequest, createdBy: string) {
  const communications = userIds.map(userId => ({
    user_id: userId,
    title: request.title,
    body: request.body,
    data: request.data || {},
    communication_type: request.communication_type,
    notification_type: request.notification_type,
    status: request.scheduled_at ? 'scheduled' : 'pending',
    scheduled_at: request.scheduled_at || null,
    priority: request.priority || 'normal',
    created_by: createdBy,
    email_template: request.email_template,
    sms_template: request.sms_template
  }));

  const { data: createdCommunications, error } = await supabaseClient
    .from('communications')
    .insert(communications)
    .select();

  if (error) {
    throw new Error(`Failed to create communications: ${error.message}`);
  }

  return createdCommunications || [];
}

async function sendCommunications(supabaseClient: any, communications: any[], request: CommunicationRequest) {
  const results = {
    push: { sent: 0, failed: 0 },
    email: { sent: 0, failed: 0 },
    sms: { sent: 0, failed: 0 }
  };

  // Group communications by type
  const pushComms = communications.filter(c => c.communication_type === 'push' || c.communication_type === 'all');
  const emailComms = communications.filter(c => c.communication_type === 'email' || c.communication_type === 'all');
  const smsComms = communications.filter(c => c.communication_type === 'sms' || c.communication_type === 'all');

  // Send push notifications
  if (pushComms.length > 0) {
    const pushResult = await sendPushNotifications(supabaseClient, pushComms);
    results.push = pushResult;
  }

  // Send emails
  if (emailComms.length > 0) {
    const emailResult = await sendEmails(supabaseClient, emailComms, request);
    results.email = emailResult;
  }

  // Send SMS
  if (smsComms.length > 0) {
    const smsResult = await sendSMS(supabaseClient, smsComms, request);
    results.sms = smsResult;
  }

  // Update communication status
  const communicationIds = communications.map(c => c.id);
  await supabaseClient
    .from('communications')
    .update({ 
      status: 'sent',
      sent_at: new Date().toISOString()
    })
    .in('id', communicationIds);

  return results;
}

async function sendPushNotifications(supabaseClient: any, communications: any[]) {
  // Get user push tokens
  const userIds = communications.map(c => c.user_id);
  const { data: pushTokens } = await supabaseClient
    .from('user_push_tokens')
    .select('user_id, push_token, platform')
    .in('user_id', userIds);

  // Group by platform for batch sending
  const tokensByPlatform = pushTokens?.reduce((acc: any, token: any) => {
    if (!acc[token.platform]) {
      acc[token.platform] = [];
    }
    acc[token.platform].push(token);
    return acc;
  }, {}) || {};

  let sent = 0;
  let failed = 0;

  // Send to each platform
  for (const [platform, tokens] of Object.entries(tokensByPlatform)) {
    try {
      await sendToPlatform(platform, tokens as any[], communications);
      sent += tokens.length;
    } catch (error) {
      console.error(`Failed to send push notifications to ${platform}:`, error);
      failed += tokens.length;
    }
  }

  return { sent, failed };
}

async function sendEmails(supabaseClient: any, communications: any[], request: CommunicationRequest) {
  // Get user email addresses
  const userIds = communications.map(c => c.user_id);
  const { data: users } = await supabaseClient
    .from('users')
    .select('id, email, name')
    .in('id', userIds);

  let sent = 0;
  let failed = 0;

  for (const communication of communications) {
    const user = users?.find((u: any) => u.id === communication.user_id);
    if (!user?.email) {
      failed++;
      continue;
    }

    try {
      await sendEmail(user.email, user.name, communication, request);
      sent++;
    } catch (error) {
      console.error(`Failed to send email to ${user.email}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

async function sendSMS(supabaseClient: any, communications: any[], request: CommunicationRequest) {
  // Get user phone numbers
  const userIds = communications.map(c => c.user_id);
  const { data: users } = await supabaseClient
    .from('users')
    .select('id, phone')
    .in('id', userIds);

  let sent = 0;
  let failed = 0;

  for (const communication of communications) {
    const user = users?.find((u: any) => u.id === communication.user_id);
    if (!user?.phone) {
      failed++;
      continue;
    }

    try {
      await sendSMSMessage(user.phone, communication, request);
      sent++;
    } catch (error) {
      console.error(`Failed to send SMS to ${user.phone}:`, error);
      failed++;
    }
  }

  return { sent, failed };
}

async function sendToPlatform(platform: string, tokens: any[], communications: any[]) {
  // This would integrate with actual push notification services
  console.log(`Sending ${communications.length} push notifications to ${tokens.length} ${platform} devices`);
  
  // In a real implementation, you would:
  // - For iOS: Use Apple Push Notification Service (APNs)
  // - For Android: Use Firebase Cloud Messaging (FCM)
  // - For Web: Use Web Push API
}

async function sendEmail(email: string, name: string, communication: any, request: CommunicationRequest) {
  // This would integrate with email service (SendGrid, AWS SES, etc.)
  console.log(`Sending email to ${email} (${name}): ${communication.title}`);
  
  // In a real implementation, you would:
  // - Use email service API
  // - Apply email templates
  // - Handle bounces and delivery tracking
}

async function sendSMSMessage(phone: string, communication: any, request: CommunicationRequest) {
  // This would integrate with SMS service (Twilio, AWS SNS, etc.)
  console.log(`Sending SMS to ${phone}: ${communication.body}`);
  
  // In a real implementation, you would:
  // - Use SMS service API
  // - Apply SMS templates
  // - Handle delivery tracking
}
