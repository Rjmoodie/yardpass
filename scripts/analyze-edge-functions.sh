#!/bin/bash

# YARDPASS Edge Functions Analysis Script
# This script analyzes naming conventions and identifies potential mismatches

echo "🔍 YARDPASS EDGE FUNCTIONS ANALYSIS"
echo "=================================="
echo ""

FUNCTIONS_DIR="supabase/functions"

# Get all edge functions
echo "📋 ALL EDGE FUNCTIONS (${FUNCTIONS_DIR}):"
echo "----------------------------------------"
for func in $(ls -1 "$FUNCTIONS_DIR" | grep -v "^\.$" | sort); do
    echo "✅ $func"
done

echo ""
echo "🔗 NAMING CONVENTION ANALYSIS:"
echo "-----------------------------"

# Analyze naming patterns
echo "📊 NAMING PATTERNS:"
echo ""

# Kebab-case functions (recommended)
echo "🎯 KEBAB-CASE (RECOMMENDED):"
kebab_functions=$(ls -1 "$FUNCTIONS_DIR" | grep -E "^[a-z]+(-[a-z]+)*$" | sort)
if [ -n "$kebab_functions" ]; then
    echo "$kebab_functions" | sed 's/^/  ✅ /'
else
    echo "  None found"
fi

echo ""
echo "⚠️  POTENTIAL NAMING ISSUES:"
echo ""

# Functions with underscores (should be kebab-case)
underscore_functions=$(ls -1 "$FUNCTIONS_DIR" | grep "_" | sort)
if [ -n "$underscore_functions" ]; then
    echo "❌ FUNCTIONS WITH UNDERSCORES (should use kebab-case):"
    echo "$underscore_functions" | sed 's/^/  ❌ /'
else
    echo "  ✅ No functions with underscores found"
fi

echo ""
echo "🚨 FRONTEND API CALL MISMATCHES:"
echo "-------------------------------"

# Common frontend API calls that might not match
declare -A api_mismatches=(
    ["get_user_tickets"]="tickets-my"
    ["events_with_details"]="get-events"
    ["user_tickets"]="tickets-my"
    ["ticket_purchase"]="purchase-tickets"
    ["event_details"]="get-events"
)

for api_call in "${!api_mismatches[@]}"; do
    edge_function="${api_mismatches[$api_call]}"
    if [ -d "$FUNCTIONS_DIR/$edge_function" ]; then
        echo "⚠️  Frontend calls '$api_call' → Edge function '$edge_function'"
        echo "   → Consider standardizing to kebab-case"
    fi
done

echo ""
echo "📈 FUNCTION CATEGORIES:"
echo "----------------------"

# Categorize functions
echo "🎫 TICKET MANAGEMENT:"
echo "  tickets-my, tickets-scan, tickets-transfer, purchase-tickets, generate-tickets, transfer-ticket, scan-ticket"

echo ""
echo "🎪 EVENT MANAGEMENT:"
echo "  create-event, update-event, get-events, publish-event, event-series, event-scheduling"

echo ""
echo "💳 PAYMENT PROCESSING:"
echo "  checkout-session, stripe-webhook, process-refund, manage-payouts, financial-reports"

echo ""
echo "🔍 SEARCH & DISCOVERY:"
echo "  search, enhanced-search, discover-feed, smart-recommendations"

echo ""
echo "📊 ANALYTICS:"
echo "  event-analytics, enhanced-analytics, enterprise-analytics, event-insights"

echo ""
echo "📱 SOCIAL & COMMUNICATIONS:"
echo "  social-feed, post-reactions, user-connections, communications"

echo ""
echo "🎯 RECOMMENDATIONS:"
echo "------------------"
echo "1. ✅ Use kebab-case for all function names (e.g., 'get-user-tickets')"
echo "2. ✅ Ensure frontend API calls match edge function names exactly"
echo "3. ✅ Update any hardcoded function names in frontend code"
echo "4. ✅ Consider creating missing functions for common API calls"
echo "5. ✅ Standardize URL patterns: /functions/v1/{function-name}"

echo ""
echo "🔧 DEPLOYMENT COMMANDS:"
echo "----------------------"
echo "# Deploy all functions:"
echo "supabase functions deploy --project-ref YOUR_PROJECT_REF"
echo ""
echo "# Deploy specific function:"
echo "supabase functions deploy checkout-session --project-ref YOUR_PROJECT_REF"
echo ""
echo "# List deployed functions:"
echo "supabase functions list --project-ref YOUR_PROJECT_REF"

echo ""
echo "📝 SUMMARY:"
echo "----------"
total_functions=$(ls -1 "$FUNCTIONS_DIR" | wc -l)
echo "Total Edge Functions: $total_functions"
echo "Analysis complete! ��"
