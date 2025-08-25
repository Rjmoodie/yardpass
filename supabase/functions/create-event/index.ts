import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }

  try {
    // Create Supabase client with service role key
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
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Invalid token'
      }), {
        status: 401,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    const requestBody = await req.json();
    console.log('Request body:', requestBody);

    // Extract event data
    const { 
      title, 
      description, 
      start_at, 
      end_at, 
      venue, 
      address, 
      city, 
      state, 
      country, 
      cover_image_url, 
      max_attendees, 
      category, 
      visibility = 'public', 
      owner_context_type = 'individual', 
      owner_context_id, 
      ticket_tiers = [] 
    } = requestBody;

    // Validate required fields
    if (!title || !start_at) {
      return new Response(JSON.stringify({
        error: 'Title and start_at are required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Generate unique slug
    const baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const timestamp = Date.now();
    const slug = `${baseSlug}-${timestamp}`;

    // Determine owner context
    let finalOwnerContextType = owner_context_type;
    let finalOwnerContextId = owner_context_id;

    if (owner_context_type === 'organization' && !owner_context_id) {
      // Look up user's primary organization
      const { data: memberships, error: membershipError } = await supabase
        .from('org_members')
        .select('org_id, role')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
        .order('role', { ascending: false })
        .limit(1);

      if (membershipError) {
        console.error('Error fetching memberships:', membershipError);
        return new Response(JSON.stringify({
          error: 'Failed to fetch organization memberships'
        }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      if (memberships && memberships.length > 0) {
        finalOwnerContextId = memberships[0].org_id;
      } else {
        return new Response(JSON.stringify({
          error: 'No organization found for user'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    } else if (owner_context_type === 'individual') {
      finalOwnerContextId = user.id;
    }

    // Validate owner context exists
    if (finalOwnerContextType === 'organization') {
      const { data: org, error: orgError } = await supabase
        .from('orgs')
        .select('id')
        .eq('id', finalOwnerContextId)
        .single();

      if (orgError || !org) {
        return new Response(JSON.stringify({
          error: 'Organization not found'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Check if any ticket tiers are paid and require verification
    const hasPaidTiers = ticket_tiers.some((tier) => tier.price_cents > 0);
    
    if (hasPaidTiers) {
      // Check if payout account is verified
      const { data: payoutAccount, error: payoutError } = await supabase
        .from('payout_accounts')
        .select('verification_status')
        .eq('context_type', finalOwnerContextType)
        .eq('context_id', finalOwnerContextId)
        .single();

      if (payoutError || !payoutAccount) {
        return new Response(JSON.stringify({
          error: 'Payout account not found. Please set up your payout account before creating paid events.'
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }

      if (!['verified', 'pro'].includes(payoutAccount.verification_status)) {
        return new Response(JSON.stringify({
          error: 'Payout account must be verified to create paid events. Current status: ' + payoutAccount.verification_status
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Create event
    const eventData = {
      title,
      description,
      slug,
      start_at,
      end_at,
      venue,
      address,
      city,
      state,
      country,
      cover_image_url,
      max_attendees,
      category,
      visibility,
      status: 'published',
      owner_context_type: finalOwnerContextType,
      owner_context_id: finalOwnerContextId,
      created_by: user.id
    };

    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();

    if (eventError) {
      console.error('Event creation error:', eventError);
      return new Response(JSON.stringify({
        error: 'Failed to create event',
        details: eventError
      }), {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }

    // Create ticket tiers if provided
    let createdTiers = [];
    if (ticket_tiers && ticket_tiers.length > 0) {
      const tierData = ticket_tiers.map((tier) => ({
        event_id: event.id,
        name: tier.name,
        description: tier.description || '',
        price_cents: tier.price_cents || 0,
        currency: tier.currency || 'USD',
        max_quantity: tier.max_quantity,
        available_quantity: tier.available_quantity || tier.max_quantity,
        access_level: tier.access_level || 'general',
        is_active: true
      }));

      const { data: tiers, error: tierError } = await supabase
        .from('ticket_tiers')
        .insert(tierData)
        .select();

      if (tierError) {
        console.error('Ticket tier creation error:', tierError);
        // Don't fail the entire request, just log the error
        console.error('Failed to create ticket tiers:', tierError);
      } else {
        createdTiers = tiers || [];
      }
    }

    return new Response(JSON.stringify({
      success: true,
      event,
      ticket_tiers: createdTiers
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});

