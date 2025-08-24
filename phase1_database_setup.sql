-- Phase 1: Critical Ticket Flow Database Setup
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. STRIPE INTEGRATION TABLES
-- ========================================

-- Stripe customers table
CREATE TABLE IF NOT EXISTS stripe_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    stripe_customer_id TEXT UNIQUE NOT NULL,
    email TEXT NOT NULL,
    name TEXT,
    phone TEXT,
    address JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe payment intents table
CREATE TABLE IF NOT EXISTS stripe_payment_intents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_payment_intent_id TEXT UNIQUE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL, -- Amount in cents
    currency TEXT DEFAULT 'usd',
    status TEXT NOT NULL CHECK (status IN ('requires_payment_method', 'requires_confirmation', 'requires_action', 'processing', 'requires_capture', 'canceled', 'succeeded')),
    payment_method_types TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stripe webhook events table
CREATE TABLE IF NOT EXISTS stripe_webhook_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    stripe_event_id TEXT UNIQUE NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    processed BOOLEAN DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 2. ENHANCED TICKET MANAGEMENT
-- ========================================

-- Ticket wallet table (for user's owned tickets)
CREATE TABLE IF NOT EXISTS ticket_wallet (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    qr_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'transferred', 'refunded')),
    used_at TIMESTAMPTZ,
    used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    transfer_expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, ticket_id)
);

-- Ticket transfer requests table
CREATE TABLE IF NOT EXISTS ticket_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    ticket_wallet_id UUID REFERENCES ticket_wallet(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket scan logs table
CREATE TABLE IF NOT EXISTS ticket_scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_wallet_id UUID REFERENCES ticket_wallet(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    device_info JSONB DEFAULT '{}',
    scan_result TEXT NOT NULL CHECK (scan_result IN ('valid', 'already_used', 'invalid', 'expired', 'not_found')),
    notes TEXT,
    metadata JSONB DEFAULT '{}'
);

-- ========================================
-- 3. ENHANCED ORDER MANAGEMENT
-- ========================================

-- Add Stripe fields to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS refund_amount INTEGER; -- Amount refunded in cents

-- Order items table for detailed order tracking
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    ticket_tier_id UUID REFERENCES ticket_tiers(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price INTEGER NOT NULL, -- Price in cents
    total_price INTEGER NOT NULL, -- Total in cents
    discount_amount INTEGER DEFAULT 0, -- Discount in cents
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 4. INDEXES FOR PERFORMANCE
-- ========================================

-- Stripe indexes
CREATE INDEX IF NOT EXISTS idx_stripe_customers_user_id ON stripe_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_customers_stripe_id ON stripe_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_user_id ON stripe_payment_intents(user_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_order_id ON stripe_payment_intents(order_id);
CREATE INDEX IF NOT EXISTS idx_stripe_payment_intents_stripe_id ON stripe_payment_intents(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_processed ON stripe_webhook_events(processed);
CREATE INDEX IF NOT EXISTS idx_stripe_webhook_events_type ON stripe_webhook_events(event_type);

-- Ticket wallet indexes
CREATE INDEX IF NOT EXISTS idx_ticket_wallet_user_id ON ticket_wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_wallet_ticket_id ON ticket_wallet(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_wallet_qr_code ON ticket_wallet(qr_code);
CREATE INDEX IF NOT EXISTS idx_ticket_wallet_status ON ticket_wallet(status);

-- Ticket transfer indexes
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_from_user ON ticket_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to_user ON ticket_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_status ON ticket_transfers(status);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_expires ON ticket_transfers(expires_at);

-- Ticket scan indexes
CREATE INDEX IF NOT EXISTS idx_ticket_scans_ticket_wallet_id ON ticket_scans(ticket_wallet_id);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_by ON ticket_scans(scanned_by);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_scanned_at ON ticket_scans(scanned_at);
CREATE INDEX IF NOT EXISTS idx_ticket_scans_result ON ticket_scans(scan_result);

-- Order indexes
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment_intent ON orders(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_orders_stripe_customer ON orders(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_refund_status ON orders(refund_status);

-- Order items indexes
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_ticket_tier_id ON order_items(ticket_tier_id);

-- ========================================
-- 5. HELPER FUNCTIONS
-- ========================================

-- Function to generate QR codes
CREATE OR REPLACE FUNCTION generate_ticket_qr_code(ticket_id UUID, user_id UUID)
RETURNS TEXT AS $$
BEGIN
    -- Generate a unique QR code based on ticket and user
    RETURN encode(
        hmac(
            ticket_id::text || user_id::text || extract(epoch from now())::text,
            current_setting('app.jwt_secret'),
            'sha256'
        ),
        'base64'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate ticket QR code
CREATE OR REPLACE FUNCTION validate_ticket_qr_code(qr_code TEXT)
RETURNS TABLE(
    is_valid BOOLEAN,
    ticket_wallet_id UUID,
    user_id UUID,
    event_id UUID,
    status TEXT,
    error_message TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN tw.id IS NULL THEN FALSE
            WHEN tw.status != 'active' THEN FALSE
            WHEN tw.transfer_expires_at < NOW() THEN FALSE
            ELSE TRUE
        END as is_valid,
        tw.id as ticket_wallet_id,
        tw.user_id,
        t.event_id,
        tw.status,
        CASE 
            WHEN tw.id IS NULL THEN 'Ticket not found'
            WHEN tw.status != 'active' THEN 'Ticket is ' || tw.status
            WHEN tw.transfer_expires_at < NOW() THEN 'Ticket has expired'
            ELSE ''
        END as error_message
    FROM ticket_wallet tw
    JOIN tickets t ON tw.ticket_id = t.id
    WHERE tw.qr_code = validate_ticket_qr_code.qr_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process ticket scan
CREATE OR REPLACE FUNCTION process_ticket_scan(
    qr_code TEXT,
    scanned_by UUID,
    location_lat DECIMAL DEFAULT NULL,
    location_lng DECIMAL DEFAULT NULL,
    device_info JSONB DEFAULT '{}'
)
RETURNS TABLE(
    success BOOLEAN,
    ticket_wallet_id UUID,
    scan_result TEXT,
    error_message TEXT
) AS $$
DECLARE
    ticket_wallet_record RECORD;
    scan_id UUID;
BEGIN
    -- Validate the ticket
    SELECT * INTO ticket_wallet_record
    FROM validate_ticket_qr_code(qr_code);
    
    IF NOT ticket_wallet_record.is_valid THEN
        RETURN QUERY SELECT 
            FALSE as success,
            NULL::UUID as ticket_wallet_id,
            'invalid' as scan_result,
            ticket_wallet_record.error_message as error_message;
        RETURN;
    END IF;
    
    -- Check if already scanned
    IF EXISTS (
        SELECT 1 FROM ticket_scans 
        WHERE ticket_wallet_id = ticket_wallet_record.ticket_wallet_id 
        AND scan_result = 'valid'
    ) THEN
        -- Log the duplicate scan
        INSERT INTO ticket_scans (
            ticket_wallet_id, 
            scanned_by, 
            location_lat, 
            location_lng, 
            device_info, 
            scan_result, 
            notes
        ) VALUES (
            ticket_wallet_record.ticket_wallet_id,
            scanned_by,
            location_lat,
            location_lng,
            device_info,
            'already_used',
            'Duplicate scan attempt'
        );
        
        RETURN QUERY SELECT 
            FALSE as success,
            ticket_wallet_record.ticket_wallet_id as ticket_wallet_id,
            'already_used' as scan_result,
            'Ticket already used' as error_message;
        RETURN;
    END IF;
    
    -- Mark ticket as used
    UPDATE ticket_wallet 
    SET 
        status = 'used',
        used_at = NOW(),
        used_by = scanned_by,
        updated_at = NOW()
    WHERE id = ticket_wallet_record.ticket_wallet_id;
    
    -- Log the scan
    INSERT INTO ticket_scans (
        ticket_wallet_id, 
        scanned_by, 
        location_lat, 
        location_lng, 
        device_info, 
        scan_result
    ) VALUES (
        ticket_wallet_record.ticket_wallet_id,
        scanned_by,
        location_lat,
        location_lng,
        device_info,
        'valid'
    ) RETURNING id INTO scan_id;
    
    RETURN QUERY SELECT 
        TRUE as success,
        ticket_wallet_record.ticket_wallet_id as ticket_wallet_id,
        'valid' as scan_result,
        '' as error_message;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create ticket transfer
CREATE OR REPLACE FUNCTION create_ticket_transfer(
    from_user_id UUID,
    to_user_id UUID,
    ticket_wallet_id UUID,
    expires_in_hours INTEGER DEFAULT 24
)
RETURNS UUID AS $$
DECLARE
    transfer_id UUID;
    ticket_owner_id UUID;
BEGIN
    -- Verify ticket ownership
    SELECT user_id INTO ticket_owner_id
    FROM ticket_wallet
    WHERE id = ticket_wallet_id AND status = 'active';
    
    IF ticket_owner_id IS NULL THEN
        RAISE EXCEPTION 'Ticket not found or not available for transfer';
    END IF;
    
    IF ticket_owner_id != from_user_id THEN
        RAISE EXCEPTION 'You can only transfer your own tickets';
    END IF;
    
    -- Create transfer request
    INSERT INTO ticket_transfers (
        from_user_id,
        to_user_id,
        ticket_wallet_id,
        expires_at
    ) VALUES (
        from_user_id,
        to_user_id,
        ticket_wallet_id,
        NOW() + INTERVAL '1 hour' * expires_in_hours
    ) RETURNING id INTO transfer_id;
    
    RETURN transfer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept ticket transfer
CREATE OR REPLACE FUNCTION accept_ticket_transfer(transfer_id UUID, to_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    transfer_record RECORD;
BEGIN
    -- Get transfer details
    SELECT * INTO transfer_record
    FROM ticket_transfers
    WHERE id = transfer_id AND to_user_id = accept_ticket_transfer.to_user_id;
    
    IF transfer_record.id IS NULL THEN
        RAISE EXCEPTION 'Transfer not found or not authorized';
    END IF;
    
    IF transfer_record.status != 'pending' THEN
        RAISE EXCEPTION 'Transfer is not pending';
    END IF;
    
    IF transfer_record.expires_at < NOW() THEN
        RAISE EXCEPTION 'Transfer has expired';
    END IF;
    
    -- Update transfer status
    UPDATE ticket_transfers
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        updated_at = NOW()
    WHERE id = transfer_id;
    
    -- Transfer the ticket
    UPDATE ticket_wallet
    SET 
        user_id = to_user_id,
        updated_at = NOW()
    WHERE id = transfer_record.ticket_wallet_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. RLS POLICIES
-- ========================================

-- Enable RLS on new tables
ALTER TABLE stripe_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own stripe customer data" ON stripe_customers;
DROP POLICY IF EXISTS "Users can update own stripe customer data" ON stripe_customers;
DROP POLICY IF EXISTS "Users can view own payment intents" ON stripe_payment_intents;
DROP POLICY IF EXISTS "Only service role can access webhook events" ON stripe_webhook_events;
DROP POLICY IF EXISTS "Users can view own tickets" ON ticket_wallet;
DROP POLICY IF EXISTS "Event managers can view event tickets" ON ticket_wallet;
DROP POLICY IF EXISTS "Users can view transfers they're involved in" ON ticket_transfers;
DROP POLICY IF EXISTS "Users can create transfers from their tickets" ON ticket_transfers;
DROP POLICY IF EXISTS "Users can update transfers they're involved in" ON ticket_transfers;
DROP POLICY IF EXISTS "Event managers can view scan logs" ON ticket_scans;
DROP POLICY IF EXISTS "Scanners can create scan logs" ON ticket_scans;
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;

-- Stripe customers policies
CREATE POLICY "Users can view own stripe customer data" ON stripe_customers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stripe customer data" ON stripe_customers
    FOR UPDATE USING (auth.uid() = user_id);

-- Stripe payment intents policies
CREATE POLICY "Users can view own payment intents" ON stripe_payment_intents
    FOR SELECT USING (auth.uid() = user_id);

-- Stripe webhook events policies (admin only)
CREATE POLICY "Only service role can access webhook events" ON stripe_webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Ticket wallet policies
CREATE POLICY "Users can view own tickets" ON ticket_wallet
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Event managers can view event tickets" ON ticket_wallet
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM tickets t
            JOIN events e ON t.event_id = e.id
            WHERE t.id = ticket_wallet.ticket_id
            AND e.created_by = auth.uid()
        )
    );

-- Ticket transfers policies
CREATE POLICY "Users can view transfers they're involved in" ON ticket_transfers
    FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create transfers from their tickets" ON ticket_transfers
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update transfers they're involved in" ON ticket_transfers
    FOR UPDATE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Ticket scans policies
CREATE POLICY "Event managers can view scan logs" ON ticket_scans
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM ticket_wallet tw
            JOIN tickets t ON tw.ticket_id = t.id
            JOIN events e ON t.event_id = e.id
            WHERE tw.id = ticket_scans.ticket_wallet_id
            AND e.created_by = auth.uid()
        )
    );

CREATE POLICY "Scanners can create scan logs" ON ticket_scans
    FOR INSERT WITH CHECK (auth.uid() = scanned_by);

-- Order items policies
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o
            WHERE o.id = order_items.order_id
            AND o.user_id = auth.uid()
        )
    );

-- ========================================
-- 7. TRIGGERS
-- ========================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_update_order_total ON order_items;
DROP TRIGGER IF EXISTS trigger_cleanup_expired_transfers ON ticket_transfers;

-- Trigger to update order total when items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
        UPDATE orders 
        SET 
            total = (
                SELECT COALESCE(SUM(total_price), 0)
                FROM order_items
                WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
            ),
            updated_at = NOW()
        WHERE id = COALESCE(NEW.order_id, OLD.order_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_total
    AFTER INSERT OR UPDATE OR DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

-- Trigger to clean up expired transfers
CREATE OR REPLACE FUNCTION cleanup_expired_transfers()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE ticket_transfers
    SET status = 'expired', updated_at = NOW()
    WHERE expires_at < NOW() AND status = 'pending';
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_expired_transfers
    AFTER INSERT ON ticket_transfers
    FOR EACH ROW
    EXECUTE FUNCTION cleanup_expired_transfers();

-- ========================================
-- 8. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🎉 Phase 1 Database Setup Complete!' as status,
    'Stripe integration, ticket management, and payment processing ready' as message,
    'Ready to deploy Edge Functions' as next_step;
