-- Quick Analytics Setup for YardPass
-- Run this in the Supabase SQL Editor

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Analytics cache table
CREATE TABLE IF NOT EXISTS public.analytics_cache (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  cache_key text NOT NULL UNIQUE,
  cache_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  expires_at timestamp with time zone DEFAULT (now() + '06:00:00'::interval),
  ttl_hours integer DEFAULT 6,
  access_count integer DEFAULT 0,
  last_accessed_at timestamp with time zone DEFAULT now(),
  CONSTRAINT analytics_cache_pkey PRIMARY KEY (id)
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON public.analytics_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON public.analytics_cache(expires_at);

-- Cache analytics data
CREATE OR REPLACE FUNCTION public.cache_analytics(
  p_cache_key text,
  p_cache_data jsonb,
  p_ttl_hours integer DEFAULT 6
) RETURNS void AS $$
BEGIN
  INSERT INTO public.analytics_cache (cache_key, cache_data, ttl_hours, expires_at)
  VALUES (p_cache_key, p_cache_data, p_ttl_hours, now() + (p_ttl_hours || ' hours')::interval)
  ON CONFLICT (cache_key) 
  DO UPDATE SET 
    cache_data = EXCLUDED.cache_data,
    ttl_hours = EXCLUDED.ttl_hours,
    expires_at = now() + (EXCLUDED.ttl_hours || ' hours')::interval,
    access_count = analytics_cache.access_count + 1,
    last_accessed_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get cached analytics data
CREATE OR REPLACE FUNCTION public.get_cached_analytics(
  p_cache_key text,
  p_ttl_hours integer DEFAULT 6
) RETURNS jsonb AS $$
DECLARE
  cached_data jsonb;
BEGIN
  SELECT cache_data INTO cached_data
  FROM public.analytics_cache
  WHERE cache_key = p_cache_key 
    AND expires_at > now()
  LIMIT 1;

  -- Update access count and last accessed time
  IF cached_data IS NOT NULL THEN
    UPDATE public.analytics_cache
    SET access_count = access_count + 1,
        last_accessed_at = now()
    WHERE cache_key = p_cache_key;
  END IF;

  RETURN cached_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Clean up expired cache entries
CREATE OR REPLACE FUNCTION public.cleanup_analytics_cache() RETURNS integer AS $$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.analytics_cache
  WHERE expires_at < now();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create performance indexes for analytics
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_event_date ON public.revenue_tracking(event_id, tracking_date);
CREATE INDEX IF NOT EXISTS idx_revenue_tracking_org_date ON public.revenue_tracking(organization_id, tracking_date);
CREATE INDEX IF NOT EXISTS idx_tickets_event_created ON public.tickets(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_event_views_event_date ON public.event_views(event_id, viewed_at);
CREATE INDEX IF NOT EXISTS idx_event_posts_event_created ON public.event_posts(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_date ON public.performance_metrics(user_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_user_behavior_user_timestamp ON public.user_behavior_logs(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_orders_org_created ON public.orders(organization_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_owner_created ON public.events(owner_context_id, created_at);

-- Create composite indexes for complex queries
CREATE INDEX IF NOT EXISTS idx_analytics_comprehensive ON public.revenue_tracking(event_id, tracking_date, gross_amount);
CREATE INDEX IF NOT EXISTS idx_engagement_comprehensive ON public.event_views(event_id, viewed_at, user_id);

-- Row Level Security policies for analytics cache
ALTER TABLE public.analytics_cache ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytics_cache TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Insert sample analytics data for testing
INSERT INTO public.analytics_cache (cache_key, cache_data, ttl_hours) 
VALUES (
  'test_analytics_sample',
  '{"type": "test", "data": {"revenue": 1000, "attendance": 50}, "generated_at": "2024-01-01T00:00:00Z"}',
  6
) ON CONFLICT (cache_key) DO NOTHING;

-- Success message
SELECT 'Enhanced Analytics SQL setup completed successfully!' as status;
