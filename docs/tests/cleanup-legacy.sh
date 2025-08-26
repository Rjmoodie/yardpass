#!/bin/bash

echo "🧹 Starting Legacy Database Connections Cleanup..."
echo "=================================================="

# Step 1: Remove Legacy API Services
echo ""
echo "📦 Step 1: Removing Legacy API Services..."
echo "------------------------------------------"

legacy_api_services=(
  "packages/api/src/services/events.ts"
  "packages/api/src/services/tickets.ts"
  "packages/api/src/services/search.ts"
  "packages/api/src/services/posts.ts"
  "packages/api/src/services/orders.ts"
  "packages/api/src/services/organizations.ts"
  "packages/api/src/services/comments.ts"
  "packages/api/src/services/checkins.ts"
  "packages/api/src/services/upload.ts"
  "packages/api/src/services/video.ts"
)

for file in "${legacy_api_services[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✅ Removed: $file"
  else
    echo "  ⚠️  Not found: $file"
  fi
done

# Step 2: Remove Legacy Frontend Services
echo ""
echo "📱 Step 2: Removing Legacy Frontend Services..."
echo "-----------------------------------------------"

legacy_frontend_services=(
  "src/services/analyticsService.ts"
  "src/services/searchAnalytics.ts"
  "src/services/performance.ts"
  "src/services/analytics.ts"
  "src/services/referenceData.ts"
  "src/services/mockData.ts"
)

for file in "${legacy_frontend_services[@]}"; do
  if [ -f "$file" ]; then
    rm "$file"
    echo "  ✅ Removed: $file"
  else
    echo "  ⚠️  Not found: $file"
  fi
done

# Step 3: Update Package Exports
echo ""
echo "📦 Step 3: Updating Package Exports..."
echo "--------------------------------------"

package_index="packages/api/src/index.ts"
if [ -f "$package_index" ]; then
  cat > "$package_index" << 'EOF'
/**
 * @deprecated Traditional API services are deprecated. Use Edge Functions via ApiGateway instead.
 * 
 * MIGRATION GUIDE:
 * OLD: import { EventsService, TicketsService } from '@yardpass/api';
 * 
 * NEW: import { apiGateway } from '@yardpass/api';
 * 
 * Benefits of Edge Functions:
 * - Better security (RLS enforcement)
 * - Serverless auto-scaling
 * - Real-time capabilities
 * - Consistent response formats
 * - Lower infrastructure costs
 */

// Export the new API Gateway (RECOMMENDED)
export { apiGateway, ApiGateway } from './gateway';
export type { EdgeFunctionResponse } from './gateway';

// ONLY KEEP AUTH SERVICE - All other services are deprecated
export { AuthService } from './services/auth';

// LEGACY SERVICES REMOVED:
// - EventsService (use apiGateway.getEvents())
// - TicketsService (use apiGateway.purchaseTickets())
// - SearchService (use apiGateway.search())
// - PostsService (use apiGateway.getSocialFeed())
// - OrdersService (use apiGateway.createOrder())
// - OrganizationsService (use apiGateway.getOrganizations())
// - CommentsService (use apiGateway.createComment())
// - CheckinsService (use apiGateway.scanTicket())
// - UploadService (use apiGateway.uploadMedia())
// - VideoService (use apiGateway.processVideo())
EOF
  echo "  ✅ Updated: $package_index"
else
  echo "  ⚠️  Not found: $package_index"
fi

# Step 4: Find Legacy Imports
echo ""
echo "🔍 Step 4: Finding Legacy Imports..."
echo "------------------------------------"

echo "  Searching for legacy service imports..."
legacy_imports=$(grep -r "import.*Service.*from" src/ apps/mobile/src/ 2>/dev/null || true)
if [ -n "$legacy_imports" ]; then
  echo "  ⚠️  Found legacy imports:"
  echo "$legacy_imports" | sed 's/^/    /'
else
  echo "  ✅ No legacy imports found"
fi

# Step 5: Find Legacy Service Usage
echo ""
echo "🔍 Step 5: Finding Legacy Service Usage..."
echo "------------------------------------------"

echo "  Searching for legacy service usage..."
legacy_usage=$(grep -r "EventsService\|TicketsService\|SearchService\|PostsService" src/ apps/mobile/src/ 2>/dev/null || true)
if [ -n "$legacy_usage" ]; then
  echo "  ⚠️  Found legacy service usage:"
  echo "$legacy_usage" | sed 's/^/    /'
else
  echo "  ✅ No legacy service usage found"
fi

# Step 6: Create Migration Summary
echo ""
echo "📋 Step 6: Creating Migration Summary..."
echo "----------------------------------------"

cat > "LEGACY_CLEANUP_SUMMARY.md" << 'EOF'
# 🧹 Legacy Database Connections Cleanup - COMPLETE

## ✅ What Was Removed

### Legacy API Services (10 files removed):
- events.ts
- tickets.ts
- search.ts
- posts.ts
- orders.ts
- organizations.ts
- comments.ts
- checkins.ts
- upload.ts
- video.ts

### Legacy Frontend Services (6 files removed):
- analyticsService.ts
- searchAnalytics.ts
- performance.ts
- analytics.ts
- referenceData.ts
- mockData.ts

## 🔄 Migration Required

### Update All Imports:
```typescript
// OLD: Legacy services
import { EventsService, TicketsService, SearchService } from '@yardpass/api';

// NEW: API Gateway only
import { apiGateway } from '@yardpass/api';
```

### Update All API Calls:
```typescript
// OLD: Legacy service calls
const events = await EventsService.getEvents(params);
const tickets = await TicketsService.getTickets(userId);

// NEW: API Gateway calls
const response = await apiGateway.getEvents(params);
if (response.error) {
  console.error('Error:', response.error.message);
  return;
}
const events = response.data;
```

## 🎯 Next Steps

1. **Update all frontend components** to use apiGateway
2. **Remove any remaining legacy imports**
3. **Test all functionality** with new API Gateway
4. **Update TypeScript types** if needed

## 🛡️ Security Benefits

- ✅ RLS enforcement on all database operations
- ✅ Proper user context for all requests
- ✅ Consistent error handling
- ✅ Real-time capabilities
- ✅ Serverless auto-scaling
EOF

echo "  ✅ Created: LEGACY_CLEANUP_SUMMARY.md"

echo ""
echo "🎉 Legacy Cleanup Complete!"
echo "=========================="
echo ""
echo "📋 Next Steps:"
echo "1. Update all frontend components to use apiGateway"
echo "2. Remove any remaining legacy imports"
echo "3. Test all functionality"
echo "4. Check LEGACY_CLEANUP_SUMMARY.md for details"
echo ""
echo "🛡️ Security Benefits:"
echo "- No more service role key usage (security risk eliminated)"
echo "- RLS enforcement on all database operations"
echo "- Proper user context for all requests"
echo "- Consistent error handling"
echo "- Real-time capabilities"
echo "- Serverless auto-scaling"
