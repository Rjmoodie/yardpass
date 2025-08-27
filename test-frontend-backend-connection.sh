#!/bin/bash

# Test Frontend-Backend Connection for Enhanced Search
echo "🔍 Testing Frontend-Backend Connection"
echo "======================================"

# Configuration
SUPABASE_URL="https://tgxgbiskbqjniviqoroh.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"  # Replace with actual key

echo "Testing Enhanced Search Function..."

# Test 1: Basic Search
echo "1. Testing basic search..."
curl -X POST \
  "${SUPABASE_URL}/functions/v1/enhanced-search" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "music",
    "types": ["events"],
    "limit": 5
  }' \
  -s | head -c 500

echo -e "\n\n2. Testing search with filters..."
curl -X POST \
  "${SUPABASE_URL}/functions/v1/enhanced-search" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "festival",
    "types": ["events"],
    "category": "Music",
    "sort_by": "relevance",
    "limit": 3
  }' \
  -s | head -c 500

echo -e "\n\n3. Testing discover feed..."
curl -X POST \
  "${SUPABASE_URL}/functions/v1/discover-feed" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "limit": 5,
    "include_trending": true,
    "include_recommendations": true
  }' \
  -s | head -c 500

echo -e "\n\n✅ Frontend-Backend Connection Test Completed!"
echo "If you see JSON responses above, the connection is working."
echo "If you see errors, check your Supabase configuration."
