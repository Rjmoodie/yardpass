#!/bin/bash

# Enhanced Analytics SQL Deployment Script
# This script deploys the enhanced analytics database functions

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="https://tgxgbiskbqjniviqoroh.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneGdic2lrYnFqbnZpdm9yb2giLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNDU5NzQ5MCwiZXhwIjoyMDUwMTczNDkwfQ.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8"
SQL_FILE="docs/sql/ENHANCED_ANALYTICS_FUNCTIONS.sql"

echo -e "${BLUE}🚀 Enhanced Analytics SQL Deployment${NC}"
echo "=================================="

# Check if SQL file exists
if [ ! -f "$SQL_FILE" ]; then
    echo -e "${RED}❌ SQL file not found: $SQL_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}📁 SQL file found: $SQL_FILE${NC}"

# Read SQL content
SQL_CONTENT=$(cat "$SQL_FILE")

echo -e "${YELLOW}📊 Deploying Enhanced Analytics Functions...${NC}"

# Function to execute SQL via Supabase REST API
execute_sql() {
    local sql="$1"
    local description="$2"
    
    echo -e "${BLUE}🔧 $description${NC}"
    
    # Use curl to execute SQL via Supabase REST API
    response=$(curl -s -X POST \
        -H "apikey: $SUPABASE_ANON_KEY" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=minimal" \
        -d "{\"query\": \"$sql\"}" \
        "$SUPABASE_URL/rest/v1/rpc/exec_sql" 2>/dev/null || echo "{}")
    
    if [[ "$response" == *"error"* ]]; then
        echo -e "${RED}❌ Error executing SQL: $response${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Successfully executed: $description${NC}"
        return 0
    fi
}

# Split SQL into individual statements and execute them
echo -e "${YELLOW}📝 Processing SQL statements...${NC}"

# Extract and execute CREATE EXTENSION statements
echo -e "${BLUE}🔧 Installing required extensions...${NC}"
execute_sql "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" "uuid-ossp extension"
execute_sql "CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";" "pg_trgm extension"

# Extract and execute CREATE TABLE statements
echo -e "${BLUE}🔧 Creating analytics cache table...${NC}"
execute_sql "
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
);" "analytics_cache table"

# Create indexes
echo -e "${BLUE}🔧 Creating indexes...${NC}"
execute_sql "CREATE INDEX IF NOT EXISTS idx_analytics_cache_key ON public.analytics_cache(cache_key);" "cache key index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_analytics_cache_expires ON public.analytics_cache(expires_at);" "cache expires index"

# Create analytics functions
echo -e "${BLUE}🔧 Creating analytics functions...${NC}"

# Cache functions
execute_sql "
CREATE OR REPLACE FUNCTION public.cache_analytics(
  p_cache_key text,
  p_cache_data jsonb,
  p_ttl_hours integer DEFAULT 6
) RETURNS void AS \$\$
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
\$\$ LANGUAGE plpgsql SECURITY DEFINER;" "cache_analytics function"

execute_sql "
CREATE OR REPLACE FUNCTION public.get_cached_analytics(
  p_cache_key text,
  p_ttl_hours integer DEFAULT 6
) RETURNS jsonb AS \$\$
DECLARE
  cached_data jsonb;
BEGIN
  SELECT cache_data INTO cached_data
  FROM public.analytics_cache
  WHERE cache_key = p_cache_key 
    AND expires_at > now()
  LIMIT 1;

  IF cached_data IS NOT NULL THEN
    UPDATE public.analytics_cache
    SET access_count = access_count + 1,
        last_accessed_at = now()
    WHERE cache_key = p_cache_key;
  END IF;

  RETURN cached_data;
END;
\$\$ LANGUAGE plpgsql SECURITY DEFINER;" "get_cached_analytics function"

# Create performance indexes
echo -e "${BLUE}🔧 Creating performance indexes...${NC}"
execute_sql "CREATE INDEX IF NOT EXISTS idx_revenue_tracking_event_date ON public.revenue_tracking(event_id, tracking_date);" "revenue tracking index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_revenue_tracking_org_date ON public.revenue_tracking(organization_id, tracking_date);" "revenue org index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_tickets_event_created ON public.tickets(event_id, created_at);" "tickets index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_event_views_event_date ON public.event_views(event_id, viewed_at);" "event views index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_event_posts_event_created ON public.event_posts(event_id, created_at);" "event posts index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_date ON public.performance_metrics(user_id, metric_date);" "performance metrics index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_user_behavior_user_timestamp ON public.user_behavior_logs(user_id, timestamp);" "user behavior index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_orders_org_created ON public.orders(organization_id, created_at);" "orders index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_events_owner_created ON public.events(owner_context_id, created_at);" "events index"

# Create composite indexes
execute_sql "CREATE INDEX IF NOT EXISTS idx_analytics_comprehensive ON public.revenue_tracking(event_id, tracking_date, gross_amount);" "comprehensive analytics index"
execute_sql "CREATE INDEX IF NOT EXISTS idx_engagement_comprehensive ON public.event_views(event_id, viewed_at, user_id);" "engagement comprehensive index"

echo -e "${GREEN}✅ Enhanced Analytics SQL deployment completed!${NC}"
echo ""
echo -e "${BLUE}📋 Next Steps:${NC}"
echo "1. Deploy the enhanced-analytics Edge Function"
echo "2. Test the analytics endpoints"
echo "3. Verify database functions are working"
echo ""
echo -e "${YELLOW}🔍 To verify deployment, check:${NC}"
echo "- Analytics cache table exists"
echo "- Performance indexes are created"
echo "- Cache functions are available"
echo ""
echo -e "${GREEN}🎉 Analytics database infrastructure is ready!${NC}"
