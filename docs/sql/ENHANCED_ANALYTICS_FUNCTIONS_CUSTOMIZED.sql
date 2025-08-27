-- ===== ENHANCED ANALYTICS FUNCTIONS - CUSTOMIZED FOR YARDPASS SCHEMA =====
-- This script is customized to match the exact database schema
-- All column names and table structures match the actual database

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ===== ANALYTICS CACHE TABLE =====
CREATE TABLE IF NOT EXISTS public.analytics_cache (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    cache_key text UNIQUE NOT NULL,
    analytics_data jsonb NOT NULL,
    analytics_type text NOT NULL,
    parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ===== CACHE MANAGEMENT FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.cache_analytics(
    p_cache_key text,
    p_analytics_data jsonb,
    p_analytics_type text,
    p_parameters jsonb DEFAULT '{}'::jsonb,
    p_ttl_hours integer DEFAULT 24
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.analytics_cache (
        cache_key, 
        analytics_data, 
        analytics_type, 
        parameters, 
        expires_at
    ) VALUES (
        p_cache_key,
        p_analytics_data,
        p_analytics_type,
        p_parameters,
        now() + (p_ttl_hours || ' hours')::interval
    )
    ON CONFLICT (cache_key) 
    DO UPDATE SET
        analytics_data = EXCLUDED.analytics_data,
        analytics_type = EXCLUDED.analytics_type,
        parameters = EXCLUDED.parameters,
        expires_at = EXCLUDED.expires_at,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_cached_analytics(
    p_cache_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    cached_data jsonb;
BEGIN
    SELECT analytics_data INTO cached_data
    FROM public.analytics_cache
    WHERE cache_key = p_cache_key 
      AND expires_at > now();
    
    RETURN cached_data;
END;
$$;

CREATE OR REPLACE FUNCTION public.cleanup_analytics_cache()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
BEGIN
    DELETE FROM public.analytics_cache 
    WHERE expires_at < now();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;

-- ===== ENHANCED EVENT ANALYTICS =====
CREATE OR REPLACE FUNCTION public.get_enhanced_event_analytics(
    p_event_id uuid DEFAULT NULL,
    p_owner_context_id uuid DEFAULT NULL,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_include_insights boolean DEFAULT true,
    p_include_predictions boolean DEFAULT false,
    p_include_comparisons boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    start_date date;
    end_date date;
    event_data jsonb;
    revenue_data jsonb;
    attendance_data jsonb;
    engagement_data jsonb;
    performance_data jsonb;
    insights_data jsonb;
    predictions_data jsonb;
    comparisons_data jsonb;
BEGIN
    -- Set default date range if not provided
    start_date := COALESCE(p_start_date, current_date - interval '30 days');
    end_date := COALESCE(p_end_date, current_date);
    
    -- Get event basic data
    SELECT jsonb_build_object(
        'event_id', e.id,
        'title', e.title,
        'owner_context_id', e.owner_context_id,
        'status', e.status,
        'category', e.category,
        'views_count', e.views_count,
        'likes_count', e.likes_count,
        'shares_count', e.shares_count,
        'created_at', e.created_at,
        'updated_at', e.updated_at
    ) INTO event_data
    FROM public.events e
    WHERE (p_event_id IS NULL OR e.id = p_event_id)
      AND (p_owner_context_id IS NULL OR e.owner_context_id = p_owner_context_id)
    LIMIT 1;
    
    -- Get revenue data from revenue_tracking table
    SELECT jsonb_build_object(
        'total_gross', COALESCE(SUM(rt.gross_amount), 0),
        'total_platform_fees', COALESCE(SUM(rt.platform_fee), 0),
        'total_net', COALESCE(SUM(rt.net_amount), 0),
        'currency', rt.currency,
        'daily_revenue', jsonb_agg(
            jsonb_build_object(
                'date', rt.tracking_date,
                'gross', rt.gross_amount,
                'platform_fee', rt.platform_fee,
                'net', rt.net_amount
            ) ORDER BY rt.tracking_date
        )
    ) INTO revenue_data
    FROM public.revenue_tracking rt
    WHERE rt.event_id = COALESCE(p_event_id, rt.event_id)
      AND rt.tracking_date BETWEEN start_date AND end_date;
    
    -- Get attendance data from tickets table
    SELECT jsonb_build_object(
        'total_tickets', COUNT(t.id),
        'active_tickets', COUNT(t.id) FILTER (WHERE t.status = 'active'),
        'used_tickets', COUNT(t.id) FILTER (WHERE t.used_at IS NOT NULL),
        'ticket_usage_rate', CASE 
            WHEN COUNT(t.id) > 0 THEN 
                ROUND((COUNT(t.id) FILTER (WHERE t.used_at IS NOT NULL)::numeric / COUNT(t.id)::numeric) * 100, 2)
            ELSE 0 
        END,
        'daily_attendance', jsonb_agg(
            jsonb_build_object(
                'date', DATE(t.created_at),
                'tickets_created', COUNT(t.id),
                'tickets_used', COUNT(t.id) FILTER (WHERE t.used_at IS NOT NULL)
            ) ORDER BY DATE(t.created_at)
        )
    ) INTO attendance_data
    FROM public.tickets t
    WHERE t.event_id = COALESCE(p_event_id, t.event_id)
      AND t.created_at BETWEEN start_date AND end_date + interval '1 day';
    
    -- Get engagement data from event_posts and event_views
    SELECT jsonb_build_object(
        'total_posts', COUNT(ep.id),
        'total_views', COUNT(ev.id),
        'unique_viewers', COUNT(DISTINCT ev.user_id),
        'pinned_posts', COUNT(ep.id) FILTER (WHERE ep.is_pinned = true),
        'daily_engagement', jsonb_agg(
            jsonb_build_object(
                'date', COALESCE(DATE(ep.created_at), DATE(ev.viewed_at)),
                'posts', COUNT(ep.id),
                'views', COUNT(ev.id),
                'unique_viewers', COUNT(DISTINCT ev.user_id)
            ) ORDER BY COALESCE(DATE(ep.created_at), DATE(ev.viewed_at))
        )
    ) INTO engagement_data
    FROM public.event_posts ep
    FULL OUTER JOIN public.event_views ev ON ep.event_id = ev.event_id 
        AND DATE(ep.created_at) = DATE(ev.viewed_at)
    WHERE (ep.event_id = COALESCE(p_event_id, ep.event_id) OR ev.event_id = COALESCE(p_event_id, ev.event_id))
      AND (ep.created_at BETWEEN start_date AND end_date + interval '1 day' 
           OR ev.viewed_at BETWEEN start_date AND end_date + interval '1 day');
    
    -- Get performance data from performance_metrics table
    SELECT jsonb_build_object(
        'total_metrics', COUNT(pm.id),
        'metric_types', jsonb_agg(DISTINCT pm.metric_type),
        'average_metric_value', AVG(pm.metric_value),
        'daily_performance', jsonb_agg(
            jsonb_build_object(
                'date', pm.metric_date,
                'metric_type', pm.metric_type,
                'metric_value', pm.metric_value,
                'metadata', pm.metadata
            ) ORDER BY pm.metric_date, pm.metric_type
        )
    ) INTO performance_data
    FROM public.performance_metrics pm
    WHERE pm.event_id = COALESCE(p_event_id, pm.event_id)
      AND pm.metric_date BETWEEN start_date AND end_date;
    
    -- Generate insights if requested
    IF p_include_insights THEN
        SELECT public.generate_event_insights(
            event_data,
            revenue_data,
            attendance_data,
            engagement_data,
            performance_data
        ) INTO insights_data;
    END IF;
    
    -- Generate predictions if requested
    IF p_include_predictions THEN
        SELECT public.generate_event_predictions(
            event_data,
            revenue_data,
            attendance_data,
            engagement_data,
            performance_data
        ) INTO predictions_data;
    END IF;
    
    -- Generate comparisons if requested
    IF p_include_comparisons THEN
        SELECT public.generate_event_comparisons(
            p_event_id,
            p_owner_context_id,
            start_date,
            end_date
        ) INTO comparisons_data;
    END IF;
    
    -- Build final result
    result := jsonb_build_object(
        'event', event_data,
        'revenue', revenue_data,
        'attendance', attendance_data,
        'engagement', engagement_data,
        'performance', performance_data,
        'insights', insights_data,
        'predictions', predictions_data,
        'comparisons', comparisons_data,
        'meta', jsonb_build_object(
            'start_date', start_date,
            'end_date', end_date,
            'generated_at', now(),
            'cache_key', 'event_analytics_' || COALESCE(p_event_id::text, p_owner_context_id::text) || '_' || start_date || '_' || end_date
        )
    );
    
    RETURN result;
END;
$$;

-- ===== ENHANCED ENTERPRISE ANALYTICS =====
CREATE OR REPLACE FUNCTION public.get_enhanced_enterprise_analytics(
    p_owner_context_id uuid DEFAULT NULL,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_include_insights boolean DEFAULT true,
    p_include_predictions boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    start_date date;
    end_date date;
    events_data jsonb;
    revenue_data jsonb;
    orders_data jsonb;
    insights_data jsonb;
    predictions_data jsonb;
BEGIN
    -- Set default date range if not provided
    start_date := COALESCE(p_start_date, current_date - interval '30 days');
    end_date := COALESCE(p_end_date, current_date);
    
    -- Get events summary
    SELECT jsonb_build_object(
        'total_events', COUNT(e.id),
        'active_events', COUNT(e.id) FILTER (WHERE e.status = 'active'),
        'total_views', SUM(e.views_count),
        'total_likes', SUM(e.likes_count),
        'total_shares', SUM(e.shares_count),
        'events_by_category', jsonb_object_agg(
            e.category, COUNT(e.id)
        ),
        'events_by_status', jsonb_object_agg(
            e.status, COUNT(e.id)
        ),
        'daily_events', jsonb_agg(
            jsonb_build_object(
                'date', DATE(e.created_at),
                'events_created', COUNT(e.id),
                'total_views', SUM(e.views_count),
                'total_likes', SUM(e.likes_count)
            ) ORDER BY DATE(e.created_at)
        )
    ) INTO events_data
    FROM public.events e
    WHERE (p_owner_context_id IS NULL OR e.owner_context_id = p_owner_context_id)
      AND e.created_at BETWEEN start_date AND end_date + interval '1 day';
    
    -- Get revenue summary
    SELECT jsonb_build_object(
        'total_gross_revenue', COALESCE(SUM(rt.gross_amount), 0),
        'total_platform_fees', COALESCE(SUM(rt.platform_fee), 0),
        'total_net_revenue', COALESCE(SUM(rt.net_amount), 0),
        'average_order_value', CASE 
            WHEN COUNT(rt.order_id) > 0 THEN 
                ROUND(SUM(rt.gross_amount) / COUNT(rt.order_id), 2)
            ELSE 0 
        END,
        'daily_revenue', jsonb_agg(
            jsonb_build_object(
                'date', rt.tracking_date,
                'gross_revenue', rt.gross_amount,
                'platform_fees', rt.platform_fee,
                'net_revenue', rt.net_amount
            ) ORDER BY rt.tracking_date
        )
    ) INTO revenue_data
    FROM public.revenue_tracking rt
    JOIN public.events e ON rt.event_id = e.id
    WHERE (p_owner_context_id IS NULL OR e.owner_context_id = p_owner_context_id)
      AND rt.tracking_date BETWEEN start_date AND end_date;
    
    -- Get orders summary
    SELECT jsonb_build_object(
        'total_orders', COUNT(o.id),
        'completed_orders', COUNT(o.id) FILTER (WHERE o.status = 'completed'),
        'pending_orders', COUNT(o.id) FILTER (WHERE o.status = 'pending'),
        'total_sales', COALESCE(SUM(o.total_cents), 0),
        'average_order_value_cents', CASE 
            WHEN COUNT(o.id) > 0 THEN 
                ROUND(SUM(o.total_cents) / COUNT(o.id), 0)
            ELSE 0 
        END,
        'daily_orders', jsonb_agg(
            jsonb_build_object(
                'date', DATE(o.created_at),
                'orders_created', COUNT(o.id),
                'total_sales_cents', SUM(o.total_cents),
                'completed_orders', COUNT(o.id) FILTER (WHERE o.status = 'completed')
            ) ORDER BY DATE(o.created_at)
        )
    ) INTO orders_data
    FROM public.orders o
    JOIN public.events e ON o.event_id = e.id
    WHERE (p_owner_context_id IS NULL OR e.owner_context_id = p_owner_context_id)
      AND o.created_at BETWEEN start_date AND end_date + interval '1 day';
    
    -- Generate insights if requested
    IF p_include_insights THEN
        SELECT public.generate_enterprise_insights(
            events_data,
            revenue_data,
            orders_data
        ) INTO insights_data;
    END IF;
    
    -- Generate predictions if requested
    IF p_include_predictions THEN
        SELECT public.generate_enterprise_predictions(
            events_data,
            revenue_data,
            orders_data
        ) INTO predictions_data;
    END IF;
    
    -- Build final result
    result := jsonb_build_object(
        'events', events_data,
        'revenue', revenue_data,
        'orders', orders_data,
        'insights', insights_data,
        'predictions', predictions_data,
        'meta', jsonb_build_object(
            'start_date', start_date,
            'end_date', end_date,
            'generated_at', now(),
            'cache_key', 'enterprise_analytics_' || COALESCE(p_owner_context_id::text, 'all') || '_' || start_date || '_' || end_date
        )
    );
    
    RETURN result;
END;
$$;

-- ===== ENHANCED PERFORMANCE ANALYTICS =====
CREATE OR REPLACE FUNCTION public.get_enhanced_performance_analytics(
    p_event_id uuid DEFAULT NULL,
    p_owner_context_id uuid DEFAULT NULL,
    p_start_date date DEFAULT NULL,
    p_end_date date DEFAULT NULL,
    p_include_insights boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb;
    start_date date;
    end_date date;
    performance_data jsonb;
    user_behavior_data jsonb;
    insights_data jsonb;
BEGIN
    -- Set default date range if not provided
    start_date := COALESCE(p_start_date, current_date - interval '30 days');
    end_date := COALESCE(p_end_date, current_date);
    
    -- Get performance metrics
    SELECT jsonb_build_object(
        'total_metrics', COUNT(pm.id),
        'metric_types', jsonb_agg(DISTINCT pm.metric_type),
        'average_metric_value', AVG(pm.metric_value),
        'max_metric_value', MAX(pm.metric_value),
        'min_metric_value', MIN(pm.metric_value),
        'metrics_by_type', jsonb_object_agg(
            pm.metric_type, jsonb_build_object(
                'count', COUNT(pm.id),
                'average', AVG(pm.metric_value),
                'max', MAX(pm.metric_value),
                'min', MIN(pm.metric_value)
            )
        ),
        'daily_performance', jsonb_agg(
            jsonb_build_object(
                'date', pm.metric_date,
                'metric_type', pm.metric_type,
                'metric_value', pm.metric_value,
                'metadata', pm.metadata
            ) ORDER BY pm.metric_date, pm.metric_type
        )
    ) INTO performance_data
    FROM public.performance_metrics pm
    JOIN public.events e ON pm.event_id = e.id
    WHERE (p_event_id IS NULL OR pm.event_id = p_event_id)
      AND (p_owner_context_id IS NULL OR e.owner_context_id = p_owner_context_id)
      AND pm.metric_date BETWEEN start_date AND end_date;
    
    -- Get user behavior data
    SELECT jsonb_build_object(
        'total_behaviors', COUNT(ubl.id),
        'behavior_types', jsonb_agg(DISTINCT ubl.behavior_type),
        'unique_users', COUNT(DISTINCT ubl.user_id),
        'behaviors_by_type', jsonb_object_agg(
            ubl.behavior_type, COUNT(ubl.id)
        ),
        'daily_behaviors', jsonb_agg(
            jsonb_build_object(
                'date', DATE(ubl.timestamp),
                'behavior_type', ubl.behavior_type,
                'count', COUNT(ubl.id),
                'unique_users', COUNT(DISTINCT ubl.user_id)
            ) ORDER BY DATE(ubl.timestamp), ubl.behavior_type
        )
    ) INTO user_behavior_data
    FROM public.user_behavior_logs ubl
    JOIN public.events e ON ubl.event_id = e.id
    WHERE (p_event_id IS NULL OR ubl.event_id = p_event_id)
      AND (p_owner_context_id IS NULL OR e.owner_context_id = p_owner_context_id)
      AND ubl.timestamp BETWEEN start_date AND end_date + interval '1 day';
    
    -- Generate insights if requested
    IF p_include_insights THEN
        SELECT public.generate_performance_insights(
            performance_data,
            user_behavior_data
        ) INTO insights_data;
    END IF;
    
    -- Build final result
    result := jsonb_build_object(
        'performance', performance_data,
        'user_behavior', user_behavior_data,
        'insights', insights_data,
        'meta', jsonb_build_object(
            'start_date', start_date,
            'end_date', end_date,
            'generated_at', now(),
            'cache_key', 'performance_analytics_' || COALESCE(p_event_id::text, p_owner_context_id::text) || '_' || start_date || '_' || end_date
        )
    );
    
    RETURN result;
END;
$$;

-- ===== INSIGHT GENERATION FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.generate_event_insights(
    p_event_data jsonb,
    p_revenue_data jsonb,
    p_attendance_data jsonb,
    p_engagement_data jsonb,
    p_performance_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    insights jsonb;
BEGIN
    insights := jsonb_build_object(
        'revenue_insights', jsonb_build_object(
            'total_revenue', (p_revenue_data->>'total_net')::numeric,
            'revenue_trend', CASE 
                WHEN (p_revenue_data->>'total_net')::numeric > 0 THEN 'positive'
                ELSE 'neutral'
            END,
            'platform_fee_percentage', CASE 
                WHEN (p_revenue_data->>'total_gross')::numeric > 0 THEN 
                    ROUND(((p_revenue_data->>'total_platform_fees')::numeric / (p_revenue_data->>'total_gross')::numeric) * 100, 2)
                ELSE 0
            END
        ),
        'attendance_insights', jsonb_build_object(
            'total_tickets', (p_attendance_data->>'total_tickets')::integer,
            'usage_rate', (p_attendance_data->>'ticket_usage_rate')::numeric,
            'attendance_trend', CASE 
                WHEN (p_attendance_data->>'ticket_usage_rate')::numeric > 70 THEN 'excellent'
                WHEN (p_attendance_data->>'ticket_usage_rate')::numeric > 50 THEN 'good'
                ELSE 'needs_improvement'
            END
        ),
        'engagement_insights', jsonb_build_object(
            'total_posts', (p_engagement_data->>'total_posts')::integer,
            'total_views', (p_engagement_data->>'total_views')::integer,
            'unique_viewers', (p_engagement_data->>'unique_viewers')::integer,
            'engagement_score', CASE 
                WHEN (p_engagement_data->>'total_views')::integer > 0 THEN 
                    ROUND(((p_engagement_data->>'total_posts')::integer::numeric / (p_engagement_data->>'total_views')::integer::numeric) * 100, 2)
                ELSE 0
            END
        ),
        'performance_insights', jsonb_build_object(
            'total_metrics', (p_performance_data->>'total_metrics')::integer,
            'average_metric_value', (p_performance_data->>'average_metric_value')::numeric,
            'performance_trend', CASE 
                WHEN (p_performance_data->>'average_metric_value')::numeric > 0 THEN 'positive'
                ELSE 'neutral'
            END
        )
    );
    
    RETURN insights;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_enterprise_insights(
    p_events_data jsonb,
    p_revenue_data jsonb,
    p_orders_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    insights jsonb;
BEGIN
    insights := jsonb_build_object(
        'events_insights', jsonb_build_object(
            'total_events', (p_events_data->>'total_events')::integer,
            'active_events', (p_events_data->>'active_events')::integer,
            'total_views', (p_events_data->>'total_views')::integer,
            'average_views_per_event', CASE 
                WHEN (p_events_data->>'total_events')::integer > 0 THEN 
                    ROUND((p_events_data->>'total_views')::integer::numeric / (p_events_data->>'total_events')::integer::numeric, 0)
                ELSE 0
            END
        ),
        'revenue_insights', jsonb_build_object(
            'total_revenue', (p_revenue_data->>'total_net_revenue')::numeric,
            'average_order_value', (p_revenue_data->>'average_order_value')::numeric,
            'revenue_per_event', CASE 
                WHEN (p_events_data->>'total_events')::integer > 0 THEN 
                    ROUND((p_revenue_data->>'total_net_revenue')::numeric / (p_events_data->>'total_events')::integer::numeric, 2)
                ELSE 0
            END
        ),
        'orders_insights', jsonb_build_object(
            'total_orders', (p_orders_data->>'total_orders')::integer,
            'completed_orders', (p_orders_data->>'completed_orders')::integer,
            'completion_rate', CASE 
                WHEN (p_orders_data->>'total_orders')::integer > 0 THEN 
                    ROUND(((p_orders_data->>'completed_orders')::integer::numeric / (p_orders_data->>'total_orders')::integer::numeric) * 100, 2)
                ELSE 0
            END,
            'average_order_value_cents', (p_orders_data->>'average_order_value_cents')::integer
        )
    );
    
    RETURN insights;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_performance_insights(
    p_performance_data jsonb,
    p_user_behavior_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    insights jsonb;
BEGIN
    insights := jsonb_build_object(
        'performance_insights', jsonb_build_object(
            'total_metrics', (p_performance_data->>'total_metrics')::integer,
            'average_metric_value', (p_performance_data->>'average_metric_value')::numeric,
            'metric_types_count', jsonb_array_length(p_performance_data->'metric_types'),
            'performance_trend', CASE 
                WHEN (p_performance_data->>'average_metric_value')::numeric > 0 THEN 'positive'
                ELSE 'neutral'
            END
        ),
        'user_behavior_insights', jsonb_build_object(
            'total_behaviors', (p_user_behavior_data->>'total_behaviors')::integer,
            'unique_users', (p_user_behavior_data->>'unique_users')::integer,
            'behavior_types_count', jsonb_array_length(p_user_behavior_data->'behavior_types'),
            'average_behaviors_per_user', CASE 
                WHEN (p_user_behavior_data->>'unique_users')::integer > 0 THEN 
                    ROUND((p_user_behavior_data->>'total_behaviors')::integer::numeric / (p_user_behavior_data->>'unique_users')::integer::numeric, 2)
                ELSE 0
            END
        )
    );
    
    RETURN insights;
END;
$$;

-- ===== PREDICTION GENERATION FUNCTIONS =====
CREATE OR REPLACE FUNCTION public.generate_event_predictions(
    p_event_data jsonb,
    p_revenue_data jsonb,
    p_attendance_data jsonb,
    p_engagement_data jsonb,
    p_performance_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    predictions jsonb;
BEGIN
    -- Simple prediction logic based on current trends
    predictions := jsonb_build_object(
        'revenue_predictions', jsonb_build_object(
            'next_week_revenue', ROUND((p_revenue_data->>'total_net')::numeric * 1.1, 2),
            'next_month_revenue', ROUND((p_revenue_data->>'total_net')::numeric * 1.3, 2),
            'growth_rate', '10-30%'
        ),
        'attendance_predictions', jsonb_build_object(
            'next_week_tickets', ROUND((p_attendance_data->>'total_tickets')::integer * 1.05, 0),
            'next_month_tickets', ROUND((p_attendance_data->>'total_tickets')::integer * 1.15, 0),
            'usage_rate_prediction', ROUND((p_attendance_data->>'ticket_usage_rate')::numeric * 1.02, 2)
        ),
        'engagement_predictions', jsonb_build_object(
            'next_week_views', ROUND((p_engagement_data->>'total_views')::integer * 1.08, 0),
            'next_month_views', ROUND((p_engagement_data->>'total_views')::integer * 1.25, 0),
            'engagement_growth', '8-25%'
        )
    );
    
    RETURN predictions;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_enterprise_predictions(
    p_events_data jsonb,
    p_revenue_data jsonb,
    p_orders_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    predictions jsonb;
BEGIN
    predictions := jsonb_build_object(
        'events_predictions', jsonb_build_object(
            'next_week_events', ROUND((p_events_data->>'total_events')::integer * 1.05, 0),
            'next_month_events', ROUND((p_events_data->>'total_events')::integer * 1.2, 0),
            'views_growth', '5-20%'
        ),
        'revenue_predictions', jsonb_build_object(
            'next_week_revenue', ROUND((p_revenue_data->>'total_net_revenue')::numeric * 1.12, 2),
            'next_month_revenue', ROUND((p_revenue_data->>'total_net_revenue')::numeric * 1.35, 2),
            'revenue_growth', '12-35%'
        ),
        'orders_predictions', jsonb_build_object(
            'next_week_orders', ROUND((p_orders_data->>'total_orders')::integer * 1.1, 0),
            'next_month_orders', ROUND((p_orders_data->>'total_orders')::integer * 1.28, 0),
            'completion_rate_prediction', ROUND((p_orders_data->>'completion_rate')::numeric * 1.01, 2)
        )
    );
    
    RETURN predictions;
END;
$$;

-- ===== COMPARISON GENERATION FUNCTION =====
CREATE OR REPLACE FUNCTION public.generate_event_comparisons(
    p_event_id uuid,
    p_owner_context_id uuid,
    p_start_date date,
    p_end_date date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    comparisons jsonb;
    current_period_data jsonb;
    previous_period_data jsonb;
    previous_start_date date;
    previous_end_date date;
    period_days integer;
BEGIN
    -- Calculate period length
    period_days := p_end_date - p_start_date;
    previous_end_date := p_start_date - interval '1 day';
    previous_start_date := previous_end_date - period_days;
    
    -- Get current period data
    SELECT public.get_enhanced_event_analytics(
        p_event_id, 
        p_owner_context_id, 
        p_start_date, 
        p_end_date, 
        false, false, false
    ) INTO current_period_data;
    
    -- Get previous period data
    SELECT public.get_enhanced_event_analytics(
        p_event_id, 
        p_owner_context_id, 
        previous_start_date, 
        previous_end_date, 
        false, false, false
    ) INTO previous_period_data;
    
    -- Calculate comparisons
    comparisons := jsonb_build_object(
        'revenue_comparison', jsonb_build_object(
            'current_revenue', (current_period_data->'revenue'->>'total_net')::numeric,
            'previous_revenue', (previous_period_data->'revenue'->>'total_net')::numeric,
            'revenue_change', CASE 
                WHEN (previous_period_data->'revenue'->>'total_net')::numeric > 0 THEN
                    ROUND(((current_period_data->'revenue'->>'total_net')::numeric - (previous_period_data->'revenue'->>'total_net')::numeric) / (previous_period_data->'revenue'->>'total_net')::numeric * 100, 2)
                ELSE 0
            END,
            'revenue_trend', CASE 
                WHEN (current_period_data->'revenue'->>'total_net')::numeric > (previous_period_data->'revenue'->>'total_net')::numeric THEN 'increasing'
                WHEN (current_period_data->'revenue'->>'total_net')::numeric < (previous_period_data->'revenue'->>'total_net')::numeric THEN 'decreasing'
                ELSE 'stable'
            END
        ),
        'attendance_comparison', jsonb_build_object(
            'current_tickets', (current_period_data->'attendance'->>'total_tickets')::integer,
            'previous_tickets', (previous_period_data->'attendance'->>'total_tickets')::integer,
            'ticket_change', CASE 
                WHEN (previous_period_data->'attendance'->>'total_tickets')::integer > 0 THEN
                    ROUND(((current_period_data->'attendance'->>'total_tickets')::integer - (previous_period_data->'attendance'->>'total_tickets')::integer)::numeric / (previous_period_data->'attendance'->>'total_tickets')::integer * 100, 2)
                ELSE 0
            END,
            'usage_rate_change', CASE 
                WHEN (previous_period_data->'attendance'->>'ticket_usage_rate')::numeric > 0 THEN
                    ROUND(((current_period_data->'attendance'->>'ticket_usage_rate')::numeric - (previous_period_data->'attendance'->>'ticket_usage_rate')::numeric), 2)
                ELSE 0
            END
        ),
        'engagement_comparison', jsonb_build_object(
            'current_views', (current_period_data->'engagement'->>'total_views')::integer,
            'previous_views', (previous_period_data->'engagement'->>'total_views')::integer,
            'view_change', CASE 
                WHEN (previous_period_data->'engagement'->>'total_views')::integer > 0 THEN
                    ROUND(((current_period_data->'engagement'->>'total_views')::integer - (previous_period_data->'engagement'->>'total_views')::integer)::numeric / (previous_period_data->'engagement'->>'total_views')::integer * 100, 2)
                ELSE 0
            END,
            'current_posts', (current_period_data->'engagement'->>'total_posts')::integer,
            'previous_posts', (previous_period_data->'engagement'->>'total_posts')::integer,
            'post_change', CASE 
                WHEN (previous_period_data->'engagement'->>'total_posts')::integer > 0 THEN
                    ROUND(((current_period_data->'engagement'->>'total_posts')::integer - (previous_period_data->'engagement'->>'total_posts')::integer)::numeric / (previous_period_data->'engagement'->>'total_posts')::integer * 100, 2)
                ELSE 0
            END
        )
    );
    
    RETURN comparisons;
END;
$$;

-- ===== PERFORMANCE INDEXES =====
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON public.analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON public.analytics_cache(expires_at);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_type ON public.analytics_cache(analytics_type);

CREATE INDEX IF NOT EXISTS idx_revenue_tracking_event_date ON public.revenue_tracking(event_id, tracking_date);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_date ON public.revenue_tracking(tracking_date);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_order ON public.revenue_tracking(order_id);

CREATE INDEX IF NOT EXISTS idx_tickets_event_created ON public.tickets(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tickets_user_status ON public.tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_tickets_used_at ON public.tickets(used_at);

CREATE INDEX IF NOT EXISTS idx_events_owner_created ON public.events(owner_context_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_status_category ON public.events(status, category);
CREATE INDEX IF NOT EXISTS idx_events_views_likes ON public.events(views_count, likes_count);

CREATE INDEX IF NOT EXISTS idx_orders_event_created ON public.orders(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_status ON public.orders(user_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_total_cents ON public.orders(total_cents);

CREATE INDEX IF NOT EXISTS idx_event_views_event_viewed ON public.event_views(event_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_event_views_user ON public.event_views(user_id);
CREATE INDEX IF NOT EXISTS idx_event_views_date ON public.event_views(viewed_at);

CREATE INDEX IF NOT EXISTS idx_event_posts_event_created ON public.event_posts(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_posts_user ON public.event_posts(user_id);
CREATE INDEX IF NOT EXISTS idx_event_posts_pinned ON public.event_posts(is_pinned);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_event_date ON public.performance_metrics(event_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON public.performance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_value ON public.performance_metrics(metric_value);

CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_event_timestamp ON public.user_behavior_logs(event_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_user_type ON public.user_behavior_logs(user_id, behavior_type);
CREATE INDEX IF NOT EXISTS idx_user_behavior_logs_date ON public.user_behavior_logs(timestamp);

-- ===== SECURITY =====
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.analytics_cache TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ===== CLEANUP SCHEDULE =====
-- Note: Set up a cron job or scheduled task to run cleanup_analytics_cache() periodically
-- Example: SELECT public.cleanup_analytics_cache();

-- ===== VERIFICATION QUERIES =====
-- Test the functions with sample data
-- SELECT public.get_enhanced_event_analytics();
-- SELECT public.get_enhanced_enterprise_analytics();
-- SELECT public.get_enhanced_performance_analytics();
