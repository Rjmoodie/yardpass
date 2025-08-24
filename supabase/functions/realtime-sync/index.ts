import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS'
};

interface SyncRequest {
  table: string;
  last_sync?: string;
  filters?: any;
  limit?: number;
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
      const { table, last_sync, filters, limit = 100 }: SyncRequest = await req.json();

      if (!table) {
        return new Response(
          JSON.stringify({ error: 'Table name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Build query based on table and user permissions
      let query = supabaseClient.from(table).select('*').limit(limit);

      // Add last sync filter if provided
      if (last_sync) {
        query = query.gt('updated_at', last_sync);
      }

      // Add user-specific filters based on table
      switch (table) {
        case 'events':
          query = query.or(`visibility.eq.public,created_by.eq.${user.id}`);
          break;
        case 'tickets':
          query = query.eq('user_id', user.id);
          break;
        case 'orders':
          query = query.eq('user_id', user.id);
          break;
        case 'notifications':
          query = query.eq('user_id', user.id);
          break;
        case 'user_connections':
          query = query.or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`);
          break;
        case 'posts':
          query = query.eq('user_id', user.id);
          break;
        default:
          // For other tables, check if user has access
          break;
      }

      // Apply additional filters
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            query = query.in(key, value);
          } else {
            query = query.eq(key, value);
          }
        });
      }

      const { data, error } = await query;

      if (error) {
        console.error(`Error syncing ${table}:`, error);
        return new Response(
          JSON.stringify({ error: `Failed to sync ${table}` }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log sync activity
      await supabaseClient
        .from('sync_logs')
        .insert({
          user_id: user.id,
          table_name: table,
          records_count: data?.length || 0,
          last_sync: last_sync,
          sync_timestamp: new Date().toISOString()
        });

      return new Response(
        JSON.stringify({
          table,
          data: data || [],
          count: data?.length || 0,
          last_sync: new Date().toISOString(),
          has_more: data?.length === limit
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } else if (req.method === 'GET') {
      // Get sync status and last sync times
      const url = new URL(req.url);
      const table = url.searchParams.get('table');

      if (table) {
        // Get last sync for specific table
        const { data: lastSync } = await supabaseClient
          .from('sync_logs')
          .select('sync_timestamp')
          .eq('user_id', user.id)
          .eq('table_name', table)
          .order('sync_timestamp', { ascending: false })
          .limit(1)
          .single();

        return new Response(
          JSON.stringify({
            table,
            last_sync: lastSync?.sync_timestamp || null,
            status: 'ready'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } else {
        // Get sync status for all tables
        const { data: syncLogs } = await supabaseClient
          .from('sync_logs')
          .select('table_name, sync_timestamp')
          .eq('user_id', user.id)
          .order('sync_timestamp', { ascending: false });

        const syncStatus = syncLogs?.reduce((acc, log) => {
          if (!acc[log.table_name] || new Date(log.sync_timestamp) > new Date(acc[log.table_name])) {
            acc[log.table_name] = log.sync_timestamp;
          }
          return acc;
        }, {}) || {};

        return new Response(
          JSON.stringify({
            sync_status: syncStatus,
            total_tables: Object.keys(syncStatus).length
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

  } catch (error) {
    console.error('Real-time sync error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

