# YARDPASS Edge Functions Reference

## 📋 Complete List (36 Functions)

### 🎫 Ticket Management
- `tickets-my` - Get user's tickets
- `tickets-scan` - Scan tickets for entry
- `tickets-transfer` - Transfer tickets between users
- `purchase-tickets` - Purchase tickets
- `generate-tickets` - Generate tickets after payment
- `transfer-ticket` - Transfer individual ticket
- `scan-ticket` - Scan ticket for validation

### 🎪 Event Management
- `create-event` - Create new event
- `update-event` - Update event details
- `get-events` - Get events list
- `publish-event` - Publish event
- `event-series` - Manage event series
- `event-scheduling` - Event scheduling

### 💳 Payment Processing
- `checkout-session` - Create Stripe checkout session
- `stripe-webhook` - Handle Stripe webhooks
- `process-refund` - Process refunds
- `manage-payouts` - Manage payouts
- `financial-reports` - Generate financial reports

### 🔍 Search & Discovery
- `search` - Basic search functionality
- `enhanced-search` - Advanced search with filters
- `discover-feed` - Discovery feed
- `smart-recommendations` - AI-powered recommendations

### 📊 Analytics
- `event-analytics` - Event analytics
- `enhanced-analytics` - Enhanced analytics
- `enterprise-analytics` - Enterprise analytics
- `event-insights` - Event insights

### 📱 Social & Communications
- `social-feed` - Social media feed
- `post-reactions` - Handle post reactions
- `user-connections` - User connections
- `communications` - Communication system

### 🛠️ Utilities
- `get-mapbox-token` - Get Mapbox token
- `media-service` - Media handling
- `realtime-sync` - Real-time synchronization
- `waitlist-management` - Waitlist management

## 🚨 Known Issues

### API Call Mismatches
1. **Frontend calls `get_user_tickets`** → **Edge function is `tickets-my`**
2. **Frontend calls `events_with_details`** → **Edge function is `get-events`**

### Function Issues
1. **`checkout-session`** - Returns 500 error due to database schema issues

## 🔧 Quick Commands

```bash
# List all functions
ls supabase/functions/

# Deploy all functions
supabase functions deploy --project-ref YOUR_PROJECT_REF

# Deploy specific function
supabase functions deploy checkout-session --project-ref YOUR_PROJECT_REF

# Check function status
supabase functions list --project-ref YOUR_PROJECT_REF
```

## 📝 Naming Convention
- ✅ Use kebab-case (e.g., `get-user-tickets`)
- ✅ Avoid underscores
- ✅ Be descriptive and specific
- ✅ Group related functions with prefixes
