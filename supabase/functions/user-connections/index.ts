import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, PUT, DELETE, OPTIONS'
}

interface ConnectionRequest {
  connected_user_id: string
  message?: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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
    )

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const connectionId = url.searchParams.get('connection_id')
    const status = url.searchParams.get('status')

    if (req.method === 'POST') {
      const body: ConnectionRequest = await req.json()

      if (!body.connected_user_id) {
        return new Response(
          JSON.stringify({ error: 'Connected user ID is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if trying to connect to self
      if (body.connected_user_id === user.id) {
        return new Response(
          JSON.stringify({ error: 'Cannot connect to yourself' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if target user exists
      const { data: targetUser, error: targetUserError } = await supabaseClient
        .from('user_profiles')
        .select('id, display_name, username')
        .eq('id', body.connected_user_id)
        .single()

      if (targetUserError || !targetUser) {
        return new Response(
          JSON.stringify({ error: 'User not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check if connection already exists
      const { data: existingConnection, error: connectionCheckError } = await supabaseClient
        .from('user_connections')
        .select('*')
        .or(`and(user_id.eq.${user.id},connected_user_id.eq.${body.connected_user_id}),and(user_id.eq.${body.connected_user_id},connected_user_id.eq.${user.id})`)
        .single()

      if (existingConnection) {
        return new Response(
          JSON.stringify({ error: 'Connection already exists' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create connection request
      const { data: connection, error: connectionError } = await supabaseClient
        .from('user_connections')
        .insert({
          user_id: user.id,
          connected_user_id: body.connected_user_id,
          status: 'pending',
          message: body.message
        })
        .select()
        .single()

      if (connectionError) {
        console.error('Error creating connection:', connectionError)
        return new Response(
          JSON.stringify({ error: 'Failed to create connection request' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Create notification for target user
      await supabaseClient
        .from('notifications')
        .insert({
          user_id: body.connected_user_id,
          type: 'connection_request',
          title: 'New Connection Request',
          message: `${user.email} wants to connect with you`,
          data: {
            connection_id: connection.id,
            sender_id: user.id,
            message: body.message
          },
          status: 'unread'
        })

      return new Response(
        JSON.stringify({
          success: true,
          connection,
          message: 'Connection request sent successfully'
        }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PUT' && connectionId) {
      const body = await req.json()
      const { action } = body // 'accept' or 'reject'

      if (!action || !['accept', 'reject'].includes(action)) {
        return new Response(
          JSON.stringify({ error: 'Action must be "accept" or "reject"' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Get the connection
      const { data: connection, error: connectionError } = await supabaseClient
        .from('user_connections')
        .select('*')
        .eq('id', connectionId)
        .eq('connected_user_id', user.id)
        .eq('status', 'pending')
        .single()

      if (connectionError || !connection) {
        return new Response(
          JSON.stringify({ error: 'Connection request not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (action === 'accept') {
        // Accept the connection
        const { data: updatedConnection, error: updateError } = await supabaseClient
          .from('user_connections')
          .update({
            status: 'accepted',
            accepted_at: new Date().toISOString()
          })
          .eq('id', connectionId)
          .select()
          .single()

        if (updateError) {
          console.error('Error accepting connection:', updateError)
          return new Response(
            JSON.stringify({ error: 'Failed to accept connection' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create notification for the requester
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: connection.user_id,
            type: 'connection_accepted',
            title: 'Connection Accepted',
            message: `${user.email} accepted your connection request`,
            data: {
              connection_id: connection.id,
              accepted_by: user.id
            },
            status: 'unread'
          })

        return new Response(
          JSON.stringify({
            success: true,
            connection: updatedConnection,
            message: 'Connection accepted successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      } else {
        // Reject the connection
        const { error: deleteError } = await supabaseClient
          .from('user_connections')
          .delete()
          .eq('id', connectionId)

        if (deleteError) {
          console.error('Error rejecting connection:', deleteError)
          return new Response(
            JSON.stringify({ error: 'Failed to reject connection' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Connection rejected successfully'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    if (req.method === 'DELETE' && connectionId) {
      // Remove connection
      const { error: deleteError } = await supabaseClient
        .from('user_connections')
        .delete()
        .or(`and(id.eq.${connectionId},user_id.eq.${user.id}),and(id.eq.${connectionId},connected_user_id.eq.${user.id})`)

      if (deleteError) {
        console.error('Error deleting connection:', deleteError)
        return new Response(
          JSON.stringify({ error: 'Failed to remove connection' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Connection removed successfully'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET - Fetch connections
    let query = supabaseClient
      .from('user_connections')
      .select(`
        *,
        connected_user:user_profiles!user_connections_connected_user_id_fkey(
          id,
          display_name,
          username,
          avatar_url
        ),
        user:user_profiles!user_connections_user_id_fkey(
          id,
          display_name,
          username,
          avatar_url
        )
      `)
      .or(`user_id.eq.${user.id},connected_user_id.eq.${user.id}`)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: connections, error: connectionsError } = await query

    if (connectionsError) {
      console.error('Error fetching connections:', connectionsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch connections' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Process connections to show the other user
    const processedConnections = connections?.map(connection => {
      const isRequester = connection.user_id === user.id
      const otherUser = isRequester ? connection.connected_user : connection.user

      return {
        id: connection.id,
        status: connection.status,
        message: connection.message,
        created_at: connection.created_at,
        accepted_at: connection.accepted_at,
        other_user: otherUser,
        is_requester: isRequester
      }
    }) || []

    return new Response(
      JSON.stringify({
        success: true,
        connections: processedConnections
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('User connections error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

