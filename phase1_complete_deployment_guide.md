# Phase 1: Complete Deployment Guide

## 🎯 Overview

This guide covers the complete Phase 1 implementation including:
- ✅ **Phase 1 Core** (already deployed)
- ✅ **Checkout Session** (new)
- ✅ **Create Event** (new)
- ✅ **Additional Database Functions** (new)

## 📋 Current Status

### ✅ Already Deployed
- `stripe-webhook` - Stripe payment processing
- `tickets-my` - User ticket wallet
- `tickets-scan` - QR code scanning
- `tickets-transfer` - P2P ticket transfers

### 🚀 New Functions to Deploy
- `checkout-session` - Stripe checkout session creation
- `create-event` - Event creation with ticket tiers

## 🚀 Step 1: Deploy Additional Database Functions

### 1.1 Run Additional Database Script

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the entire contents of `phase1_additional_functions.sql`**
4. **Click "Run"**

This will create:
- ✅ Cart hold functions (ticket reservation)
- ✅ Promo code validation
- ✅ Notification creation
- ✅ Additional tables (cart_holds, promo_codes, payout_accounts)
- ✅ Indexes and RLS policies

### 1.2 Verify Additional Functions

Run this verification query:

```sql
-- Verify additional tables were created
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('cart_holds', 'promo_codes', 'payout_accounts') 
        THEN '✅ Created'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('cart_holds', 'promo_codes', 'payout_accounts');

-- Verify functions were created
SELECT 
    routine_name,
    CASE 
        WHEN routine_name IN ('create_cart_hold', 'release_cart_hold', 'cleanup_expired_cart_holds', 
                             'validate_promo_code', 'create_notification') 
        THEN '✅ Created'
        ELSE '❌ Missing'
    END as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('create_cart_hold', 'release_cart_hold', 'cleanup_expired_cart_holds', 
                     'validate_promo_code', 'create_notification');
```

## 🚀 Step 2: Deploy New Edge Functions

### 2.1 Deploy Checkout Session Function

```bash
# Deploy the checkout-session function
supabase functions deploy checkout-session
```

### 2.2 Deploy Create Event Function

```bash
# Deploy the create-event function
supabase functions deploy create-event
```

## 🚀 Step 3: Test the New Functions

### 3.1 Test Create Event Function

```bash
# Create a test event
curl -X POST "https://your-project.supabase.co/functions/v1/create-event" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Event for Checkout",
    "description": "Testing the complete checkout flow",
    "start_at": "2024-12-25T18:00:00Z",
    "end_at": "2024-12-25T21:00:00Z",
    "venue": "Test Venue",
    "city": "Test City",
    "ticket_tiers": [
      {
        "name": "General Admission",
        "description": "Standard entry",
        "price_cents": 2500,
        "currency": "USD",
        "max_quantity": 100,
        "access_level": "general"
      }
    ]
  }'
```

### 3.2 Test Checkout Session Function

```bash
# Create a checkout session
curl -X POST "https://your-project.supabase.co/functions/v1/checkout-session" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "event_id_from_above",
    "items": [
      {
        "tier_id": "tier_id_from_above",
        "quantity": 2
      }
    ],
    "success_url": "https://your-app.com/success",
    "cancel_url": "https://your-app.com/cancel"
  }'
```

## 🚀 Step 4: Complete Integration Testing

### 4.1 Test Complete Flow

1. **Create Event** → Get event_id and tier_id
2. **Create Checkout Session** → Get checkout_url
3. **Complete Payment** → Stripe webhook processes
4. **Verify Tickets Created** → Check ticket_wallet table
5. **Test QR Code** → Use tickets-scan function
6. **Test Transfer** → Use tickets-transfer function

### 4.2 Test Cart Hold System

```sql
-- Test cart hold creation
SELECT create_cart_hold(
    'your_user_id'::uuid,
    'tier_id'::uuid,
    2,
    10
);

-- Test cart hold release
SELECT release_cart_hold('hold_id'::uuid);

-- Test cleanup
SELECT cleanup_expired_cart_holds();
```

### 4.3 Test Promo Code System

```sql
-- Create a test promo code
INSERT INTO promo_codes (
    code,
    event_id,
    discount_type,
    discount_value,
    max_uses
) VALUES (
    'TEST20',
    'event_id'::uuid,
    'percentage',
    20,
    100
);

-- Test promo code validation
SELECT * FROM validate_promo_code('TEST20', 'event_id'::uuid, 'user_id'::uuid);
```

## 🚀 Step 5: Frontend Integration

### 5.1 Event Creation API

```typescript
// Create an event
const createEvent = async (eventData: {
  title: string;
  description?: string;
  start_at: string;
  end_at?: string;
  venue?: string;
  city?: string;
  ticket_tiers?: Array<{
    name: string;
    description?: string;
    price_cents: number;
    currency?: string;
    max_quantity: number;
    access_level?: string;
  }>;
}) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/create-event`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eventData)
    }
  );
  return response.json();
};
```

### 5.2 Checkout Session API

```typescript
// Create checkout session
const createCheckoutSession = async (checkoutData: {
  event_id: string;
  items: Array<{
    tier_id: string;
    quantity: number;
  }>;
  promo_code?: string;
  success_url?: string;
  cancel_url?: string;
}) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/checkout-session`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutData)
    }
  );
  return response.json();
};

// Redirect to Stripe checkout
const handleCheckout = async (eventId: string, items: any[]) => {
  const result = await createCheckoutSession({
    event_id: eventId,
    items,
    success_url: `${window.location.origin}/success`,
    cancel_url: `${window.location.origin}/cancel`
  });
  
  if (result.success) {
    window.location.href = result.checkout_url;
  }
};
```

## ✅ Complete Phase 1 Features

Your YardPass system now has:

### 🎫 **Complete Ticket Management**
- ✅ Event creation with ticket tiers
- ✅ Stripe checkout integration
- ✅ Cart hold system (prevents overselling)
- ✅ Promo code support
- ✅ QR code generation and validation
- ✅ P2P ticket transfers
- ✅ Real-time notifications

### 💳 **Payment Processing**
- ✅ Stripe checkout sessions
- ✅ Webhook processing
- ✅ Order management
- ✅ Refund handling
- ✅ Platform fees

### 🔐 **Security & Validation**
- ✅ User authentication
- ✅ Permission checks
- ✅ Cart hold expiration
- ✅ Promo code validation
- ✅ Payout account verification

### 📊 **Data Management**
- ✅ Complete audit trails
- ✅ Scan history
- ✅ Transfer history
- ✅ Order tracking
- ✅ Performance indexes

## 🎯 Next Steps

After Phase 1 is complete, you can proceed to:

1. **Phase 2**: Event Management Functions
   - `events-related` - Related events
   - `events-feed` - Event feeds
   - `events-analytics` - Event analytics
   - `events-attendees` - Attendee management

2. **Phase 3**: Social Features
   - `reactions` - Post reactions
   - `comments` - Comments system
   - `subscriptions` - User subscriptions

3. **Phase 4**: Advanced Features
   - `payouts-status` - Payout management
   - `tickets-resale` - Resale marketplace
   - `admin-trust-cases` - Trust & safety

## 🆘 Troubleshooting

### Common Issues

1. **Cart hold errors**
   - Check ticket tier availability
   - Verify user permissions
   - Check for expired holds

2. **Promo code validation fails**
   - Verify promo code exists and is active
   - Check usage limits
   - Ensure event compatibility

3. **Checkout session creation fails**
   - Verify Stripe configuration
   - Check ticket availability
   - Ensure proper authentication

### Getting Help

If you encounter issues:
1. Check function logs: `supabase functions logs function-name`
2. Verify database functions exist
3. Test with simple data first
4. Check environment variables

**Phase 1 is now complete and production-ready!** 🚀

