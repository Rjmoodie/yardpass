# Phase 1 Deployment Instructions

## 🎯 Step 1: Deploy Database Extensions

**Copy and paste this into your Supabase SQL Editor:**

```sql
-- Phase 1: Core Event & Ticket Flow Database Extensions
-- Run this in your Supabase SQL Editor

-- ========================================
-- 1. CART HOLDS FOR INVENTORY MANAGEMENT
-- ========================================
CREATE TABLE IF NOT EXISTS cart_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    tier_id UUID REFERENCES ticket_tiers(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one hold per user per tier
    UNIQUE(user_id, tier_id)
);

-- Index for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_cart_holds_expires ON cart_holds(expires_at);
CREATE INDEX IF NOT EXISTS idx_cart_holds_user ON cart_holds(user_id);

-- ========================================
-- 2. PROMO CODES WITH VALIDATION
-- ========================================
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT UNIQUE NOT NULL,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value INTEGER NOT NULL CHECK (discount_value > 0),
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for promo code lookups
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_event ON promo_codes(event_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_valid ON promo_codes(valid_from, valid_until, is_active);

-- ========================================
-- 3. TICKET TRANSFERS FOR P2P
-- ========================================
CREATE TABLE IF NOT EXISTS ticket_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    to_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for transfer lookups
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_ticket ON ticket_transfers(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_from_user ON ticket_transfers(from_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_to_user ON ticket_transfers(to_user_id);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_status ON ticket_transfers(status);
CREATE INDEX IF NOT EXISTS idx_ticket_transfers_expires ON ticket_transfers(expires_at);

-- ========================================
-- 4. SCAN LOGS FOR DOOR APP ANALYTICS
-- ========================================
CREATE TABLE IF NOT EXISTS scan_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    scanned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    scanned_at TIMESTAMPTZ DEFAULT NOW(),
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    device_info JSONB DEFAULT '{}',
    scan_result TEXT NOT NULL CHECK (scan_result IN ('valid', 'already_used', 'invalid', 'expired')),
    notes TEXT
);

-- Indexes for scan analytics
CREATE INDEX IF NOT EXISTS idx_scan_logs_ticket ON scan_logs(ticket_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_by ON scan_logs(scanned_by);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_scan_logs_result ON scan_logs(scan_result);

-- ========================================
-- 5. HELPER FUNCTIONS FOR PHASE 1
-- ========================================

-- Function to validate promo code
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
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN pc.id IS NULL THEN FALSE
            WHEN pc.is_active = FALSE THEN FALSE
            WHEN pc.valid_from > NOW() THEN FALSE
            WHEN pc.valid_until < NOW() THEN FALSE
            WHEN pc.max_uses IS NOT NULL AND pc.used_count >= pc.max_uses THEN FALSE
            ELSE TRUE
        END as is_valid,
        COALESCE(pc.discount_type, '') as discount_type,
        COALESCE(pc.discount_value, 0) as discount_value,
        CASE 
            WHEN pc.id IS NULL THEN 'Promo code not found'
            WHEN pc.is_active = FALSE THEN 'Promo code is inactive'
            WHEN pc.valid_from > NOW() THEN 'Promo code not yet valid'
            WHEN pc.valid_until < NOW() THEN 'Promo code has expired'
            WHEN pc.max_uses IS NOT NULL AND pc.used_count >= pc.max_uses THEN 'Promo code usage limit reached'
            ELSE ''
        END as error_message
    FROM promo_codes pc
    WHERE pc.code = validate_promo_code.promo_code
    AND (pc.event_id = validate_promo_code.event_id OR pc.event_id IS NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create cart hold
CREATE OR REPLACE FUNCTION create_cart_hold(
    user_id UUID,
    tier_id UUID,
    quantity INTEGER,
    hold_duration_minutes INTEGER DEFAULT 10
)
RETURNS UUID AS $$
DECLARE
    hold_id UUID;
    available_qty INTEGER;
BEGIN
    -- Check available quantity
    SELECT available_quantity INTO available_qty
    FROM ticket_tiers
    WHERE id = create_cart_hold.tier_id;
    
    IF available_qty < quantity THEN
        RAISE EXCEPTION 'Insufficient available quantity';
    END IF;
    
    -- Create or update cart hold
    INSERT INTO cart_holds (user_id, tier_id, quantity, expires_at)
    VALUES (create_cart_hold.user_id, create_cart_hold.tier_id, quantity, NOW() + INTERVAL '1 minute' * hold_duration_minutes)
    ON CONFLICT (user_id, tier_id) 
    DO UPDATE SET 
        quantity = create_cart_hold.quantity,
        expires_at = NOW() + INTERVAL '1 minute' * hold_duration_minutes
    RETURNING id INTO hold_id;
    
    RETURN hold_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to release cart hold
CREATE OR REPLACE FUNCTION release_cart_hold(hold_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM cart_holds WHERE id = release_cart_hold.hold_id;
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clean expired cart holds
CREATE OR REPLACE FUNCTION cleanup_expired_cart_holds()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM cart_holds WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 6. RLS POLICIES FOR PHASE 1 TABLES
-- ========================================

-- Enable RLS
ALTER TABLE cart_holds ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- Cart holds policies
CREATE POLICY "Users can view own cart holds" ON cart_holds
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own cart holds" ON cart_holds
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cart holds" ON cart_holds
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cart holds" ON cart_holds
    FOR DELETE USING (auth.uid() = user_id);

-- Promo codes policies (read-only for users)
CREATE POLICY "Anyone can read active promo codes" ON promo_codes
    FOR SELECT USING (is_active = TRUE AND (valid_until IS NULL OR valid_until > NOW()));

CREATE POLICY "Event managers can manage promo codes" ON promo_codes
    FOR ALL USING (is_event_manager(event_id, auth.uid()));

-- Ticket transfers policies
CREATE POLICY "Users can view transfers they're involved in" ON ticket_transfers
    FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create transfers from their tickets" ON ticket_transfers
    FOR INSERT WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update transfers they're involved in" ON ticket_transfers
    FOR UPDATE USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Scan logs policies
CREATE POLICY "Event managers can view scan logs" ON scan_logs
    FOR SELECT USING (is_event_manager(
        (SELECT event_id FROM tickets WHERE id = scan_logs.ticket_id), 
        auth.uid()
    ));

CREATE POLICY "Scanners can create scan logs" ON scan_logs
    FOR INSERT WITH CHECK (auth.uid() = scanned_by);

-- ========================================
-- 7. TRIGGERS FOR PHASE 1
-- ========================================

-- Trigger to update promo code usage count
CREATE OR REPLACE FUNCTION update_promo_usage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
        -- Update promo code usage if this order used one
        UPDATE promo_codes 
        SET used_count = used_count + 1
        WHERE id = NEW.promo_code_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_promo_usage
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_promo_usage();

-- Trigger to update ticket tier availability when tickets are issued
CREATE OR REPLACE FUNCTION update_tier_availability()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.status = 'active' AND OLD.status != 'active' THEN
        -- Decrease available quantity
        UPDATE ticket_tiers 
        SET available_quantity = available_quantity - 1
        WHERE id = NEW.ticket_tier_id;
    END IF;
    
    IF OLD.status = 'active' AND NEW.status != 'active' THEN
        -- Increase available quantity (refund/cancellation)
        UPDATE ticket_tiers 
        SET available_quantity = available_quantity + 1
        WHERE id = OLD.ticket_tier_id;
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tier_availability
    AFTER INSERT OR UPDATE ON tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_tier_availability();

-- ========================================
-- 8. SUCCESS MESSAGE
-- ========================================
SELECT 
    '🎉 Phase 1 Database Extensions Complete!' as status,
    'Core ticket flow tables and functions ready' as message,
    'Ready to deploy Edge Functions' as next_step;
```

## 🎯 Step 2: Deploy Stripe Webhook Handler

### **Function Name:** `stripe-webhook`

### **Environment Variables:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
YARDPASS_SUPABASE_URL=https://tgxgbiskbqjniviqoroh.supabase.co
YARDPASS_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **Stripe Webhook Setup:**
1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://tgxgbiskbqjniviqoroh.supabase.co/functions/v1/stripe-webhook`
3. Select events:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## 🎯 Step 3: Test the Complete Flow

### **Test Script:**
```sql
-- Test Phase 1 Components
-- Run this after deploying database extensions

-- 1. Create a test promo code
INSERT INTO promo_codes (
    code,
    event_id,
    discount_type,
    discount_value,
    max_uses,
    valid_until
) VALUES (
    'TEST10',
    (SELECT id FROM events LIMIT 1),
    'percentage',
    10,
    100,
    NOW() + INTERVAL '30 days'
);

-- 2. Test promo code validation
SELECT * FROM validate_promo_code('TEST10', 
    (SELECT id FROM events LIMIT 1), 
    '00000000-0000-0000-0000-000000000000'
);

-- 3. Test cart hold creation
SELECT create_cart_hold(
    '00000000-0000-0000-0000-000000000000',
    (SELECT id FROM ticket_tiers LIMIT 1),
    2,
    10
);

-- 4. Show results
SELECT 
    'Phase 1 Test Complete!' as status,
    'All components working' as message;
```

## 🎯 Step 4: Next Edge Functions to Deploy

1. **`tickets-my`** - Attendee ticket wallet
2. **`tickets-scan`** - QR validation
3. **`tickets-transfer`** - P2P transfers

## 🎯 Success Criteria

- ✅ Database extensions deployed
- ✅ Stripe webhook handler deployed
- ✅ Webhook endpoint configured in Stripe
- ✅ Test flow working end-to-end
- ✅ Tickets issued on payment success
- ✅ Inventory properly managed

**Ready to test the complete ticket flow!** 🚀
