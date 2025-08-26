# 🚨 Edge Function Error Fixes

## **🔴 Issues Identified:**

### **1. Missing Database Functions** ❌
- `create_notification` function doesn't exist
- `log_event_view` function doesn't exist
- `load_event_draft` function has parameter issues

### **2. Wrong Function Call** ❌
- Frontend calling `create-event` instead of `publish-event`
- Function expects different parameters

### **3. Missing Database Tables** ❌
- `notifications` table doesn't exist
- `event_views` table doesn't exist

## **✅ Fixes Required:**

### **Step 1: Run Missing Database Functions**

Execute this SQL in **Supabase SQL Editor**:

```sql
-- Copy and paste MISSING_DATABASE_FUNCTIONS.sql
-- This creates all missing functions and tables
```

### **Step 2: Fix Load Event Draft Function**

Execute this SQL in **Supabase SQL Editor**:

```sql
-- Copy and paste FIX_LOAD_EVENT_DRAFT.sql
-- This fixes the 400 error on load_event_draft
```

### **Step 3: Deploy Updated Edge Functions**

```bash
# Deploy the fixed publish-event function
supabase functions deploy publish-event

# Deploy the create-event function (if needed)
supabase functions deploy create-event
```

### **Step 4: Update Frontend Function Calls**

The issue is that your frontend is calling the wrong function. Update your `EnhancedEventCreationScreen.tsx`:

```typescript
// Replace this:
const { data, error } = await supabase.functions.invoke('create-event', {
  body: eventData
});

// With this:
const { data, error } = await supabase.functions.invoke('publish-event', {
  body: eventData
});
```

## **🔧 Detailed Error Analysis:**

### **Error 1: `load_event_draft` 400 Error**
```
POST https://tgxgbiskbqjniviqoroh.supabase.co/rest/v1/rpc/load_event_draft 400 (Bad Request)
```

**Cause**: Function parameter mismatch
**Fix**: Run `FIX_LOAD_EVENT_DRAFT.sql`

### **Error 2: `create-event` 500 Error**
```
POST https://tgxgbiskbqjniviqoroh.supabase.co/functions/v1/create-event 500 (Internal Server Error)
```

**Cause**: Calling wrong function or missing dependencies
**Fix**: 
1. Call `publish-event` instead of `create-event`
2. Run `MISSING_DATABASE_FUNCTIONS.sql`

### **Error 3: Missing Functions**
```
FunctionsHttpError: Edge Function returned a non-2xx status code
```

**Cause**: Edge function trying to call non-existent database functions
**Fix**: Run `MISSING_DATABASE_FUNCTIONS.sql`

## **📋 Complete Fix Process:**

### **1. Database Fixes (Run First)**
```sql
-- Execute in Supabase SQL Editor
-- File: MISSING_DATABASE_FUNCTIONS.sql
```

### **2. Function Fixes**
```sql
-- Execute in Supabase SQL Editor  
-- File: FIX_LOAD_EVENT_DRAFT.sql
```

### **3. Edge Function Deployment**
```bash
# Deploy updated functions
supabase functions deploy publish-event
```

### **4. Frontend Updates**
```typescript
// Update function call in EnhancedEventCreationScreen.tsx
const handlePublish = async () => {
  // ... validation code ...

  const eventData = {
    event_id: null, // Will be created
    publish_data: {
      title: formData.title,
      description: formData.description,
      slug: formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      venue: formData.venue,
      city: formData.city,
      start_at: `${formData.date}T${formData.time}:00Z`,
      end_at: `${formData.date}T${formData.time}:00Z`,
      visibility: formData.visibility,
      category: formData.category,
      cover_image_url: formData.image,
      capacity: parseInt(formData.capacity) || null,
      waitlist_enabled: false,
      tags: [],
      settings: {
        isRecurring: formData.isRecurring,
        recurrenceType: formData.recurrenceType,
        recurrenceInterval: formData.recurrenceInterval,
        recurrenceDays: formData.recurrenceDays,
        endDate: formData.endDate,
        endOccurrences: formData.endOccurrences,
      }
    }
  };

  // Call the correct function
  const { data, error } = await supabase.functions.invoke('publish-event', {
    body: eventData
  });

  if (error) throw error;

  Alert.alert('Success', 'Event published successfully!');
  navigation.goBack();
};
```

## **🧪 Testing After Fixes:**

### **Test 1: Load Event Draft**
```typescript
// Should work without 400 error
const { data, error } = await supabase.rpc('load_event_draft');
console.log('Draft data:', data, 'Error:', error);
```

### **Test 2: Save Event Draft**
```typescript
// Should work without errors
const { data, error } = await supabase.rpc('save_event_draft', {
  draft_data: { title: 'Test Draft' }
});
console.log('Draft saved:', data, 'Error:', error);
```

### **Test 3: Publish Event**
```typescript
// Should work without 500 error
const { data, error } = await supabase.functions.invoke('publish-event', {
  body: {
    event_id: 'test-id',
    publish_data: {
      title: 'Test Event',
      description: 'Test Description',
      venue: 'Test Venue',
      city: 'Test City',
      start_at: '2024-01-01T10:00:00Z',
      end_at: '2024-01-01T12:00:00Z',
      visibility: 'public',
      category: 'test'
    }
  }
});
console.log('Event published:', data, 'Error:', error);
```

## **🎯 Expected Results:**

### **Before Fixes:**
```
❌ load_event_draft: 400 Bad Request
❌ create-event: 500 Internal Server Error
❌ Missing database functions
❌ Missing database tables
```

### **After Fixes:**
```
✅ load_event_draft: Works without errors
✅ publish-event: Works without errors
✅ All database functions exist
✅ All database tables exist
✅ Event creation and publishing works
```

## **📞 Troubleshooting:**

### **If Still Getting 400 Errors:**
1. Check if `event_drafts` table exists
2. Verify RLS policies on `event_drafts`
3. Check user authentication

### **If Still Getting 500 Errors:**
1. Check edge function logs: `supabase functions logs publish-event`
2. Verify all database functions exist
3. Check function permissions

### **If Functions Don't Deploy:**
1. Check Supabase CLI version: `supabase --version`
2. Verify project linking: `supabase status`
3. Check function syntax

## **🚀 Quick Fix Commands:**

```bash
# 1. Deploy functions
supabase functions deploy publish-event

# 2. Check function logs
supabase functions logs publish-event

# 3. Test function
curl -X POST https://your-project.supabase.co/functions/v1/publish-event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"event_id":"test","publish_data":{"title":"Test"}}'
```

Your edge functions should now work without errors! 🎉
