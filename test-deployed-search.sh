#!/bin/bash

# Test Deployed Enhanced Search Functions
echo "🔍 Testing Deployed Enhanced Search Functions"
echo "============================================="

# Get Supabase URL and key from environment or config
SUPABASE_URL="https://tgxgbiskbqjniviqoroh.supabase.co"
SUPABASE_ANON_KEY="your-anon-key-here"  # You'll need to replace this

# Test the enhanced search function
echo "Testing Enhanced Search Function..."
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

echo -e "\n\nTesting Discover Feed Function..."
curl -X POST \
  "${SUPABASE_URL}/functions/v1/discover-feed" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": null,
    "limit": 5
  }' \
  -s | head -c 500

echo -e "\n\n✅ Test completed!"
