# 🧹 Complete Legacy Database Connections Cleanup

## 🚨 **CRITICAL ISSUE IDENTIFIED**

You have **legacy database connections and old service references** that are causing TypeScript errors and security vulnerabilities. Here's how to completely eliminate them:

---

## **📦 Step 1: Remove Legacy API Services**

### **Files to DELETE:**
```bash
# Remove these legacy API service files
rm packages/api/src/services/events.ts
rm packages/api/src/services/tickets.ts
rm packages/api/src/services/search.ts
rm packages/api/src/services/posts.ts
rm packages/api/src/services/orders.ts
rm packages/api/src/services/organizations.ts
rm packages/api/src/services/comments.ts
rm packages/api/src/services/checkins.ts
rm packages/api/src/services/upload.ts
rm packages/api/src/services/video.ts
```

### **Keep Only:**
```bash
# Keep only the auth service
packages/api/src/services/auth.ts  # ✅ KEEP - Core auth logic
```

---

## **📱 Step 2: Remove Legacy Frontend Services**

### **Files to DELETE:**
```bash
# Remove these legacy frontend service files
rm src/services/analyticsService.ts
rm src/services/searchAnalytics.ts
rm src/services/performance.ts
rm src/services/analytics.ts
rm src/services/referenceData.ts
rm src/services/mockData.ts
```

### **Keep Only:**
```bash
# Keep only essential services
src/services/supabase.ts      # ✅ KEEP - Supabase client
src/services/security.ts      # ✅ KEEP - Security utilities
```

---

## **📦 Step 3: Update Package Exports**

### **Replace `packages/api/src/index.ts`:**
```typescript
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
```

---

## **🔍 Step 4: Find and Replace Legacy Imports**

### **Search for Legacy Imports:**
```bash
# Find all legacy service imports
grep -r "import.*Service.*from" src/ apps/mobile/src/
grep -r "EventsService\|TicketsService\|SearchService\|PostsService" src/ apps/mobile/src/
```

### **Replace Legacy Imports:**
```typescript
// OLD: Legacy imports
import { EventsService, TicketsService, SearchService } from '@yardpass/api';
import { EventsService } from '@/services/events';
import { SearchService } from '@/services/search';

// NEW: API Gateway only
import { apiGateway } from '@yardpass/api';
```

---

## **🔄 Step 5: Update API Calls**

### **Replace Legacy Service Calls:**
```typescript
// OLD: Legacy service calls
const events = await EventsService.getEvents(params);
const tickets = await TicketsService.getTickets(userId);
const results = await SearchService.search({ q: query });

// NEW: API Gateway calls
const response = await apiGateway.getEvents(params);
if (response.error) {
  console.error('Error:', response.error.message);
  return;
}
const events = response.data;
```

---

## **🚀 Step 6: Automated Cleanup Script**

### **Create `cleanup-legacy.sh`:**
```bash
#!/bin/bash

echo "🧹 Starting Legacy Cleanup..."

# Remove legacy API services
echo "📦 Removing legacy API services..."
rm -f packages/api/src/services/events.ts
rm -f packages/api/src/services/tickets.ts
rm -f packages/api/src/services/search.ts
rm -f packages/api/src/services/posts.ts
rm -f packages/api/src/services/orders.ts
rm -f packages/api/src/services/organizations.ts
rm -f packages/api/src/services/comments.ts
rm -f packages/api/src/services/checkins.ts
rm -f packages/api/src/services/upload.ts
rm -f packages/api/src/services/video.ts

# Remove legacy frontend services
echo "📱 Removing legacy frontend services..."
rm -f src/services/analyticsService.ts
rm -f src/services/searchAnalytics.ts
rm -f src/services/performance.ts
rm -f src/services/analytics.ts
rm -f src/services/referenceData.ts
rm -f src/services/mockData.ts

echo "✅ Legacy cleanup complete!"
echo "📋 Next: Update imports and API calls"
```

---

## **🎯 Step 7: Update Frontend Components**

### **Files That Need Updates:**
```typescript
// Search for these patterns in your codebase:
src/store/slices/postsSlice.ts
src/screens/main/SearchScreen.tsx
src/components/events/CategoryFilter.tsx
src/screens/organizer/AnalyticsScreen.tsx
apps/mobile/src/store/slices/authSlice.ts
```

### **Example Updates:**
```typescript
// OLD: Legacy service usage
import { SearchService } from '@/services/search';
const results = await SearchService.search({ q: query });

// NEW: API Gateway usage
import { apiGateway } from '@yardpass/api';
const response = await apiGateway.search({ q: query });
if (response.error) {
  console.error('Error:', response.error.message);
  return;
}
const results = response.data;
```

---

## **🛡️ Step 8: Security Benefits**

### **After Cleanup:**
- ✅ **No more service role key usage** (security risk eliminated)
- ✅ **RLS enforcement** on all database operations
- ✅ **Proper user context** for all requests
- ✅ **Consistent error handling**
- ✅ **Real-time capabilities**
- ✅ **Serverless auto-scaling**

---

## **📊 Expected Results**

### **Before Cleanup:**
- ❌ 10+ legacy API services
- ❌ 6+ legacy frontend services
- ❌ Inconsistent security models
- ❌ TypeScript errors
- ❌ Database connection conflicts

### **After Cleanup:**
- ✅ 1 API Gateway (apiGateway)
- ✅ 1 Auth Service (AuthService)
- ✅ Consistent security model
- ✅ No TypeScript errors
- ✅ Clean database connections

---

## **🚨 Immediate Actions Required:**

1. **Run the cleanup script** to remove legacy files
2. **Update package exports** to only export apiGateway
3. **Find and replace** all legacy imports
4. **Update API calls** to use apiGateway
5. **Test all functionality** to ensure it works

---

## **🎉 Benefits After Cleanup:**

- **🔒 Security**: RLS enforcement on all operations
- **⚡ Performance**: Serverless auto-scaling
- **🔄 Real-time**: Built-in real-time capabilities
- **💰 Cost**: Lower infrastructure costs
- **🛠️ Maintenance**: Single API Gateway to maintain
- **📈 Scalability**: Edge Functions auto-scale globally

This cleanup will eliminate all your database connection issues and TypeScript errors while providing a more secure, scalable, and maintainable architecture.
