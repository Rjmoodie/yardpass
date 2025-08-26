# 🗺️ Comprehensive Map Fix Action Plan

## 🚨 **Critical Issues Summary:**

### **1. Database Function Overloading** ❌
- **Error**: `Could not choose the best candidate function between...`
- **Impact**: Events cannot be fetched
- **Status**: **FIXED** - Created `MAP_FIXES.sql`

### **2. Mapbox postMessage Errors** ❌
- **Error**: `Failed to execute 'postMessage' on 'DOMWindow'`
- **Impact**: Map cannot load properly
- **Status**: **NEEDS IMPLEMENTATION** - Created `MAPBOX_POSTMESSAGE_FIX.md`

### **3. Lovable.js Interference** ❌
- **Error**: `DataCloneError: Failed to execute 'postMessage' on 'Window'`
- **Impact**: Map communication broken
- **Status**: **NEEDS IMPLEMENTATION** - Solution provided

## 📋 **Action Plan:**

### **Phase 1: Database Fixes (IMMEDIATE)**

#### **Step 1: Run Database Script**
```sql
-- Execute in Supabase SQL Editor
-- File: MAP_FIXES.sql
```

**What this fixes:**
- ✅ Resolves function overloading conflicts
- ✅ Creates single `get_public_events` function
- ✅ Separates search and recommendations functions
- ✅ Fixes RLS policies
- ✅ Creates public event stats view

#### **Step 2: Verify Database Fix**
```sql
-- Test the fixes
SELECT COUNT(*) as event_count FROM public.get_public_events(10, 0, NULL, NULL);
SELECT COUNT(*) as search_results FROM public.search_public_events('', NULL, NULL, NULL, NULL, 10, 0);
```

**Expected Result:**
- ✅ No function overloading errors
- ✅ Events return successfully
- ✅ Search works properly

### **Phase 2: Map Component Fixes (NEXT)**

#### **Step 1: Update EventsMap Component**
```typescript
// apps/mobile/src/screens/main/EventMapScreen.tsx
// Add the lovable.js isolation code from MAPBOX_POSTMESSAGE_FIX.md
```

#### **Step 2: Update PublicEventService**
```typescript
// Update the service to use the new function signature
async getFeaturedEvents(): Promise<PublicEvent[]> {
  try {
    const { data, error } = await supabase.rpc('get_public_events', {
      limit_count: 12,
      offset_count: 0,
      category_filter: null,
      search_query: null
    });
    
    if (error) {
      console.error('Error getting featured events:', error);
      return [];
    }
    
    return this.transformPublicEvents(data || []);
  } catch (error) {
    console.error('Error in getFeaturedEvents:', error);
    return [];
  }
}
```

### **Phase 3: Environment Configuration (VERIFY)**

#### **Step 1: Check Environment Variables**
```bash
# Verify .env file exists with correct values
cat .env | grep SUPABASE
```

**Required:**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://tgxgbiskbqjniviqoroh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
```

#### **Step 2: Verify Supabase Vault**
```sql
-- Check if Mapbox token exists
SELECT public.get_secret('mapbox_token') as mapbox_token;
```

### **Phase 4: Edge Function Deployment (IF NEEDED)**

#### **Step 1: Deploy Edge Function**
```bash
# Deploy the get-mapbox-token function
supabase functions deploy get-mapbox-token
```

#### **Step 2: Test Edge Function**
```bash
# Test the function
curl -X POST https://tgxgbiskbqjniviqoroh.supabase.co/functions/v1/get-mapbox-token \
  -H "Content-Type: application/json" \
  -d '{"secret_name": "mapbox_token"}'
```

## 🧪 **Testing Checklist:**

### **Database Tests:**
- [ ] **Function Overloading**: No more `PGRST203` errors
- [ ] **Public Events**: `get_public_events()` returns events
- [ ] **Search Function**: `search_public_events()` works
- [ ] **Recommendations**: `get_public_event_recommendations()` works
- [ ] **RLS Policies**: Public events accessible without auth

### **Map Tests:**
- [ ] **Map Loading**: Map initializes without errors
- [ ] **PostMessage Errors**: No more postMessage errors
- [ ] **Markers Display**: Events show as markers on map
- [ ] **Map Interactions**: Zoom, pan, marker clicks work
- [ ] **Lovable.js**: Other features still work with lovable.js

### **Environment Tests:**
- [ ] **Supabase URL**: Correct project URL used
- [ ] **Mapbox Token**: Token retrieved successfully
- [ ] **Edge Function**: Returns 200 status code
- [ ] **No Console Errors**: Clean console output

## 🎯 **Expected Results:**

### **Before Fixes:**
```
❌ Error fetching events: {code: 'PGRST203', message: 'Could not choose the best candidate function...'}
❌ Failed to execute 'postMessage' on 'DOMWindow'
❌ DataCloneError: Failed to execute 'postMessage' on 'Window'
❌ Map fails to load
❌ No events displayed
```

### **After Fixes:**
```
✅ Events loaded: 8 events found
✅ Map initialized successfully
✅ Markers displayed on map
✅ No postMessage errors
✅ Map interactions work properly
✅ Search and recommendations work
```

## 🚀 **Quick Start Commands:**

### **1. Run Database Fixes:**
```sql
-- Copy and paste MAP_FIXES.sql into Supabase SQL Editor
-- Execute the script
```

### **2. Update Frontend:**
```bash
# Install dependencies if needed
npm install

# Restart development server
npm start
```

### **3. Test the Fixes:**
```bash
# Check console for errors
# Verify map loads
# Test event markers
# Test search functionality
```

## 🔧 **Troubleshooting:**

### **If Database Fixes Don't Work:**
```sql
-- Check function signatures
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname LIKE '%public_events%';
```

### **If Map Still Has Errors:**
```typescript
// Add this temporary fix to isolate map completely
useEffect(() => {
  // Temporarily disable lovable.js
  const lovableScript = document.querySelector('script[src*="lovable"]');
  if (lovableScript) {
    lovableScript.remove();
  }
}, []);
```

### **If Edge Function Fails:**
```bash
# Check function logs
supabase functions logs get-mapbox-token

# Redeploy function
supabase functions deploy get-mapbox-token
```

## 📞 **Next Steps:**

1. **Execute `MAP_FIXES.sql`** in Supabase SQL Editor
2. **Update EventsMap component** with lovable.js isolation
3. **Test map functionality** 
4. **Verify all features work** without errors
5. **Deploy to production** if everything works

## 🎉 **Success Criteria:**

- ✅ No function overloading errors
- ✅ Map loads and displays events
- ✅ No postMessage errors in console
- ✅ All map interactions work
- ✅ Search and recommendations work
- ✅ Lovable.js doesn't interfere with map
