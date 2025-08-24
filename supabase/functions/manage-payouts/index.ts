import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, OPTIONS'
};

interface PayoutRequest {
  event_id?: string;
  organization_id?: string;
  amount?: number;
  payout_method: 'stripe' | 'bank_transfer';
  bank_account_id?: string;
}

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

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
      apiVersion: '2024-12-18.acacia'
    });

    if (req.method === 'GET') {
      // Get payout history and available balance
      const url = new URL(req.url);
      const eventId = url.searchParams.get('event_id');
      const orgId = url.searchParams.get('organization_id');

      let availableBalance = 0;
      let payoutHistory = [];

      if (eventId) {
        // Get event-specific payouts
        const { data: event } = await supabaseClient
          .from('events')
          .select('created_by, owner_context_type, owner_context_id')
          .eq('id', eventId)
          .single();

        if (!event || event.created_by !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate available balance for this event
        const { data: revenue } = await supabaseClient
          .from('revenue_tracking')
          .select('amount, payout_amount')
          .eq('event_id', eventId);

        if (revenue) {
          const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
          const totalPayouts = revenue.reduce((sum, r) => sum + (r.payout_amount || 0), 0);
          availableBalance = totalRevenue - totalPayouts;
        }

        // Get payout history
        const { data: payouts } = await supabaseClient
          .from('payouts')
          .select('*')
          .eq('event_id', eventId)
          .order('created_at', { ascending: false });

        payoutHistory = payouts || [];

      } else if (orgId) {
        // Get organization-specific payouts
        const { data: membership } = await supabaseClient
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgId)
          .eq('user_id', user.id)
          .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Calculate available balance for this organization
        const { data: revenue } = await supabaseClient
          .from('revenue_tracking')
          .select('amount, payout_amount')
          .eq('organization_id', orgId);

        if (revenue) {
          const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
          const totalPayouts = revenue.reduce((sum, r) => sum + (r.payout_amount || 0), 0);
          availableBalance = totalRevenue - totalPayouts;
        }

        // Get payout history
        const { data: payouts } = await supabaseClient
          .from('payouts')
          .select('*')
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false });

        payoutHistory = payouts || [];
      }

      return new Response(
        JSON.stringify({
          available_balance: availableBalance,
          payout_history: payoutHistory,
          currency: 'USD'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'POST') {
      // Request a new payout
      const { event_id, organization_id, amount, payout_method, bank_account_id }: PayoutRequest = await req.json();

      if (!amount || amount <= 0) {
        return new Response(
          JSON.stringify({ error: 'Valid amount is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      let availableBalance = 0;
      let payoutData: any = {
        amount,
        payout_method,
        status: 'pending',
        requested_by: user.id
      };

      if (event_id) {
        // Event-specific payout
        const { data: event } = await supabaseClient
          .from('events')
          .select('created_by, owner_context_type, owner_context_id')
          .eq('id', event_id)
          .single();

        if (!event || event.created_by !== user.id) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        payoutData.event_id = event_id;

        // Calculate available balance
        const { data: revenue } = await supabaseClient
          .from('revenue_tracking')
          .select('amount, payout_amount')
          .eq('event_id', event_id);

        if (revenue) {
          const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
          const totalPayouts = revenue.reduce((sum, r) => sum + (r.payout_amount || 0), 0);
          availableBalance = totalRevenue - totalPayouts;
        }

      } else if (organization_id) {
        // Organization-specific payout
        const { data: membership } = await supabaseClient
          .from('organization_members')
          .select('role')
          .eq('organization_id', organization_id)
          .eq('user_id', user.id)
          .single();

        if (!membership || !['owner', 'admin'].includes(membership.role)) {
          return new Response(
            JSON.stringify({ error: 'Access denied' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        payoutData.organization_id = organization_id;

        // Calculate available balance
        const { data: revenue } = await supabaseClient
          .from('revenue_tracking')
          .select('amount, payout_amount')
          .eq('organization_id', organization_id);

        if (revenue) {
          const totalRevenue = revenue.reduce((sum, r) => sum + r.amount, 0);
          const totalPayouts = revenue.reduce((sum, r) => sum + (r.payout_amount || 0), 0);
          availableBalance = totalRevenue - totalPayouts;
        }
      }

      if (amount > availableBalance) {
        return new Response(
          JSON.stringify({ error: 'Insufficient balance for payout' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Get user's Stripe account
      const { data: stripeAccount } = await supabaseClient
        .from('stripe_accounts')
        .select('stripe_account_id')
        .eq('user_id', user.id)
        .single();

      if (!stripeAccount) {
        return new Response(
          JSON.stringify({ error: 'Stripe account not connected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create payout through Stripe
      let stripePayout;
      try {
        stripePayout = await stripe.transfers.create({
          amount: Math.round(amount * 100), // Convert to cents
          currency: 'usd',
          destination: stripeAccount.stripe_account_id,
          metadata: {
            user_id: user.id,
            event_id: event_id || '',
            organization_id: organization_id || '',
            payout_method
          }
        });
      } catch (stripeError) {
        console.error('Stripe payout error:', stripeError);
        return new Response(
          JSON.stringify({ error: 'Failed to process payout with Stripe' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create payout record
      const { data: payout, error: payoutError } = await supabaseClient
        .from('payouts')
        .insert({
          ...payoutData,
          stripe_payout_id: stripePayout.id,
          status: stripePayout.status,
          processed_at: new Date().toISOString()
        })
        .select()
        .single();

      if (payoutError) {
        console.error('Error creating payout record:', payoutError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          payout_id: payout?.id,
          stripe_payout_id: stripePayout.id,
          amount,
          status: stripePayout.status,
          message: 'Payout request submitted successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'PUT') {
      // Update payout settings (bank account, etc.)
      const { bank_account_id, payout_method } = await req.json();

      const { error: updateError } = await supabaseClient
        .from('user_payout_settings')
        .upsert({
          user_id: user.id,
          payout_method,
          bank_account_id,
          updated_at: new Date().toISOString()
        });

      if (updateError) {
        console.error('Error updating payout settings:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Payout settings updated successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Payout management error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

