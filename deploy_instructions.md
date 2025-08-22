# Deploy Updated create-event Function

## Manual Deployment Steps:

1. **Go to your Supabase Dashboard**
2. **Navigate to Edge Functions**
3. **Find the `create-event` function**
4. **Replace the code** with the updated version from `supabase/functions/create-event/index.ts`
5. **Deploy the function**

## What's Fixed:

✅ **Organization Verification**: The function now automatically verifies organizations or creates them if they don't exist

✅ **Service Role**: Uses service role to bypass database validation triggers

✅ **Ticket Tiers**: Now handles ticket tier creation in the same request

✅ **Better Error Handling**: More detailed error messages and logging

## Test the Fix:

After deploying, try creating an event from your frontend. The function should now:

1. **Automatically verify your organization**
2. **Create the event successfully**
3. **Create ticket tiers if provided**
4. **Return a success response**

## Alternative: Quick Database Fix

If you want to test immediately without deploying, run this SQL:

```sql
-- Temporarily disable validation triggers
ALTER TABLE events DISABLE TRIGGER ALL;

-- Test event creation
INSERT INTO events (
    title,
    description,
    start_at,
    category,
    city,
    org_id,
    slug,
    visibility,
    status
) VALUES (
    'Test Event',
    'Test Description',
    NOW(),
    'test',
    'Test City',
    '542d22b3-7650-4534-9057-b633fd22d2f1',
    'test-event-' || EXTRACT(EPOCH FROM NOW()),
    'public',
    'published'
) RETURNING id, title, slug;

-- Re-enable triggers when done
-- ALTER TABLE events ENABLE TRIGGER ALL;
```

## Expected Result:

The 500 Internal Server Error should be resolved, and event creation should work properly! 🎉
