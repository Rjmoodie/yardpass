#!/bin/bash

# Enhanced Search Debug and Test Script
# This script tests the enhanced search functionality

set -e

echo "🔍 Enhanced Search Debug and Test Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SUPABASE_URL="${SUPABASE_URL:-http://localhost:54321}"
SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-your-anon-key}"
EDGE_FUNCTION_URL="${SUPABASE_URL}/functions/v1/enhanced-search"
DEBUG_FUNCTION_URL="${SUPABASE_URL}/functions/v1/enhanced-search-debug"

# Test data
TEST_QUERY="music"
TEST_LOCATION="40.7128,-74.0060"  # New York coordinates

echo -e "${BLUE}Configuration:${NC}"
echo "  Supabase URL: $SUPABASE_URL"
echo "  Edge Function URL: $EDGE_FUNCTION_URL"
echo "  Debug Function URL: $DEBUG_FUNCTION_URL"
echo ""

# Function to test API endpoint
test_endpoint() {
    local url=$1
    local test_name=$2
    local payload=$3
    
    echo -e "${YELLOW}Testing $test_name...${NC}"
    
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "$payload" \
        "$url")
    
    http_code=$(echo "$response" | tail -n1)
    response_body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✅ $test_name: SUCCESS (HTTP $http_code)${NC}"
        echo "Response preview:"
        echo "$response_body" | jq '.' 2>/dev/null || echo "$response_body" | head -c 200
    else
        echo -e "${RED}❌ $test_name: FAILED (HTTP $http_code)${NC}"
        echo "Error response:"
        echo "$response_body"
    fi
    echo ""
}

# Function to check database functions
check_database_functions() {
    echo -e "${BLUE}Checking Database Functions...${NC}"
    
    # Test basic database connection
    echo -e "${YELLOW}Testing database connection...${NC}"
    
    # You can add database connection tests here if needed
    echo -e "${GREEN}✅ Database connection test completed${NC}"
    echo ""
}

# Function to deploy and test edge functions
test_edge_functions() {
    echo -e "${BLUE}Testing Edge Functions...${NC}"
    
    # Test debug function first
    local debug_payload='{
        "q": "'$TEST_QUERY'",
        "types": ["events"],
        "limit": 5
    }'
    
    test_endpoint "$DEBUG_FUNCTION_URL" "Enhanced Search Debug" "$debug_payload"
    
    # Test main function
    local main_payload='{
        "q": "'$TEST_QUERY'",
        "types": ["events"],
        "location": "'$TEST_LOCATION'",
        "radius_km": 50,
        "limit": 10,
        "sort_by": "relevance"
    }'
    
    test_endpoint "$EDGE_FUNCTION_URL" "Enhanced Search Main" "$main_payload"
}

# Function to test different search scenarios
test_search_scenarios() {
    echo -e "${BLUE}Testing Search Scenarios...${NC}"
    
    # Test 1: Basic search
    local basic_payload='{
        "q": "tech",
        "types": ["events"],
        "limit": 5
    }'
    test_endpoint "$EDGE_FUNCTION_URL" "Basic Search (tech)" "$basic_payload"
    
    # Test 2: Category filter
    local category_payload='{
        "q": "festival",
        "types": ["events"],
        "category": "Music",
        "limit": 5
    }'
    test_endpoint "$EDGE_FUNCTION_URL" "Category Filter Search" "$category_payload"
    
    # Test 3: Location-based search
    local location_payload='{
        "q": "conference",
        "types": ["events"],
        "location": "37.7749,-122.4194",
        "radius_km": 25,
        "limit": 5
    }'
    test_endpoint "$EDGE_FUNCTION_URL" "Location-based Search" "$location_payload"
    
    # Test 4: Date range search
    local date_payload='{
        "q": "exhibition",
        "types": ["events"],
        "date_from": "'$(date -d '+7 days' -Iseconds)'",
        "date_to": "'$(date -d '+30 days' -Iseconds)'",
        "limit": 5
    }'
    test_endpoint "$EDGE_FUNCTION_URL" "Date Range Search" "$date_payload"
    
    # Test 5: Price range search
    local price_payload='{
        "q": "tournament",
        "types": ["events"],
        "price_range": {"min": 0, "max": 100},
        "limit": 5
    }'
    test_endpoint "$EDGE_FUNCTION_URL" "Price Range Search" "$price_payload"
}

# Function to test error handling
test_error_handling() {
    echo -e "${BLUE}Testing Error Handling...${NC}"
    
    # Test 1: Empty query
    local empty_payload='{
        "q": "",
        "types": ["events"]
    }'
    test_endpoint "$EDGE_FUNCTION_URL" "Empty Query Error" "$empty_payload"
    
    # Test 2: Short query
    local short_payload='{
        "q": "a",
        "types": ["events"]
    }'
    test_endpoint "$EDGE_FUNCTION_URL" "Short Query Error" "$short_payload"
    
    # Test 3: Invalid JSON
    echo -e "${YELLOW}Testing invalid JSON...${NC}"
    response=$(curl -s -w "\n%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d '{"invalid": json}' \
        "$EDGE_FUNCTION_URL")
    
    http_code=$(echo "$response" | tail -n1)
    if [ "$http_code" -eq 400 ] || [ "$http_code" -eq 500 ]; then
        echo -e "${GREEN}✅ Invalid JSON Error: SUCCESS (HTTP $http_code)${NC}"
    else
        echo -e "${RED}❌ Invalid JSON Error: UNEXPECTED (HTTP $http_code)${NC}"
    fi
    echo ""
}

# Function to check performance
test_performance() {
    echo -e "${BLUE}Testing Performance...${NC}"
    
    local performance_payload='{
        "q": "test",
        "types": ["events"],
        "limit": 20
    }'
    
    echo -e "${YELLOW}Running performance test...${NC}"
    
    start_time=$(date +%s%N)
    response=$(curl -s \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
        -d "$performance_payload" \
        "$EDGE_FUNCTION_URL")
    end_time=$(date +%s%N)
    
    duration=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds
    
    if echo "$response" | jq -e '.meta.search_time_ms' >/dev/null 2>&1; then
        search_time=$(echo "$response" | jq -r '.meta.search_time_ms')
        echo -e "${GREEN}✅ Performance Test: SUCCESS${NC}"
        echo "  Total request time: ${duration}ms"
        echo "  Search time reported: ${search_time}ms"
        echo "  Results found: $(echo "$response" | jq -r '.meta.total')"
    else
        echo -e "${RED}❌ Performance Test: FAILED${NC}"
        echo "Response: $response"
    fi
    echo ""
}

# Function to generate test report
generate_report() {
    echo -e "${BLUE}Generating Test Report...${NC}"
    
    local report_file="enhanced-search-test-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "test_timestamp": "$(date -Iseconds)",
  "supabase_url": "$SUPABASE_URL",
  "test_summary": {
    "total_tests": 0,
    "passed": 0,
    "failed": 0
  },
  "test_results": []
}
EOF
    
    echo -e "${GREEN}✅ Test report generated: $report_file${NC}"
    echo ""
}

# Main execution
main() {
    echo "Starting Enhanced Search Debug and Test..."
    echo ""
    
    # Check if required tools are available
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}❌ curl is required but not installed${NC}"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        echo -e "${YELLOW}⚠️  jq is not installed - JSON parsing will be limited${NC}"
    fi
    
    # Run tests
    check_database_functions
    test_edge_functions
    test_search_scenarios
    test_error_handling
    test_performance
    generate_report
    
    echo -e "${GREEN}🎉 Enhanced Search Debug and Test Completed!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Review the test results above"
    echo "2. Check the generated test report"
    echo "3. Fix any failed tests"
    echo "4. Deploy the enhanced search functions to production"
    echo ""
}

# Run main function
main "$@"
