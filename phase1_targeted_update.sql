-- Phase 1: Targeted Database Updates
-- Based on current database state analysis

-- ========================================
-- 1. ADD MISSING COLUMNS TO EXISTING TABLES
-- ========================================

-- Add missing columns to cart_holds table
DO $$ 
BEGIN
    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cart_holds' AND column_name = 'expires_at') THEN
        ALTER TABLE cart_holds ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
    
    -- Add is_released column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cart_holds' AND column_name = 'is_released') THEN
        ALTER TABLE cart_holds ADD COLUMN is_released BOOLEAN DEFAULT FALSE;
    END IF;
    
    -- Add released_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cart_holds' AND column_name = 'released_at') THEN
        ALTER TABLE cart_holds ADD COLUMN released_at TIMESTAMPTZ;
    END IF;
    
    -- Add quantity column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cart_holds' AND column_name = 'quantity') THEN
        ALTER TABLE cart_holds ADD COLUMN quantity INTEGER DEFAULT 1;
    END IF;
    
    -- Add tier_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cart_holds' AND column_name = 'tier_id') THEN
        ALTER TABLE cart_holds ADD COLUMN tier_id UUID REFERENCES ticket_tiers(id) ON DELETE CASCADE;
    END IF;
    
    -- Add user_id column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'cart_holds' AND column_name = 'user_id') THEN
        ALTER TABLE cart_holds ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add missing columns to promo_codes table
DO $$ 
BEGIN
    -- Add used_count column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'promo_codes' AND column_name = 'used_count') THEN
        ALTER TABLE promo_codes ADD COLUMN used_count INTEGER DEFAULT 0;
    END IF;
    
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'promo_codes' AND column_name = 'updated_at') THEN
        ALTER TABLE promo_codes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'promo_codes' AND column_name = 'is_active') THEN
        ALTER TABLE promo_codes ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Add expires_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'promo_codes' AND column_name = 'expires_at') THEN
        ALTER TABLE promo_codes ADD COLUMN expires_at TIMESTAMPTZ;
    END IF;
END $$;

-- Add missing columns to payout_accounts table
DO $$ 
BEGIN
    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payout_accounts' AND column_name = 'metadata') THEN
        ALTER TABLE payout_accounts ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
    
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'payout_accounts' AND column_name = 'is_active') THEN
        ALTER TABLE payout_accounts ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    -- Rename stripe_connect_id to stripe_account_id if needed
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'payout_accounts' AND column_name = 'stripe_connect_id')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'payout_accounts' AND column_name = 'stripe_account_id') THEN
        ALTER TABLE payout_accounts RENAME COLUMN stripe_connect_id TO stripe_account_id;
    END IF;
END $$;

-- ========================================
-- 2. UPDATE PLACEHOLDER FUNCTIONS
-- ========================================

-- Drop existing placeholder functions
DROP FUNCTION IF EXISTS create_cart_hold(uuid, uuid, integer, integer);
DROP FUNCTION IF EXISTS create_cart_hold(uuid, uuid, integer);
DROP FUNCTION IF EXISTS create_cart_hold(uuid, uuid);
DROP FUNCTION IF EXISTS release_cart_hold(uuid);
DROP FUNCTION IF EXISTS cleanup_expired_cart_holds();
DROP FUNCTION IF EXISTS validate_promo_code(text, uuid, uuid);
DROP FUNCTION IF EXISTS create_notification(uuid, text, text, text, jsonb);
DROP FUNCTION IF EXISTS create_notification(uuid, text, text, text, text, uuid, timestamp with time zone);

-- Create proper cart hold function
CREATE OR REPLACE FUNCTION create_cart_hold(
    user_id UUID,
    tier_id UUID,
    quantity INTEGER,
    hold_duration_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
    hold_id UUID;
    tier_record RECORD;
BEGIN
    -- Get tier details
    SELECT * INTO tier_record
    FROM ticket_tiers
    WHERE id = tier_id AND is_active = true;
    
    IF tier_record.id IS NULL THEN
        RAISE EXCEPTION 'Ticket tier not found or inactive';
    END IF;
    
    -- Check availability
    IF tier_record.available_quantity < quantity THEN
        RAISE EXCEPTION 'Insufficient tickets available';
    END IF;
    
    -- Create cart hold
    INSERT INTO cart_holds (
        user_id,
        tier_id,
        quantity,
        expires_at
    ) VALUES (
        user_id,
        tier_id,
        quantity,
        NOW() + INTERVAL '1 minute' * hold_duration_minutes
    ) RETURNING id INTO hold_id;
    
    -- Update available quantity
    UPDATE ticket_tiers
    SET available_quantity = available_quantity - quantity
    WHERE id = tier_id;
    
    RETURN hold_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create proper release cart hold function
CREATE OR REPLACE FUNCTION release_cart_hold(hold_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    hold_record RECORD;
BEGIN
    -- Get hold details
    SELECT * INTO hold_record
    FROM cart_holds
    WHERE id = hold_id AND is_released = false;
    
    IF hold_record.id IS NULL THEN
        RETURN FALSE;
    END IF;
    
    -- Mark as released
    UPDATE cart_holds
    SET is_released = true, released_at = NOW()
    WHERE id = hold_id;
    
    -- Restore available quantity
    UPDATE ticket_tiers
    SET available_quantity = available_quantity + hold_record.quantity
    WHERE id = hold_record.tier_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create proper cleanup function
CREATE OR REPLACE FUNCTION cleanup_expired_cart_holds()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Get count of expired holds
    SELECT COUNT(*) INTO expired_count
    FROM cart_holds
    WHERE expires_at < NOW() AND is_released = false;
    
    -- Release expired holds
    UPDATE cart_holds
    SET is_released = true, released_at = NOW()
    WHERE expires_at < NOW() AND is_released = false;
    
    -- Restore quantities for expired holds
    UPDATE ticket_tiers
    SET available_quantity = available_quantity + (
        SELECT COALESCE(SUM(ch.quantity), 0)
        FROM cart_holds ch
        WHERE ch.tier_id = ticket_tiers.id
        AND ch.expires_at < NOW()
        AND ch.is_released = true
        AND ch.released_at > NOW() - INTERVAL '1 minute'
    );
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create proper promo code validation function
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
) AS $$
DECLARE
    promo_record RECORD;
BEGIN
    -- Get promo code details
    SELECT * INTO promo_record
    FROM promo_codes
    WHERE code = promo_code
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > NOW());
    
    IF promo_record.id IS NULL THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            NULL::TEXT as discount_type,
            NULL::INTEGER as discount_value,
            'Promo code not found or expired' as error_message;
        RETURN;
    END IF;
    
    -- Check if promo code is for this event
    IF promo_record.event_id IS NOT NULL AND promo_record.event_id != event_id THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            NULL::TEXT as discount_type,
            NULL::INTEGER as discount_value,
            'Promo code not valid for this event' as error_message;
        RETURN;
    END IF;
    
    -- Check usage limits
    IF promo_record.max_uses IS NOT NULL THEN
        IF promo_record.used_count >= promo_record.max_uses THEN
            RETURN QUERY SELECT 
                FALSE as is_valid,
                NULL::TEXT as discount_type,
                NULL::INTEGER as discount_value,
                'Promo code usage limit reached' as error_message;
            RETURN;
        END IF;
    END IF;
    
    -- Check if user has already used this code
    IF EXISTS (
        SELECT 1 FROM orders 
        WHERE user_id = validate_promo_code.user_id
        AND promo_code_id = promo_record.id
    ) THEN
        RETURN QUERY SELECT 
            FALSE as is_valid,
            NULL::TEXT as discount_type,
            NULL::INTEGER as discount_value,
            'You have already used this promo code' as error_message;
        RETURN;
    END IF;
    
    -- Return valid promo code
    RETURN QUERY SELECT 
        TRUE as is_valid,
        promo_record.discount_type,
        promo_record.discount_value,
        '' as error_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create proper notification function
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_data JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (
        user_id,
        notification_type,
        title,
        message,
        data,
        is_read
    ) VALUES (
        p_user_id,
        p_notification_type,
        p_title,
        p_message,
        p_data,
        false
    ) RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 3. ADD MISSING INDEXES
-- ========================================

-- Cart holds indexes
CREATE INDEX IF NOT EXISTS idx_cart_holds_user_id ON cart_holds(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_holds_tier_id ON cart_holds(tier_id);
CREATE INDEX IF NOT EXISTS idx_cart_holds_expires ON cart_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_cart_holds_released ON cart_holds(is_released);

-- Promo codes indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_event_id ON promo_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_codes_expires ON promo_codes(expires_at);

-- Payout accounts indexes
CREATE INDEX IF NOT EXISTS idx_payout_accounts_context ON payout_accounts(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_stripe ON payout_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_payout_accounts_status ON payout_accounts(verification_status);

-- ========================================
-- 4. ADD RLS POLICIES (if not exists)
-- ========================================

-- Enable RLS on tables if not already enabled
ALTER TABLE cart_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_accounts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own cart holds" ON cart_holds;
DROP POLICY IF EXISTS "Users can create cart holds" ON cart_holds;
DROP POLICY IF EXISTS "Users can view promo codes" ON promo_codes;
DROP POLICY IF EXISTS "Users can view own payout accounts" ON payout_accounts;

-- Cart holds policies
CREATE POLICY "Users can view own cart holds" ON cart_holds
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create cart holds" ON cart_holds
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Promo codes policies (read-only for users)
CREATE POLICY "Users can view promo codes" ON promo_codes
    FOR SELECT USING (is_active = true);

-- Payout accounts policies
CREATE POLICY "Users can view own payout accounts" ON payout_accounts
    FOR SELECT USING (
        (context_type = 'individual' AND context_id = auth.uid()) OR
        (context_type = 'organization' AND context_id IN (
            SELECT org_id FROM org_members WHERE user_id = auth.uid()
        ))
    );

-- ========================================
-- 5. ADD TRIGGERS
-- ========================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_cleanup_cart_holds ON cart_holds;

-- Trigger to clean up expired cart holds periodically
CREATE OR REPLACE FUNCTION trigger_cleanup_cart_holds()
RETURNS TRIGGER AS $$
BEGIN
    -- Clean up expired holds every time a new hold is created
    PERFORM cleanup_expired_cart_holds();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_cart_holds
    AFTER INSERT ON cart_holds
    FOR EACH ROW
    EXECUTE FUNCTION trigger_cleanup_cart_holds();

-- ========================================
-- 6. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🎉 Phase 1 Targeted Update Complete!' as status,
    'Missing columns added, placeholder functions updated' as message,
    'Checkout session and create-event functions ready to deploy' as next_step;

