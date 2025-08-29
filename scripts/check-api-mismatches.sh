#!/bin/bash

# Check for API call mismatches between frontend and edge functions

echo "🔍 API CALL MISMATCH ANALYSIS"
echo "============================="
echo ""

FUNCTIONS_DIR="supabase/functions"

echo "🚨 IDENTIFIED ISSUES:"
echo "-------------------"

# Issue 1: get_user_tickets vs tickets-my
if [ -d "$FUNCTIONS_DIR/tickets-my" ]; then
    echo "❌ ISSUE 1: Frontend calls 'get_user_tickets' but edge function is 'tickets-my'"
    echo "   → Frontend expects: /functions/v1/get_user_tickets"
    echo "   → Actual function: /functions/v1/tickets-my"
    echo "   → SOLUTION: Either rename function to 'get-user-tickets' or update frontend calls"
    echo ""
fi

# Issue 2: events_with_details vs get-events
if [ -d "$FUNCTIONS_DIR/get-events" ]; then
    echo "❌ ISSUE 2: Frontend calls 'events_with_details' but edge function is 'get-events'"
    echo "   → Frontend expects: /functions/v1/events_with_details"
    echo "   → Actual function: /functions/v1/get-events"
    echo "   → SOLUTION: Either create 'events-with-details' function or update frontend calls"
    echo ""
fi

# Issue 3: checkout-session 500 error
if [ -d "$FUNCTIONS_DIR/checkout-session" ]; then
    echo "❌ ISSUE 3: checkout-session returning 500 error"
    echo "   → Function exists but has internal errors"
    echo "   → Likely causes:"
    echo "     - Missing 'ticket_tiers' table (should be 'tickets')"
    echo "     - Missing 'create_cart_hold' RPC function"
    echo "     - Stripe configuration issues"
    echo "   → SOLUTION: Fix database schema and RPC functions"
    echo ""
fi

echo "🔧 RECOMMENDED FIXES:"
echo "-------------------"

echo "1. RENAME FUNCTIONS TO MATCH FRONTEND EXPECTATIONS:"
echo "   mv supabase/functions/tickets-my supabase/functions/get-user-tickets"
echo "   mv supabase/functions/get-events supabase/functions/events-with-details"
echo ""

echo "2. OR UPDATE FRONTEND API CALLS:"
echo "   - Change 'get_user_tickets' → 'tickets-my'"
echo "   - Change 'events_with_details' → 'get-events'"
echo ""

echo "3. FIX DATABASE SCHEMA ISSUES:"
echo "   - Ensure 'tickets' table exists (not 'ticket_tiers')"
echo "   - Create 'create_cart_hold' RPC function"
echo "   - Verify Stripe environment variables"
echo ""

echo "📋 CURRENT EDGE FUNCTIONS:"
echo "------------------------"
ls -1 "$FUNCTIONS_DIR" | sort | sed 's/^/  /'

echo ""
echo "🎯 NEXT STEPS:"
echo "-------------"
echo "1. Choose naming convention (kebab-case recommended)"
echo "2. Update either frontend calls or function names"
echo "3. Fix database schema issues"
echo "4. Test all API endpoints"
echo "5. Deploy updated functions"
