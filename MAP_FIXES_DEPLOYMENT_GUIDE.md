# 🗺️ Map Fixes Deployment Guide

## 🔴 **Critical Issues to Fix:**

### **1. RLS Infinite Recursion** ❌
- **Error**: `infinite recursion detected in policy for relation "org_members"`
- **Impact**: Prevents events from being fetched
- **Solution**: Fixed RLS policies to avoid recursion

### **2. Missing Edge Function** ❌
- **Error**: `Edge Function returned a non-2xx status code`
- **Impact**: Mapbox token cannot be retrieved
- **Solution**: Created `get-mapbox-token` edge function

## 📋 **Step-by-Step Fix Process:**

### **Step 1: Run Database Fixes**
```sql
-- Run this in Supabase SQL Editor
-- File: FIX_CRITICAL_ISSUES.sql
```

**What this fixes:**
- ✅ Drops problematic RLS policies causing infinite recursion
- ✅ Creates safe `is_current_user_org_admin` function
- ✅ Fixes events table RLS for public access
- ✅ Ensures `get_secret` function works properly
- ✅ Creates `get_public_events` function

### **Step 2: Deploy Edge Function**
```bash
# Deploy the new edge function
supabase functions deploy get-mapbox-token
```

**What this creates:**
- ✅ `get-mapbox-token` edge function
- ✅ Secure token retrieval from Supabase Vault
- ✅ Proper CORS headers
- ✅ Error handling

### **Step 3: Configure Mapbox Token**
```sql
-- Add your Mapbox token to Supabase Vault
-- Go to Supabase Dashboard > Settings > Secrets
-- Add secret with name: 'mapbox_token'
-- Value: your_actual_mapbox_token_here
```

### **Step 4: Test the Fixes**
```sql
-- Run this in Supabase SQL Editor
-- File: TEST_MAP_FIXES.sql
```

**Expected Results:**
- ✅ No infinite recursion errors
- ✅ Events can be fetched successfully
- ✅ Functions return proper values
- ✅ Test data is accessible

## 🧪 **Verification Checklist:**

### **Database Tests:**
- [ ] **RLS Infinite Recursion**: Events query runs without errors
- [ ] **Public Events Function**: Returns event count > 0
- [ ] **Admin Function**: Returns boolean without errors
- [ ] **Secret Function**: Returns token or NULL
- [ ] **Test Data**: Shows events with coordinates

### **Edge Function Tests:**
- [ ] **Function Deployed**: `supabase functions list` shows `get-mapbox-token`
- [ ] **Token Retrieved**: Function returns Mapbox token
- [ ] **Error Handling**: Proper error responses
- [ ] **CORS**: No cross-origin issues

### **Frontend Tests:**
- [ ] **Map Loads**: No console errors
- [ ] **Events Display**: Markers show on map
- [ ] **Token Retrieved**: Mapbox token fetched successfully
- [ ] **Interactive Features**: Click markers, search, zoom work

## 🚨 **Troubleshooting:**

### **If RLS Still Fails:**
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'org_members';

-- Drop all policies and recreate
DROP POLICY IF EXISTS "Org admins can manage members" ON org_members;
DROP POLICY IF EXISTS "Org admins can view members" ON org_members;
-- Then run the fix script again
```

### **If Edge Function Fails:**
```bash
# Check function logs
supabase functions logs get-mapbox-token

# Redeploy function
supabase functions deploy get-mapbox-token --no-verify-jwt
```

### **If Mapbox Token Missing:**
```sql
-- Check if token exists
SELECT public.get_secret('mapbox_token');

-- If NULL, add to Supabase Vault
-- Dashboard > Settings > Secrets > Add 'mapbox_token'
```

## 🎯 **Expected Results:**

After running these fixes:

### **Console Should Show:**
```
✅ Fetching Mapbox token from Supabase edge function...
✅ Mapbox token retrieved successfully
✅ Events loaded: 8 events found
✅ Map initialized with token
✅ Markers displayed on map
```

### **Map Should Display:**
- 🎵 **Summer Music Festival** - Nashville
- 💻 **Tech Innovation Summit** - San Francisco  
- 🎨 **Contemporary Art Exhibition** - New York
- 🎷 **Jazz Night Under the Stars** - Nashville
- 🏃‍♂️ **City Marathon** - Los Angeles
- 🚀 **Startup Networking Mixer** - Austin
- 📸 **Photography Workshop** - Seattle
- 😂 **Comedy Night** - Chicago

## 🔧 **Next Steps:**

1. **Run the database fixes** (`FIX_CRITICAL_ISSUES.sql`)
2. **Deploy the edge function** (`supabase functions deploy get-mapbox-token`)
3. **Add Mapbox token** to Supabase Vault
4. **Test the fixes** (`TEST_MAP_FIXES.sql`)
5. **Refresh your app** and test the map

**Your map should now work perfectly with interactive markers and real event data!** 🎉
