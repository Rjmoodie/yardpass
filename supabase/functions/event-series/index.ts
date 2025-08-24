import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE'
};

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

    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'list';

    switch (action) {
      case 'create':
        return await createEventSeries(supabaseClient, user, req);
      case 'update':
        return await updateEventSeries(supabaseClient, user, req);
      case 'delete':
        return await deleteEventSeries(supabaseClient, user, req);
      case 'generate':
        return await generateSeriesEvents(supabaseClient, user, req);
      case 'list':
        return await getEventSeries(supabaseClient, user, req);
      case 'events':
        return await getSeriesEvents(supabaseClient, user, req);
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Event series error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function createEventSeries(supabase: any, user: any, req: Request) {
  const {
    name,
    description,
    org_id,
    recurrence_pattern,
    start_date,
    end_date,
    max_occurrences,
    settings = {}
  } = await req.json();

  if (!name || !recurrence_pattern || !start_date) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Validate recurrence pattern
  if (!isValidRecurrencePattern(recurrence_pattern)) {
    return new Response(
      JSON.stringify({ error: 'Invalid recurrence pattern' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user has permission to create series for this org
  if (org_id) {
    const { data: orgMember } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', org_id)
      .eq('user_id', user.id)
      .single();

    if (!orgMember || !['owner', 'admin'].includes(orgMember.role)) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Create event series
  const { data: series, error: seriesError } = await supabase
    .from('event_series')
    .insert({
      name,
      description,
      organizer_id: user.id,
      org_id,
      recurrence_pattern,
      start_date,
      end_date,
      max_occurrences,
      settings
    })
    .select()
    .single();

  if (seriesError) {
    return new Response(
      JSON.stringify({ error: 'Failed to create event series' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      series,
      message: 'Event series created successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function updateEventSeries(supabase: any, user: any, req: Request) {
  const {
    series_id,
    name,
    description,
    recurrence_pattern,
    end_date,
    max_occurrences,
    settings,
    is_active
  } = await req.json();

  if (!series_id) {
    return new Response(
      JSON.stringify({ error: 'Missing series ID' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user has permission to update this series
  const { data: series, error: fetchError } = await supabase
    .from('event_series')
    .select('organizer_id, org_id')
    .eq('id', series_id)
    .single();

  if (fetchError || !series) {
    return new Response(
      JSON.stringify({ error: 'Event series not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (series.organizer_id !== user.id) {
    if (series.org_id) {
      const { data: orgMember } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', series.org_id)
        .eq('user_id', user.id)
        .single();

      if (!orgMember || !['owner', 'admin'].includes(orgMember.role)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not series organizer' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Update series
  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (recurrence_pattern !== undefined) {
    if (!isValidRecurrencePattern(recurrence_pattern)) {
      return new Response(
        JSON.stringify({ error: 'Invalid recurrence pattern' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    updateData.recurrence_pattern = recurrence_pattern;
  }
  if (end_date !== undefined) updateData.end_date = end_date;
  if (max_occurrences !== undefined) updateData.max_occurrences = max_occurrences;
  if (settings !== undefined) updateData.settings = settings;
  if (is_active !== undefined) updateData.is_active = is_active;

  const { data: updatedSeries, error: updateError } = await supabase
    .from('event_series')
    .update(updateData)
    .eq('id', series_id)
    .select()
    .single();

  if (updateError) {
    return new Response(
      JSON.stringify({ error: 'Failed to update event series' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      series: updatedSeries,
      message: 'Event series updated successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function deleteEventSeries(supabase: any, user: any, req: Request) {
  const { series_id } = await req.json();

  if (!series_id) {
    return new Response(
      JSON.stringify({ error: 'Missing series ID' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check if user has permission to delete this series
  const { data: series, error: fetchError } = await supabase
    .from('event_series')
    .select('organizer_id, org_id')
    .eq('id', series_id)
    .single();

  if (fetchError || !series) {
    return new Response(
      JSON.stringify({ error: 'Event series not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  if (series.organizer_id !== user.id) {
    if (series.org_id) {
      const { data: orgMember } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', series.org_id)
        .eq('user_id', user.id)
        .single();

      if (!orgMember || !['owner', 'admin'].includes(orgMember.role)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not series organizer' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Delete series events first
  await supabase
    .from('series_events')
    .delete()
    .eq('series_id', series_id);

  // Delete series
  const { error: deleteError } = await supabase
    .from('event_series')
    .delete()
    .eq('id', series_id);

  if (deleteError) {
    return new Response(
      JSON.stringify({ error: 'Failed to delete event series' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Event series deleted successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateSeriesEvents(supabase: any, user: any, req: Request) {
  const { series_id, template_event_data } = await req.json();

  if (!series_id || !template_event_data) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Get series details
  const { data: series, error: seriesError } = await supabase
    .from('event_series')
    .select('*')
    .eq('id', series_id)
    .single();

  if (seriesError || !series) {
    return new Response(
      JSON.stringify({ error: 'Event series not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Check permissions
  if (series.organizer_id !== user.id) {
    if (series.org_id) {
      const { data: orgMember } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', series.org_id)
        .eq('user_id', user.id)
        .single();

      if (!orgMember || !['owner', 'admin'].includes(orgMember.role)) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized - insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not series organizer' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // Generate event dates based on recurrence pattern
  const eventDates = generateEventDates(series.recurrence_pattern, series.start_date, series.end_date, series.max_occurrences);

  if (eventDates.length === 0) {
    return new Response(
      JSON.stringify({ error: 'No valid event dates generated' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Create events
  const createdEvents = [];
  for (let i = 0; i < eventDates.length; i++) {
    const eventDate = eventDates[i];
    
    // Calculate event start and end times
    const startTime = new Date(template_event_data.start_at);
    const endTime = new Date(template_event_data.end_at);
    const duration = endTime.getTime() - startTime.getTime();
    
    const newStartAt = new Date(eventDate);
    newStartAt.setHours(startTime.getHours(), startTime.getMinutes(), startTime.getSeconds());
    const newEndAt = new Date(newStartAt.getTime() + duration);

    // Create event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .insert({
        ...template_event_data,
        title: `${template_event_data.title} (${i + 1})`,
        start_at: newStartAt.toISOString(),
        end_at: newEndAt.toISOString(),
        status: 'draft'
      })
      .select()
      .single();

    if (eventError) {
      console.error('Failed to create event:', eventError);
      continue;
    }

    // Create series event relationship
    await supabase
      .from('series_events')
      .insert({
        series_id,
        event_id: event.id,
        occurrence_number: i + 1,
        scheduled_date: eventDate
      });

    createdEvents.push(event);
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      created_events: createdEvents,
      total_created: createdEvents.length,
      message: `Generated ${createdEvents.length} events for series`
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getEventSeries(supabase: any, user: any, req: Request) {
  const url = new URL(req.url);
  const series_id = url.searchParams.get('series_id');
  const org_id = url.searchParams.get('org_id');
  const organizer_id = url.searchParams.get('organizer_id');

  let query = supabase
    .from('event_series')
    .select(`
      *,
      orgs (
        id,
        name,
        slug,
        logo_url
      )
    `);

  if (series_id) {
    query = query.eq('id', series_id);
  }

  if (org_id) {
    query = query.eq('org_id', org_id);
  }

  if (organizer_id) {
    query = query.eq('organizer_id', organizer_id);
  }

  // Filter by active series by default
  query = query.eq('is_active', true);

  const { data: series, error } = await query
    .order('created_at', { ascending: false });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch event series' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      series: series || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function getSeriesEvents(supabase: any, user: any, req: Request) {
  const url = new URL(req.url);
  const series_id = url.searchParams.get('series_id');

  if (!series_id) {
    return new Response(
      JSON.stringify({ error: 'Missing series ID' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const { data: seriesEvents, error } = await supabase
    .from('series_events')
    .select(`
      *,
      events (
        id,
        title,
        description,
        slug,
        venue,
        city,
        start_at,
        end_at,
        cover_image_url,
        status,
        visibility
      )
    `)
    .eq('series_id', series_id)
    .order('occurrence_number', { ascending: true });

  if (error) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch series events' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      series_events: seriesEvents || []
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function isValidRecurrencePattern(pattern: any): boolean {
  if (!pattern || typeof pattern !== 'object') return false;
  
  const { type, interval, days, dayOfMonth, month } = pattern;
  
  if (!type || !['daily', 'weekly', 'monthly', 'yearly'].includes(type)) return false;
  
  if (interval && (typeof interval !== 'number' || interval < 1)) return false;
  
  if (type === 'weekly' && days && (!Array.isArray(days) || days.length === 0)) return false;
  
  if (type === 'monthly' && dayOfMonth && (typeof dayOfMonth !== 'number' || dayOfMonth < 1 || dayOfMonth > 31)) return false;
  
  if (type === 'yearly' && month && (typeof month !== 'number' || month < 1 || month > 12)) return false;
  
  return true;
}

function generateEventDates(pattern: any, startDate: string, endDate?: string, maxOccurrences?: number): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  const end = endDate ? new Date(endDate) : null;
  
  let currentDate = new Date(start);
  let occurrenceCount = 0;
  
  while (currentDate && 
         (!end || currentDate <= end) && 
         (!maxOccurrences || occurrenceCount < maxOccurrences)) {
    
    dates.push(new Date(currentDate));
    occurrenceCount++;
    
    // Calculate next date based on pattern
    switch (pattern.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + (pattern.interval || 1));
        break;
        
      case 'weekly':
        if (pattern.days && pattern.days.length > 0) {
          // Find next occurrence of specified days
          const currentDay = currentDate.getDay();
          const nextDay = pattern.days.find((day: number) => day > currentDay);
          
          if (nextDay !== undefined) {
            currentDate.setDate(currentDate.getDate() + (nextDay - currentDay));
          } else {
            // Move to next week
            currentDate.setDate(currentDate.getDate() + (7 - currentDay + pattern.days[0]));
          }
        } else {
          currentDate.setDate(currentDate.getDate() + 7 * (pattern.interval || 1));
        }
        break;
        
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + (pattern.interval || 1));
        if (pattern.dayOfMonth) {
          currentDate.setDate(pattern.dayOfMonth);
        }
        break;
        
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + (pattern.interval || 1));
        if (pattern.month) {
          currentDate.setMonth(pattern.month - 1);
        }
        break;
        
      default:
        return dates;
    }
  }
  
  return dates;
}
