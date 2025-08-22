# 🎯 YardPass Mock Data Setup Guide

## 🚀 Quick Setup Instructions

### 1. Load Mock Data
1. **Open Supabase Dashboard** → SQL Editor
2. **Copy and paste** the contents of `supabase/mock_data.sql`
3. **Run the script** - this will populate your database with realistic test data

### 2. Test the Data
1. **Update** `test_mock_data.js` with your Supabase credentials:
   ```javascript
   const supabaseUrl = 'https://your-project.supabase.co';
   const supabaseKey = 'your-anon-key';
   ```
2. **Run the test**:
   ```bash
   node test_mock_data.js
   ```

## 📊 What's Included in the Mock Data

### **Users & Organizations**
- **5 Users**: John Doe, Jane Smith, Mike Wilson, Sarah Johnson, Alex Brown
- **4 Organizations**: MusicFest, TechCon, Sports Central, ArtSpace
- **Realistic profiles** with avatars, bios, and contact info

### **Events**
- **5 Diverse Events**:
  - 🎵 Summer Music Festival 2024 (Nashville)
  - 💻 Tech Innovation Summit (San Francisco)
  - 🏃‍♂️ City Marathon 2024 (Los Angeles)
  - 🎨 Contemporary Art Exhibition (New York)
  - 🎷 Jazz Night Under the Stars (Nashville)

### **Ticketing System**
- **6 Ticket Types** with different pricing tiers:
  - General Admission ($150)
  - VIP Pass ($350)
  - Crew Pass ($500)
  - Conference Pass ($299)
  - Marathon Entry ($75)
  - Free Admission ($0)

### **Social Features**
- **4 Posts** with engagement data
- **4 Comments** with likes
- **8 Reactions** (like, love, excited)
- **8 Follow relationships** between users

### **Analytics Data**
- **User analytics** (ticket purchases, event views)
- **Event analytics** (tickets sold, page views)
- **Realistic metrics** for testing dashboards

### **Reference Data**
- **8 Event Categories**: Music, Sports, Technology, Food & Drink, Art & Culture, Business, Education, Entertainment
- **8 Event Tags**: VIP, All Ages, 21+, Free, Outdoor, Indoor, Featured, Limited Capacity

## 🧪 Testing Your Frontend

### **Core Features to Test**

#### **1. User Authentication**
```javascript
// Test user login/signup
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'john.doe@example.com',
  password: 'password123'
});
```

#### **2. Event Browsing**
```javascript
// Get all events
const { data: events } = await supabase
  .from('events')
  .select('*')
  .eq('status', 'published');

// Get events by category
const { data: musicEvents } = await supabase
  .from('events')
  .select('*')
  .eq('category_id', '550e8400-e29b-41d4-a716-446655440001');
```

#### **3. Location-Based Search**
```javascript
// Find nearby events
const { data: nearby } = await supabase
  .rpc('find_nearby_events', {
    center_lat: 36.1627,
    center_lon: -86.7816,
    radius_meters: 50000,
    limit_count: 10
  });
```

#### **4. Ticket Purchasing**
```javascript
// Get available tickets
const { data: tickets } = await supabase
  .from('tickets')
  .select('*')
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440501');

// Create an order
const { data: order } = await supabase
  .from('orders')
  .insert({
    user_id: 'user-uuid',
    event_id: '550e8400-e29b-41d4-a716-446655440501',
    total_amount: 150.00,
    currency: 'USD',
    status: 'pending'
  });
```

#### **5. Social Features**
```javascript
// Get posts for an event
const { data: posts } = await supabase
  .from('posts')
  .select('*, users(full_name, username, avatar_url)')
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440501');

// Add a reaction
const { data: reaction } = await supabase
  .from('reactions')
  .insert({
    user_id: 'user-uuid',
    post_id: '550e8400-e29b-41d4-a716-446655440901',
    reaction_type: 'like'
  });
```

#### **6. Analytics**
```javascript
// Get event analytics
const { data: analytics } = await supabase
  .from('event_analytics')
  .select('*')
  .eq('event_id', '550e8400-e29b-41d4-a716-446655440501');
```

## 🎨 Sample Data Highlights

### **Event Examples**
- **Summer Music Festival**: 3-day event, 5000 capacity, $150 tickets
- **Tech Innovation Summit**: 1-day conference, 500 capacity, $299 tickets
- **City Marathon**: Athletic event, 10000 capacity, $75 tickets
- **Art Exhibition**: Free event, 200 capacity, ongoing for 30 days

### **User Profiles**
- **John Doe**: Music event organizer, MusicFest owner
- **Jane Smith**: Tech conference organizer, TechCon owner
- **Mike Wilson**: Sports coordinator, Sports Central owner
- **Sarah Johnson**: Art curator, ArtSpace owner
- **Alex Brown**: Food festival organizer, MusicFest admin

### **QR Codes for Testing**
- `YARDPASS-001-2024-001` (General Admission - Active)
- `YARDPASS-001-2024-002` (General Admission - Active)
- `YARDPASS-002-2024-001` (Conference Pass - Active)
- `YARDPASS-003-2024-001` (Marathon Entry - Used)
- `YARDPASS-004-2024-001` (Free Admission - Active)

## 🔧 Troubleshooting

### **Common Issues**

1. **"Table doesn't exist" errors**
   - Make sure you've run the enterprise schema first
   - Check that all tables are created in the correct schemas

2. **Permission errors**
   - Verify RLS policies are working correctly
   - Check that your Supabase key has the right permissions

3. **Spatial function errors**
   - Ensure PostGIS extension is enabled
   - Verify the `find_nearby_events` function exists

### **Verification Steps**

1. **Run the test script** to verify all data is loaded
2. **Check Supabase Dashboard** → Table Editor to see the data
3. **Test API endpoints** in the API Explorer
4. **Verify RLS policies** are working as expected

## 🚀 Next Steps

Once your mock data is loaded and tested:

1. **Connect your frontend** to the Supabase client
2. **Test all major features** with the realistic data
3. **Build your UI components** using the sample data structure
4. **Implement authentication** and user management
5. **Add real-time features** using Supabase subscriptions

**Your YardPass database is now ready for full frontend development!** 🎉
