# 🎯 Creator Flow Action Plan

## 🚨 **Issues Identified & Solutions:**

### **1. RLS Policy Violation on Picture Upload** ❌
- **Error**: "new row violates RLS policy" when uploading pictures as org
- **Solution**: Fixed RLS policies in `CREATOR_FLOW_FIXES.sql`

### **2. File Size Limits Too Small** ❌
- **Videos**: 10MB → 100MB
- **Images**: 5MB → 25MB
- **Solution**: Updated storage configuration in `STORAGE_CONFIGURATION_GUIDE.md`

### **3. Edge Function Error on Publish** ❌
- **Error**: "edge function returned a non-2xx status code"
- **Solution**: Created `publish-event` edge function

### **4. UX Improvements** ⚠️
- **Summary Navigation**: Click sections to edit directly
- **Event Templates**: Save forms for future reuse
- **Recurring Events**: Daily/weekly/monthly/yearly support
- **Solution**: Comprehensive UX improvements in `CREATOR_UX_IMPROVEMENTS.md`

## 📋 **Implementation Steps:**

### **Phase 1: Database Fixes (IMMEDIATE)**

#### **Step 1: Run Database Script**
```sql
-- Execute in Supabase SQL Editor
-- File: CREATOR_FLOW_FIXES.sql
```

**What this fixes:**
- ✅ RLS policies for event creation and organization access
- ✅ Event templates system
- ✅ Recurring events system
- ✅ Event drafts system
- ✅ Helper functions for templates and drafts

#### **Step 2: Verify Database Changes**
```sql
-- Test RLS policies
SELECT COUNT(*) as events_count FROM events WHERE created_by = auth.uid();

-- Test template functions
SELECT public.save_event_draft('{"title": "Test Draft"}'::JSONB) as draft_id;

-- Test recurring events
SELECT COUNT(*) as recurring_count FROM recurring_events;
```

### **Phase 2: Storage Configuration (NEXT)**

#### **Step 1: Update Storage Bucket Settings**
Go to **Supabase Dashboard > Storage > Settings**

**Update file size limits:**
- `event-media`: 100MB for videos, 25MB for images
- `avatars`: 10MB for profile pictures
- `post-media`: 50MB for videos, 15MB for images

#### **Step 2: Apply Storage Policies**
Go to **Supabase Dashboard > Storage > Policies**

Apply the policies from `STORAGE_CONFIGURATION_GUIDE.md`:
- INSERT policies for authenticated users
- SELECT policies for public read access
- UPDATE/DELETE policies for event owners

#### **Step 3: Create Storage Helper Functions**
```sql
-- Run in Supabase SQL Editor
-- Functions from STORAGE_CONFIGURATION_GUIDE.md
```

### **Phase 3: Edge Function Deployment**

#### **Step 1: Deploy Publish Event Function**
```bash
# Deploy the new edge function
supabase functions deploy publish-event
```

#### **Step 2: Test Edge Function**
```bash
# Test the function
curl -X POST https://your-project.supabase.co/functions/v1/publish-event \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "event_id": "test-event-id",
    "publish_data": {
      "title": "Test Event",
      "description": "Test Description",
      "venue": "Test Venue",
      "city": "Test City",
      "start_at": "2024-01-01T10:00:00Z",
      "end_at": "2024-01-01T12:00:00Z",
      "visibility": "public",
      "category": "test"
    }
  }'
```

### **Phase 4: Frontend Implementation**

#### **Step 1: Update Event Creation Components**
```typescript
// Update your event creation components with:
// - Enhanced summary navigation
// - Template system integration
// - Recurring events configuration
// - Auto-save draft functionality
```

#### **Step 2: Update Upload Logic**
```typescript
// Replace existing upload logic with:
// - Proper error handling
// - File size validation
// - Organization permission checks
// - Progress indicators
```

#### **Step 3: Update Publish Logic**
```typescript
// Replace direct database calls with:
// - Edge function calls
// - Proper error handling
// - Validation feedback
// - Success notifications
```

## 🧪 **Testing Checklist:**

### **Database Tests:**
- [ ] **RLS Policies**: Organization users can create events
- [ ] **Templates**: Save and load event templates
- [ ] **Recurring Events**: Create recurring event series
- [ ] **Drafts**: Auto-save and load event drafts
- [ ] **Permissions**: Proper access control for all operations

### **Storage Tests:**
- [ ] **File Uploads**: Large files upload successfully
- [ ] **Organization Uploads**: No RLS policy violations
- [ ] **File Types**: All allowed MIME types work
- [ ] **Public Access**: Uploaded files are publicly accessible
- [ ] **File Organization**: Proper folder structure

### **Edge Function Tests:**
- [ ] **Publish Event**: Event publishes successfully
- [ ] **Validation**: Proper error messages for invalid data
- [ ] **Permissions**: Only authorized users can publish
- [ ] **Notifications**: Followers receive notifications
- [ ] **Logging**: User actions are properly logged

### **UX Tests:**
- [ ] **Summary Navigation**: Click sections to edit directly
- [ ] **Template System**: Save and use event templates
- [ ] **Recurring Events**: Configure and preview recurring schedules
- [ ] **Auto-save**: Drafts save automatically
- [ ] **Progress Indicator**: Visual feedback for multi-step process

## 🎯 **Expected Results:**

### **Before Fixes:**
```
❌ "new row violates RLS policy" on picture upload
❌ File size too small (10MB videos, 5MB images)
❌ "edge function returned a non-2xx status code" on publish
❌ Poor UX: only "Previous" navigation in summary
❌ No template system
❌ No recurring events
```

### **After Fixes:**
```
✅ Organization users can upload media without RLS errors
✅ Large files upload successfully (100MB videos, 25MB images)
✅ Events publish successfully via edge function
✅ Enhanced UX: click any section to edit in summary
✅ Template system: save and reuse event forms
✅ Recurring events: daily/weekly/monthly/yearly support
✅ Auto-save drafts and proper error handling
```

## 🚀 **Quick Start Commands:**

### **1. Run Database Fixes:**
```sql
-- Copy and paste CREATOR_FLOW_FIXES.sql into Supabase SQL Editor
-- Execute the script
```

### **2. Update Storage Settings:**
```bash
# Follow STORAGE_CONFIGURATION_GUIDE.md
# Update bucket settings in Supabase Dashboard
```

### **3. Deploy Edge Function:**
```bash
supabase functions deploy publish-event
```

### **4. Update Frontend:**
```bash
# Update your event creation components
# Test all new functionality
```

## 🔧 **Troubleshooting:**

### **If RLS Errors Persist:**
```sql
-- Check current policies
SELECT * FROM pg_policies WHERE tablename = 'events';

-- Check user permissions
SELECT auth.uid() as current_user, auth.role() as current_role;
```

### **If File Uploads Still Fail:**
1. Check bucket settings in Supabase Dashboard
2. Verify storage policies are applied
3. Check MIME types are allowed
4. Test with smaller files first

### **If Edge Function Fails:**
```bash
# Check function logs
supabase functions logs publish-event

# Test function directly
curl -X POST your-function-url
```

### **If UX Issues Occur:**
1. Check component state management
2. Verify navigation logic
3. Test template system functions
4. Validate recurring event configuration

## 📞 **Next Steps:**

1. **Execute `CREATOR_FLOW_FIXES.sql`** in Supabase SQL Editor
2. **Update storage bucket settings** following the guide
3. **Deploy `publish-event` edge function**
4. **Update frontend components** with new UX features
5. **Test all functionality** thoroughly
6. **Deploy to production** when everything works

## 🎉 **Success Criteria:**

- ✅ No RLS policy violations for organization users
- ✅ Large files upload successfully
- ✅ Events publish without edge function errors
- ✅ Enhanced UX with clickable summary sections
- ✅ Template system works for saving/loading events
- ✅ Recurring events can be configured and created
- ✅ Auto-save drafts work properly
- ✅ All error handling and validation works correctly
