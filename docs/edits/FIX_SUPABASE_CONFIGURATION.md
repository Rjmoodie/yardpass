# 🔧 Fix Supabase Configuration Issues

## 🚨 **Current Problems:**

### **1. Wrong Supabase Project URL** ❌
- **Error**: Frontend calling `jysyzpgbrretxsvjvqmp.supabase.co`
- **Correct**: Should call `tgxgbiskbqjniviqoroh.supabase.co`
- **Impact**: Edge function calls failing

### **2. Missing Environment Variables** ❌
- **Error**: `EXPO_PUBLIC_SUPABASE_URL` not set
- **Impact**: Using fallback mock URL

### **3. Missing Mapbox Token** ❌
- **Error**: `Mapbox token not configured`
- **Impact**: Map cannot initialize

## ✅ **Step-by-Step Fix:**

### **Step 1: Create Environment File**

Create a `.env` file in your project root with:

```bash
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://tgxgbiskbqjniviqoroh.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneGdiaXNrYnFqbml2aXFvcm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjUxMzUsImV4cCI6MjA3MTQ0MTEzNX0.yXShfmvj_ehuDeY6Sp1pMjbeXSWLa4uY9qtPlmR3JYo

# Mapbox Configuration (Add your actual Mapbox token here)
EXPO_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here

# App Configuration
EXPO_PUBLIC_APP_NAME=YardPass
EXPO_PUBLIC_APP_VERSION=1.0.0
```

### **Step 2: Add Mapbox Token to Supabase Vault**

1. Go to: https://supabase.com/dashboard/project/tgxgbiskbqjniviqoroh/settings/secrets
2. Click "Add new secret"
3. **Name**: `mapbox_token`
4. **Value**: Your actual Mapbox access token
5. Click "Save"

### **Step 3: Restart Your Development Server**

```bash
# Stop your current server (Ctrl+C)
# Then restart:
npm start
# or
expo start
```

### **Step 4: Test the Configuration**

Run this SQL in Supabase SQL Editor to verify:

```sql
-- Test the get_secret function
SELECT public.get_secret('mapbox_token') as mapbox_token;

-- Test public events access
SELECT COUNT(*) as event_count 
FROM public.get_public_events();
```

## 🧪 **Verification Checklist:**

### **Environment Variables:**
- [ ] `.env` file created with correct Supabase URL
- [ ] `EXPO_PUBLIC_SUPABASE_URL` points to `tgxgbiskbqjniviqoroh`
- [ ] `EXPO_PUBLIC_SUPABASE_ANON_KEY` is correct
- [ ] Development server restarted

### **Supabase Vault:**
- [ ] `mapbox_token` secret added
- [ ] Token value is valid Mapbox access token
- [ ] `get_secret('mapbox_token')` returns token

### **Edge Function:**
- [ ] `get-mapbox-token` function deployed
- [ ] Function accessible at correct URL
- [ ] Returns 200 status code

### **Frontend:**
- [ ] No more "wrong project URL" errors
- [ ] Mapbox token retrieved successfully
- [ ] Map loads with markers
- [ ] Events display on map

## 🎯 **Expected Results:**

After fixing the configuration:

### **Console Should Show:**
```
✅ Fetching Mapbox token from Supabase edge function...
✅ Mapbox token retrieved successfully
✅ Events loaded: 8 events found
✅ Map initialized with token
✅ Markers displayed on map
```

### **No More Errors:**
- ❌ `ERR_NAME_NOT_RESOLVED`
- ❌ `Edge Function returned a non-2xx status code`
- ❌ `Mapbox token not configured`

## 🚨 **Troubleshooting:**

### **If Still Getting Wrong URL:**
1. Check if `.env` file is in project root
2. Verify no other environment files override it
3. Restart development server completely
4. Clear browser cache

### **If Edge Function Still Fails:**
```bash
# Check function logs
supabase functions logs get-mapbox-token

# Redeploy function
supabase functions deploy get-mapbox-token
```

### **If Mapbox Token Missing:**
```sql
-- Check if token exists
SELECT public.get_secret('mapbox_token');

-- If NULL, add to Supabase Vault
-- Dashboard > Settings > Secrets > Add 'mapbox_token'
```

## 🔧 **Quick Fix Commands:**

```bash
# Create .env file
echo "EXPO_PUBLIC_SUPABASE_URL=https://tgxgbiskbqjniviqoroh.supabase.co" > .env
echo "EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRneGdiaXNrYnFqbml2aXFvcm9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU4NjUxMzUsImV4cCI6MjA3MTQ0MTEzNX0.yXShfmvj_ehuDeY6Sp1pMjbeXSWLa4uY9qtPlmR3JYo" >> .env

# Restart server
npm start
```

**Follow these steps and your map should work perfectly!** 🗺️✨
