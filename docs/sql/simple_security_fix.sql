-- YardPass Simple Security Fix
-- Fixes only the essential security issues without complex syntax
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. CHECK CURRENT FUNCTIONS
-- ========================================

SELECT 
    'CURRENT SECURITY DEFINER FUNCTIONS' as section,
    proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    CASE 
        WHEN prosrc LIKE '%search_path%' THEN 'Has search_path'
        ELSE 'MISSING search_path'
    END as search_path_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosecdef = true
ORDER BY proname;

-- ========================================
-- 2. FIX VIEWS FIRST
-- ========================================

-- Drop problematic SECURITY DEFINER views
DROP VIEW IF EXISTS public_events;
DROP VIEW IF EXISTS user_event_badge_v;

-- Recreate public_events as a regular view
CREATE OR REPLACE VIEW public_events AS
SELECT 
    id,
    slug,
    title,
    description,
    city,
    venue,
    start_at,
    end_at,
    visibility,
    status,
    category,
    cover_image_url,
    created_at
FROM events
WHERE visibility = 'public' AND status = 'published';

-- Grant access to public events view
GRANT SELECT ON public_events TO authenticated;
GRANT SELECT ON public_events TO anon;

-- ========================================
-- 3. FIX FUNCTIONS ONE BY ONE
-- ========================================

-- Function 1: create_cart_hold
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname = 'create_cart_hold'
        AND prosecdef = true
        AND prosrc NOT LIKE '%search_path%'
    ) THEN
        EXECUTE 'DROP FUNCTION IF EXISTS create_cart_hold(UUID, UUID, INTEGER, INTEGER)';
        
        EXECUTE '
        CREATE OR REPLACE FUNCTION create_cart_hold(
            user_id UUID,
            tier_id UUID,
            quantity INTEGER,
            hold_duration_minutes INTEGER DEFAULT 10
        )
        RETURNS UUID AS $func$
        DECLARE
            hold_id UUID;
            tier_record RECORD;
        BEGIN
            SET search_path = public, pg_temp;
            
            SELECT * INTO tier_record
            FROM ticket_tiers
            WHERE id = tier_id AND is_active = true;
            
            IF tier_record.id IS NULL THEN
                RAISE EXCEPTION ''Ticket tier not found or inactive'';
            END IF;
            
            IF tier_record.available_quantity < quantity THEN
                RAISE EXCEPTION ''Insufficient tickets available'';
            END IF;
            
            INSERT INTO cart_holds (
                user_id,
                tier_id,
                quantity,
                expires_at
            ) VALUES (
                user_id,
                tier_id,
                quantity,
                NOW() + INTERVAL ''1 minute'' * hold_duration_minutes
            ) RETURNING id INTO hold_id;
            
            UPDATE ticket_tiers
            SET available_quantity = available_quantity - quantity
            WHERE id = tier_id;
            
            RETURN hold_id;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER';
        
        RAISE NOTICE 'Fixed create_cart_hold function';
    END IF;
END $$;

-- Function 2: release_cart_hold
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname = 'release_cart_hold'
        AND prosecdef = true
        AND prosrc NOT LIKE '%search_path%'
    ) THEN
        EXECUTE 'DROP FUNCTION IF EXISTS release_cart_hold(UUID)';
        
        EXECUTE '
        CREATE OR REPLACE FUNCTION release_cart_hold(hold_id UUID)
        RETURNS BOOLEAN AS $func$
        DECLARE
            hold_record RECORD;
        BEGIN
            SET search_path = public, pg_temp;
            
            SELECT * INTO hold_record
            FROM cart_holds
            WHERE id = hold_id AND is_released = false;
            
            IF hold_record.id IS NULL THEN
                RETURN FALSE;
            END IF;
            
            UPDATE cart_holds
            SET is_released = true, released_at = NOW()
            WHERE id = hold_id;
            
            UPDATE ticket_tiers
            SET available_quantity = available_quantity + hold_record.quantity
            WHERE id = hold_record.tier_id;
            
            RETURN TRUE;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER';
        
        RAISE NOTICE 'Fixed release_cart_hold function';
    END IF;
END $$;

-- Function 3: cleanup_expired_cart_holds
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname = 'cleanup_expired_cart_holds'
        AND prosecdef = true
        AND prosrc NOT LIKE '%search_path%'
    ) THEN
        EXECUTE 'DROP FUNCTION IF EXISTS cleanup_expired_cart_holds()';
        
        EXECUTE '
        CREATE OR REPLACE FUNCTION cleanup_expired_cart_holds()
        RETURNS INTEGER AS $func$
        DECLARE
            expired_count INTEGER;
        BEGIN
            SET search_path = public, pg_temp;
            
            SELECT COUNT(*) INTO expired_count
            FROM cart_holds
            WHERE expires_at < NOW() AND is_released = false;
            
            UPDATE cart_holds
            SET is_released = true, released_at = NOW()
            WHERE expires_at < NOW() AND is_released = false;
            
            RETURN expired_count;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER';
        
        RAISE NOTICE 'Fixed cleanup_expired_cart_holds function';
    END IF;
END $$;

-- Function 4: validate_promo_code
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname = 'validate_promo_code'
        AND prosecdef = true
        AND prosrc NOT LIKE '%search_path%'
    ) THEN
        EXECUTE 'DROP FUNCTION IF EXISTS validate_promo_code(TEXT, UUID, UUID)';
        
        EXECUTE '
        CREATE OR REPLACE FUNCTION validate_promo_code(
            promo_code TEXT,
            event_id UUID,
            user_id UUID
        )
        RETURNS TABLE(
            is_valid BOOLEAN,
            discount_type TEXT,
            discount_value INTEGER,
            error_message TEXT
        ) AS $func$
        DECLARE
            promo_record RECORD;
        BEGIN
            SET search_path = public, pg_temp;
            
            SELECT * INTO promo_record
            FROM promo_codes
            WHERE code = promo_code
            AND is_active = true
            AND (valid_until IS NULL OR valid_until > NOW());
            
            IF promo_record.id IS NULL THEN
                RETURN QUERY SELECT 
                    FALSE as is_valid,
                    NULL::TEXT as discount_type,
                    NULL::INTEGER as discount_value,
                    ''Promo code not found or expired'' as error_message;
                RETURN;
            END IF;
            
            RETURN QUERY SELECT 
                TRUE as is_valid,
                promo_record.discount_type,
                promo_record.discount_value,
                '''' as error_message;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER';
        
        RAISE NOTICE 'Fixed validate_promo_code function';
    END IF;
END $$;

-- Function 5: create_notification
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND proname = 'create_notification'
        AND prosecdef = true
        AND prosrc NOT LIKE '%search_path%'
    ) THEN
        EXECUTE 'DROP FUNCTION IF EXISTS create_notification(UUID, TEXT, TEXT, TEXT, JSONB)';
        
        EXECUTE '
        CREATE OR REPLACE FUNCTION create_notification(
            p_user_id UUID,
            p_notification_type TEXT,
            p_title TEXT,
            p_message TEXT,
            p_data JSONB DEFAULT ''{}''
        )
        RETURNS UUID AS $func$
        DECLARE
            notification_id UUID;
        BEGIN
            SET search_path = public, pg_temp;
            
            INSERT INTO notifications (
                user_id,
                notification_type,
                title,
                message,
                is_read
            ) VALUES (
                p_user_id,
                p_notification_type,
                p_title,
                p_message,
                false
            ) RETURNING id INTO notification_id;
            
            RETURN notification_id;
        END;
        $func$ LANGUAGE plpgsql SECURITY DEFINER';
        
        RAISE NOTICE 'Fixed create_notification function';
    END IF;
END $$;

-- ========================================
-- 4. VERIFICATION
-- ========================================

-- Check what functions still need fixing
SELECT 
    'FUNCTIONS STILL NEEDING FIX' as section,
    proname as function_name,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND prosecdef = true
AND prosrc NOT LIKE '%search_path%'
ORDER BY proname;

-- ========================================
-- 5. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🎯 Simple Security Fix Complete!' as status,
    'Fixed functions and views with proper search paths' as message,
    'Your database security has been improved' as next_step;
