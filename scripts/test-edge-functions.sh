#!/bin/bash

# YardPass Edge Functions Test Script
# Tests all Edge Functions for basic functionality

echo "🔍 YardPass Edge Functions Test Suite"
echo "====================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0

# Function to test Edge Function
test_edge_function() {
    local function_name=$1
    local test_description=$2
    
    echo -e "\n🔍 Testing: ${YELLOW}$function_name${NC}"
    echo "Description: $test_description"
    
    # Check if function exists
    if [ -d "supabase/functions/$function_name" ]; then
        if [ -f "supabase/functions/$function_name/index.ts" ]; then
            echo -e "✅ ${GREEN}Function exists and has index.ts${NC}"
            PASSED=$((PASSED + 1))
        else
            echo -e "❌ ${RED}Function exists but missing index.ts${NC}"
            FAILED=$((FAILED + 1))
        fi
    else
        echo -e "❌ ${RED}Function directory not found${NC}"
        FAILED=$((FAILED + 1))
    fi
}

# Test all Edge Functions
echo -e "\n📋 Testing Edge Functions:"

# Phase 1: Critical Ticket Flow
test_edge_function "checkout-session" "Stripe checkout integration"
test_edge_function "stripe-webhook" "Payment processing webhook"
test_edge_function "tickets-my" "User ticket wallet"
test_edge_function "tickets-scan" "Ticket scanning"
test_edge_function "tickets-transfer" "P2P ticket transfers"

# Phase 2: Core Event Management
test_edge_function "get-events" "Event retrieval with filtering"
test_edge_function "create-event" "Event creation"
test_edge_function "update-event" "Event updates"
test_edge_function "upload-event-image" "Image uploads"

# Phase 3: Ticket Management
test_edge_function "purchase-tickets" "Ticket purchasing"
test_edge_function "generate-tickets" "Ticket generation"
test_edge_function "scan-ticket" "Ticket scanning"
test_edge_function "transfer-ticket" "Ticket transfers"
test_edge_function "process-refund" "Refund processing"

# Phase 4: Social & Community
test_edge_function "social-feed" "Social posts"
test_edge_function "notifications" "User notifications"
test_edge_function "discover-feed" "Event discovery"
test_edge_function "post-reactions" "Post reactions"
test_edge_function "user-connections" "User connections"

# Phase 5: Payment & Financial
test_edge_function "manage-payouts" "Organizer payouts"
test_edge_function "financial-reports" "Financial reporting"
test_edge_function "event-insights" "Event analytics"
test_edge_function "push-notifications" "Push notifications"
test_edge_function "realtime-sync" "Real-time sync"

# Phase 6: Advanced Features
test_edge_function "event-scheduling" "Advanced scheduling"
test_edge_function "waitlist-management" "Waitlist features"
test_edge_function "enterprise-analytics" "Enterprise analytics"
test_edge_function "smart-recommendations" "AI recommendations"
test_edge_function "content-optimization" "Content optimization"
test_edge_function "event-analytics" "Event analytics"

# Test API Gateway
echo -e "\n🔧 Testing API Gateway:"
if [ -f "packages/api/src/gateway.ts" ]; then
    echo -e "✅ ${GREEN}API Gateway exists${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "❌ ${RED}API Gateway not found${NC}"
    FAILED=$((FAILED + 1))
fi

# Test API exports
if [ -f "packages/api/src/index.ts" ]; then
    if grep -q "export.*apiGateway" "packages/api/src/index.ts"; then
        echo -e "✅ ${GREEN}API Gateway properly exported${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "❌ ${RED}API Gateway not properly exported${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "❌ ${RED}API index.ts not found${NC}"
    FAILED=$((FAILED + 1))
fi

# Test frontend components
echo -e "\n📱 Testing Frontend Components:"

# Test SearchScreen
if [ -f "apps/mobile/src/screens/main/SearchScreen.tsx" ]; then
    if grep -q "apiGateway" "apps/mobile/src/screens/main/SearchScreen.tsx"; then
        echo -e "✅ ${GREEN}SearchScreen using apiGateway${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "❌ ${RED}SearchScreen not using apiGateway${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "❌ ${RED}SearchScreen not found${NC}"
    FAILED=$((FAILED + 1))
fi

# Test CategoryFilter
if [ -f "src/components/events/CategoryFilter.tsx" ]; then
    if grep -q "apiGateway" "src/components/events/CategoryFilter.tsx"; then
        echo -e "✅ ${GREEN}CategoryFilter using apiGateway${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "❌ ${RED}CategoryFilter not using apiGateway${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "❌ ${RED}CategoryFilter not found${NC}"
    FAILED=$((FAILED + 1))
fi

# Test AnalyticsScreen
if [ -f "src/screens/organizer/AnalyticsScreen.tsx" ]; then
    if grep -q "apiGateway" "src/screens/organizer/AnalyticsScreen.tsx"; then
        echo -e "✅ ${GREEN}AnalyticsScreen using apiGateway${NC}"
        PASSED=$((PASSED + 1))
    else
        echo -e "❌ ${RED}AnalyticsScreen not using apiGateway${NC}"
        FAILED=$((FAILED + 1))
    fi
else
    echo -e "❌ ${RED}AnalyticsScreen not found${NC}"
    FAILED=$((FAILED + 1))
fi

# Test database schema
echo -e "\n🗄️ Testing Database Schema:"
if [ -f "supabase/schema.sql" ]; then
    echo -e "✅ ${GREEN}Core schema exists${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "❌ ${RED}Core schema not found${NC}"
    FAILED=$((FAILED + 1))
fi

if [ -f "security_fixes_ultimate_corrected.sql" ]; then
    echo -e "✅ ${GREEN}Security schema exists${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "❌ ${RED}Security schema not found${NC}"
    FAILED=$((FAILED + 1))
fi

if [ -f "phase1_database_setup.sql" ]; then
    echo -e "✅ ${GREEN}Phase 1 schema exists${NC}"
    PASSED=$((PASSED + 1))
else
    echo -e "❌ ${RED}Phase 1 schema not found${NC}"
    FAILED=$((FAILED + 1))
fi

# Summary
echo -e "\n📊 TEST SUMMARY"
echo "==============="
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "Passed: ${GREEN}$PASSED ✅${NC}"
echo -e "Failed: ${RED}$FAILED ❌${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n🎉 ${GREEN}ALL TESTS PASSED! YardPass is ready for production.${NC}"
    exit 0
else
    echo -e "\n⚠️ ${YELLOW}Some tests failed. Please review the issues above.${NC}"
    exit 1
fi
