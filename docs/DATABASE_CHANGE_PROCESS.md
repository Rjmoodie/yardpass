# Database Change Process - No Assumptions Methodology

## Overview
This document outlines the systematic approach for making database changes in YardPass, ensuring zero assumptions and perfect alignment with existing schema.

## Process Steps

### 1. Schema Research Phase
**Always start here before making any database changes**

#### 1.1 Create Schema Check Script
Create a comprehensive SQL script to inspect the current database structure:

```sql
-- Check extensions
SELECT 'EXTENSIONS' as check_type, extname as extension_name
FROM pg_extension
WHERE extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check tables
SELECT 'TABLES' as check_type, 
       table_name, 
       table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check specific table columns
SELECT 'TABLE_COLUMNS' as check_type, 
       table_name,
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'your_table_name'
ORDER BY ordinal_position;

-- Check existing functions
SELECT 'FUNCTIONS' as check_type, 
       routine_name,
       routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
  AND routine_name LIKE '%your_function_pattern%';

-- Check existing indexes
SELECT 'INDEXES' as check_type, 
       indexname,
       tablename,
       indexdef
FROM pg_indexes 
WHERE schemaname = 'public'
  AND tablename = 'your_table_name';
```

#### 1.2 Execute Schema Check
Run the schema check script and collect results for:
- All relevant tables
- All column names and data types
- Existing functions
- Existing indexes
- Extensions

#### 1.3 Document Current State
Create a summary of the current schema:
```markdown
**Current Schema Analysis:**
✅ Table A: column1, column2, column3
✅ Table B: column1, column2, column3
❌ Missing: Table C (needs to be created)
```

### 2. Customization Phase

#### 2.1 Create Customized SQL Script
Based on the schema research, create a SQL script that:
- Uses exact column names from the database
- Matches exact data types
- References correct table names
- Uses correct foreign key relationships
- Avoids any non-existent columns

#### 2.2 Template for Customized Scripts
```sql
-- ===== CUSTOMIZED FOR YARDPASS SCHEMA =====
-- This script is customized to match the exact database schema
-- All column names and table structures match the actual database

-- Ensure required extensions exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create new tables (if needed)
CREATE TABLE IF NOT EXISTS public.new_table (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- Use exact column names from existing tables
    existing_column_name data_type,
    created_at timestamp with time zone DEFAULT now()
);

-- Create functions using correct column references
CREATE OR REPLACE FUNCTION public.your_function(
    p_existing_column uuid -- Use exact column names
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Use exact table and column names from schema research
    SELECT jsonb_build_object(
        'column_name', t.exact_column_name, -- Exact column name
        'another_column', t.another_exact_column -- Exact column name
    ) INTO result
    FROM public.exact_table_name t -- Exact table name
    WHERE t.exact_column_name = p_existing_column;
    
    RETURN result;
END;
$$;

-- Create indexes using correct column names
CREATE INDEX IF NOT EXISTS idx_exact_table_exact_column 
ON public.exact_table_name(exact_column_name);

-- Security and permissions
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.new_table TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
```

### 3. Testing Phase

#### 3.1 Pre-Deployment Verification
Before running the customized script:
1. Verify all table names exist
2. Verify all column names exist
3. Verify all data types match
4. Check for any syntax errors

#### 3.2 Test Queries
Include test queries in the script:
```sql
-- ===== VERIFICATION QUERIES =====
-- Test the functions with sample data
-- SELECT public.your_function();
-- SELECT * FROM public.new_table LIMIT 5;
```

### 4. Deployment Phase

#### 4.1 Manual Execution
Execute the customized SQL script manually in the database:
```bash
# Option 1: Direct database connection
psql -h your-host -U your-user -d your-database -f docs/sql/YOUR_CUSTOMIZED_SCRIPT.sql

# Option 2: Supabase dashboard
# Copy and paste the SQL into Supabase SQL editor
```

#### 4.2 Verification
After deployment, verify:
1. All functions were created successfully
2. All tables were created/updated successfully
3. All indexes were created successfully
4. No errors in the logs

### 5. Edge Function Integration

#### 5.1 Update Edge Functions
After successful SQL deployment, update Edge Functions to use the new database functions:

```typescript
// In your Edge Function
const { data, error } = await supabase.rpc('your_new_function', {
    p_parameter: value
});
```

#### 5.2 Deploy Edge Functions
```bash
supabase functions deploy your-function-name
```

## Best Practices

### 1. Never Assume
- ❌ Don't assume column names
- ❌ Don't assume table structures
- ❌ Don't assume data types
- ❌ Don't assume relationships

### 2. Always Research
- ✅ Always check existing schema first
- ✅ Always verify column names
- ✅ Always verify data types
- ✅ Always verify table relationships

### 3. Use Exact Names
- ✅ Use exact table names from schema
- ✅ Use exact column names from schema
- ✅ Use exact data types from schema
- ✅ Use exact constraint names

### 4. Document Everything
- ✅ Document current schema state
- ✅ Document what needs to be created
- ✅ Document what needs to be modified
- ✅ Document verification steps

## Example Workflow

### Scenario: Adding Analytics Functions

1. **Research Phase**
   ```bash
   # Create schema check script
   # Run schema check
   # Collect results for: events, orders, tickets, revenue_tracking, etc.
   ```

2. **Analysis Phase**
   ```markdown
   ✅ Events Table: owner_context_id, views_count, likes_count
   ✅ Orders Table: total_cents, user_id, event_id
   ✅ Tickets Table: order_item_id, user_id, event_id
   ❌ Missing: analytics_cache table (needs creation)
   ```

3. **Customization Phase**
   ```sql
   -- Create customized script using exact column names
   -- Reference: owner_context_id (not organization_id)
   -- Reference: total_cents (not total_amount)
   ```

4. **Deployment Phase**
   ```bash
   # Execute customized SQL script
   # Verify all functions created successfully
   # Deploy Edge Functions
   ```

## Benefits of This Process

1. **Zero Errors**: No column not found errors
2. **Perfect Alignment**: All changes match existing schema
3. **Documentation**: Complete record of current state
4. **Reusability**: Process can be repeated for any change
5. **Confidence**: No assumptions means no surprises

## Templates

### Schema Check Template
```sql
-- Check specific table columns
SELECT 'TABLE_COLUMNS' as check_type, 
       column_name, 
       data_type, 
       is_nullable,
       column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'your_table_name'
ORDER BY ordinal_position;
```

### Customized Script Template
```sql
-- ===== CUSTOMIZED FOR YARDPASS SCHEMA =====
-- Based on schema research: [DATE]
-- Tables checked: [LIST OF TABLES]
-- Columns verified: [LIST OF COLUMNS]

-- Your customized SQL here using exact names
```

This process ensures that every database change is perfectly aligned with the existing schema and eliminates the risk of column or table errors.
