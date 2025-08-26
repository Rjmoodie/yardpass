# Phase 1: Critical Ticket Flow Deployment Guide

## 🎯 Overview

This guide will walk you through deploying the complete Phase 1 ticket flow system, including:
- Database schema updates
- Stripe webhook integration
- Ticket wallet functionality
- QR code scanning system
- P2P ticket transfers

## 📋 Prerequisites

Before starting, ensure you have:
- ✅ Supabase project set up
- ✅ Stripe account with API keys
- ✅ Supabase CLI installed
- ✅ Environment variables configured

## 🚀 Step 1: Database Setup

### 1.1 Run Database Schema Script

1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Copy and paste the entire contents of `phase1_database_setup.sql`**
4. **Click "Run"**

This will create:
- ✅ Stripe integration tables
- ✅ Enhanced ticket management tables
- ✅ Order management improvements
- ✅ Performance indexes
- ✅ Helper functions
- ✅ RLS policies
- ✅ Triggers

### 1.2 Verify Database Setup

Run this verification query:

```sql
-- Verify Phase 1 tables were created
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('stripe_customers', 'stripe_payment_intents', 'stripe_webhook_events', 
                           'ticket_wallet', 'ticket_transfers', 'ticket_scans', 'order_items') 
        THEN '✅ Created'
        ELSE '❌ Missing'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('stripe_customers', 'stripe_payment_intents', 'stripe_webhook_events', 
                   'ticket_wallet', 'ticket_transfers', 'ticket_scans', 'order_items');
```

## 🚀 Step 2: Environment Configuration

### 2.1 Set Up Environment Variables

In your Supabase Dashboard, go to **Settings > Environment Variables** and add:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Supabase Configuration (should already exist)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.2 Get Stripe Webhook Secret

1. **Go to Stripe Dashboard > Developers > Webhooks**
2. **Click "Add endpoint"**
3. **Enter your webhook URL**: `https://your-project.supabase.co/functions/v1/stripe-webhook`
4. **Select these events**:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
   - `customer.created`
   - `customer.updated`
5. **Copy the webhook secret** and add it to your environment variables

## 🚀 Step 3: Deploy Edge Functions

### 3.1 Deploy Stripe Webhook

```bash
# Deploy the stripe-webhook function
supabase functions deploy stripe-webhook

# Set environment variables for the function
supabase secrets set STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

### 3.2 Deploy Ticket Wallet Function

```bash
# Deploy the tickets-my function
supabase functions deploy tickets-my
```

### 3.3 Deploy Ticket Scanner Function

```bash
# Deploy the tickets-scan function
supabase functions deploy tickets-scan
```

### 3.4 Deploy Ticket Transfer Function

```bash
# Deploy the tickets-transfer function
supabase functions deploy tickets-transfer
```

## 🚀 Step 4: Test the Implementation

### 4.1 Test Database Functions

Run these test queries in your Supabase SQL Editor:

```sql
-- Test QR code generation
SELECT generate_ticket_qr_code(
    '00000000-0000-0000-0000-000000000000'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid
);

-- Test ticket validation (will return false for non-existent QR)
SELECT * FROM validate_ticket_qr_code('test_qr_code');

-- Test scan processing (will return error for non-existent QR)
SELECT * FROM process_ticket_scan(
    'test_qr_code',
    '00000000-0000-0000-0000-000000000000'::uuid
);
```

### 4.2 Test Edge Functions

#### Test Stripe Webhook (using Stripe CLI)

```bash
# Install Stripe CLI if you haven't already
# Then run:
stripe listen --forward-to https://your-project.supabase.co/functions/v1/stripe-webhook

# In another terminal, trigger a test event:
stripe trigger checkout.session.completed
```

#### Test Ticket Wallet Function

```bash
# Get your user's tickets
curl -X GET "https://your-project.supabase.co/functions/v1/tickets-my" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

#### Test Ticket Scanner Function

```bash
# Scan a ticket (replace with actual QR code)
curl -X POST "https://your-project.supabase.co/functions/v1/tickets-scan" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "qr_code": "test_qr_code",
    "location_lat": 40.7128,
    "location_lng": -74.0060,
    "device_info": {"device": "test"}
  }'
```

#### Test Ticket Transfer Function

```bash
# Create a transfer request
curl -X POST "https://your-project.supabase.co/functions/v1/tickets-transfer" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to_user_id": "target_user_id",
    "ticket_wallet_id": "ticket_wallet_id",
    "expires_in_hours": 24,
    "message": "Here is your ticket!"
  }'
```

## 🚀 Step 5: Integration Testing

### 5.1 Create Test Data

```sql
-- Create a test event
INSERT INTO events (
    title,
    description,
    start_at,
    end_at,
    venue,
    city,
    status,
    visibility,
    created_by
) VALUES (
    'Test Event for Phase 1',
    'Testing the complete ticket flow',
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
    'Test Venue',
    'Test City',
    'published',
    'public',
    'your_user_id'
) RETURNING id;

-- Create a test ticket tier
INSERT INTO ticket_tiers (
    event_id,
    name,
    description,
    price_cents,
    currency,
    quantity_available,
    access_level
) VALUES (
    'event_id_from_above',
    'General Admission',
    'Standard entry ticket',
    2500,
    'USD',
    100,
    'general'
) RETURNING id;
```

### 5.2 Test Complete Flow

1. **Create an order** (through your frontend or API)
2. **Process payment** (through Stripe)
3. **Verify tickets created** (check ticket_wallet table)
4. **Test QR code generation** (should be automatic)
5. **Test ticket scanning** (using the scan function)
6. **Test ticket transfer** (create and accept transfer)

## 🚀 Step 6: Frontend Integration

### 6.1 Update Your Frontend

Add these API calls to your frontend:

```typescript
// Get user's tickets
const getUserTickets = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  eventId?: string;
}) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tickets-my?${new URLSearchParams(params)}`,
    {
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return response.json();
};

// Scan a ticket
const scanTicket = async (qrCode: string, location?: { lat: number; lng: number }) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tickets-scan`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        qr_code: qrCode,
        location_lat: location?.lat,
        location_lng: location?.lng,
        device_info: { device: 'mobile' }
      })
    }
  );
  return response.json();
};

// Transfer a ticket
const transferTicket = async (toUserId: string, ticketWalletId: string, message?: string) => {
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/tickets-transfer`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        to_user_id: toUserId,
        ticket_wallet_id: ticketWalletId,
        expires_in_hours: 24,
        message
      })
    }
  );
  return response.json();
};
```

## 🚀 Step 7: Monitoring & Verification

### 7.1 Check Function Logs

```bash
# View function logs
supabase functions logs stripe-webhook
supabase functions logs tickets-my
supabase functions logs tickets-scan
supabase functions logs tickets-transfer
```

### 7.2 Monitor Database

```sql
-- Check webhook events
SELECT * FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 10;

-- Check ticket wallet
SELECT * FROM ticket_wallet ORDER BY created_at DESC LIMIT 10;

-- Check transfers
SELECT * FROM ticket_transfers ORDER BY created_at DESC LIMIT 10;

-- Check scans
SELECT * FROM ticket_scans ORDER BY scanned_at DESC LIMIT 10;
```

## ✅ Success Criteria

Phase 1 is complete when:

- ✅ **Database schema** is deployed and verified
- ✅ **All 4 Edge Functions** are deployed and accessible
- ✅ **Stripe webhook** is receiving and processing events
- ✅ **Ticket creation** works after payment
- ✅ **QR code generation** is automatic
- ✅ **Ticket scanning** validates and logs scans
- ✅ **Ticket transfers** can be created and accepted
- ✅ **Notifications** are sent for all actions
- ✅ **Frontend integration** is working

## 🎯 Next Steps

After Phase 1 is complete, you can proceed to:

1. **Phase 2**: Event Management Functions
2. **Phase 3**: Social Features
3. **Phase 4**: Advanced Analytics

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not receiving events**
   - Check webhook URL is correct
   - Verify webhook secret matches
   - Check function logs for errors

2. **Database functions failing**
   - Verify all tables were created
   - Check RLS policies are correct
   - Ensure service role has permissions

3. **Edge Functions returning 500 errors**
   - Check function logs
   - Verify environment variables are set
   - Ensure database connections are working

### Getting Help

If you encounter issues:
1. Check the function logs first
2. Verify your environment variables
3. Test database functions directly
4. Review the error messages in the logs

**Phase 1 is now ready for production use!** 🚀

