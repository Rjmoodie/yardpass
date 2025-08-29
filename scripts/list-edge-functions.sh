#!/bin/bash

# Script to list all edge functions and their naming conventions
# This helps identify naming mismatches between frontend calls and actual function names

echo "🔍 YARDPASS EDGE FUNCTIONS ANALYSIS"
echo "=================================="
echo ""

# Get all edge function directories
FUNCTIONS_DIR="supabase/functions"
echo "📁 Edge Functions Directory: $FUNCTIONS_DIR"
echo ""

# List all edge functions
echo "📋 ALL EDGE FUNCTIONS:"
echo "----------------------"
for func_dir in "$FUNCTIONS_DIR"/*/; do
    if [ -d "$func_dir" ]; then
        func_name=$(basename "$func_dir")
        echo "✅ $func_name"
    fi
done

echo ""
echo "🔗 FRONTEND API CALLS vs EDGE FUNCTIONS:"
echo "----------------------------------------"

# Common frontend API calls that might not match edge function names
declare -A api_calls=(
    ["get_user_tickets"]="tickets-my"
    ["get_user_tickets"]="tickets-my"
    ["events_with_details"]="get-events"
    ["checkout-session"]="checkout-session"
    ["purchase-tickets"]="purchase-tickets"
    ["create-event"]="create-event"
    ["update-event"]="update-event"
    ["get-events"]="get-events"
    ["enhanced-search"]="enhanced-search"
    ["social-feed"]="social-feed"
    ["discover-feed"]="discover-feed"
    ["smart-recommendations"]="smart-recommendations"
    ["event-analytics"]="event-analytics"
    ["stripe-webhook"]="stripe-webhook"
)

echo "Frontend Call → Edge Function"
echo "----------------------------"
for api_call in "${!api_calls[@]}"; do
    edge_function="${api_calls[$api_call]}"
    if [ -d "$FUNCTIONS_DIR/$edge_function" ]; then
        echo "✅ $api_call → $edge_function"
    else
        echo "❌ $api_call → $edge_function (MISSING)"
    fi
done

echo ""
echo "🚨 POTENTIAL ISSUES IDENTIFIED:"
echo "-------------------------------"

# Check for common naming mismatches
if [ -d "$FUNCTIONS_DIR/tickets-my" ]; then
    echo "⚠️  Frontend calls 'get_user_tickets' but edge function is 'tickets-my'"
    echo "   → Consider renaming edge function to 'get-user-tickets' or update frontend calls"
fi

if [ -d "$FUNCTIONS_DIR/get-events" ]; then
    echo "⚠️  Frontend calls 'events_with_details' but edge function is 'get-events'"
    echo "   → Consider creating 'events-with-details' function or update frontend calls"
fi

echo ""
echo "📊 SUMMARY:"
echo "-----------"
total_functions=$(find "$FUNCTIONS_DIR" -maxdepth 1 -type d | wc -l)
total_functions=$((total_functions - 1))  # Subtract 1 for the functions directory itself
echo "Total Edge Functions: $total_functions"

echo ""
echo "🎯 RECOMMENDATIONS:"
echo "------------------"
echo "1. Standardize naming convention to kebab-case (e.g., 'get-user-tickets')"
echo "2. Ensure frontend API calls match edge function names exactly"
echo "3. Update any hardcoded function names in frontend code"
echo "4. Consider creating missing functions for common API calls"
echo ""

echo "🔧 TO DEPLOY ALL FUNCTIONS:"
echo "---------------------------"
echo "supabase functions deploy --project-ref YOUR_PROJECT_REF"
echo ""

echo "🔍 TO CHECK FUNCTION STATUS:"
echo "----------------------------"
echo "supabase functions list --project-ref YOUR_PROJECT_REF"
