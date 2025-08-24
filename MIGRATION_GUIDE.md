# YardPass API Migration Guide
## From Traditional APIs to Edge Functions

### 🎯 **OVERVIEW**

**Status**: ✅ **MIGRATION REQUIRED** - Traditional API services are deprecated in favor of Edge Functions

**Timeline**: 
- **Phase 1**: Immediate - Mark services as deprecated ✅
- **Phase 2**: 2 weeks - Update all frontend integrations
- **Phase 3**: 4 weeks - Remove traditional services

---

## 🚨 **Why Migrate?**

### **Security Issues with Traditional APIs**
```typescript
// ❌ OLD: Uses service role key (security risk)
const supabase = createClient(url, SUPABASE_SERVICE_ROLE_KEY);

// ✅ NEW: Uses anon key with RLS (secure)
const supabase = createClient(url, SUPABASE_ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${token}` } }
});
```

### **Performance Benefits**
- **Serverless**: Auto-scaling, no server management
- **Real-time**: Built-in real-time capabilities
- **Cost**: Pay-per-use, no infrastructure costs
- **Latency**: Global edge deployment

---

## 📋 **Migration Checklist**

### **Step 1: Update Imports**
```typescript
// ❌ OLD: Traditional services
import { EventsService, TicketsService, SearchService } from '@yardpass/api';

// ✅ NEW: API Gateway
import { apiGateway } from '@yardpass/api';
```

### **Step 2: Update API Calls**

#### **Events**
```typescript
// ❌ OLD
const events = await EventsService.getEvents({
  category: 'music',
  when: 'week'
});

// ✅ NEW
const response = await apiGateway.getEvents({
  category: 'music',
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
});

if (response.error) {
  console.error('Error:', response.error.message);
} else {
  const events = response.data;
}
```

#### **Tickets**
```typescript
// ❌ OLD
const tickets = await TicketsService.getOwnedTickets(userId);

// ✅ NEW
const response = await apiGateway.purchaseTickets({
  event_id: 'event-123',
  tickets: [{ tier_id: 'tier-456', quantity: 2 }]
});

if (response.error) {
  console.error('Error:', response.error.message);
} else {
  const tickets = response.data;
}
```

#### **Search**
```typescript
// ❌ OLD
const results = await SearchService.search({
  q: 'concert',
  type: 'events'
});

// ✅ NEW
const response = await apiGateway.search({
  q: 'concert',
  types: ['events'],
  lat: 40.7128,
  lng: -74.0060,
  radius_km: 50
});

if (response.error) {
  console.error('Error:', response.error.message);
} else {
  const results = response.data;
}
```

### **Step 3: Handle Response Format**

#### **Old Format (Traditional APIs)**
```typescript
interface ApiResponse<T> {
  data: T;
  error?: never;
}
```

#### **New Format (Edge Functions)**
```typescript
interface EdgeFunctionResponse<T> {
  data?: T;
  error?: {
    message: string;
    code: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
  };
}
```

### **Step 4: Error Handling**
```typescript
// ✅ NEW: Proper error handling
const response = await apiGateway.getEvents(params);

if (response.error) {
  // Handle error
  console.error('API Error:', response.error.message);
  showErrorToast(response.error.message);
  return;
}

// Use data
const events = response.data;
```

---

## 🔄 **Function Mapping**

### **Events**
| Old Method | New Method | Notes |
|------------|------------|-------|
| `EventsService.getEvents()` | `apiGateway.getEvents()` | ✅ Direct mapping |
| `EventsService.createEvent()` | `apiGateway.createEvent()` | ✅ Direct mapping |
| `EventsService.updateEvent()` | `apiGateway.updateEvent()` | ✅ Direct mapping |
| `EventsService.getEventAnalytics()` | `apiGateway.getEventAnalytics()` | ✅ Direct mapping |

### **Tickets**
| Old Method | New Method | Notes |
|------------|------------|-------|
| `TicketsService.getOwnedTickets()` | `apiGateway.getEvents()` | 🔄 Different approach |
| `TicketsService.getTicketByQR()` | `apiGateway.scanTicket()` | 🔄 Different approach |
| `TicketsService.markTicketAsUsed()` | `apiGateway.scanTicket()` | 🔄 Different approach |

### **Search**
| Old Method | New Method | Notes |
|------------|------------|-------|
| `SearchService.search()` | `apiGateway.search()` | ✅ Direct mapping |
| `SearchService.searchEvents()` | `apiGateway.search()` | 🔄 Use types parameter |
| `SearchService.searchOrganizations()` | `apiGateway.search()` | 🔄 Use types parameter |

### **Social & Posts**
| Old Method | New Method | Notes |
|------------|------------|-------|
| `PostsService.getPosts()` | `apiGateway.getSocialFeed()` | ✅ Direct mapping |
| `PostsService.createPost()` | `apiGateway.createPost()` | ✅ Direct mapping |
| `PostsService.likePost()` | `apiGateway.getSocialFeed()` | 🔄 Different approach |

### **Payments & Orders**
| Old Method | New Method | Notes |
|------------|------------|-------|
| `OrdersService.createOrder()` | `apiGateway.createCheckoutSession()` | ✅ Direct mapping |
| `OrdersService.processPayment()` | `apiGateway.createCheckoutSession()` | 🔄 Different approach |

---

## 🆕 **New Edge Function Features**

### **Analytics & Insights**
```typescript
// ✅ NEW: Event analytics
const analytics = await apiGateway.getEventAnalytics(eventId);

// ✅ NEW: Event insights
const insights = await apiGateway.getEventInsights(eventId);

// ✅ NEW: Financial reports
const reports = await apiGateway.getFinancialReports({
  type: 'overview',
  event_id: eventId,
  period: '30d'
});

// ✅ NEW: Enterprise analytics
const enterprise = await apiGateway.getEnterpriseAnalytics(orgId);
```

### **Event Management**
```typescript
// ✅ NEW: Event scheduling
const scheduling = await apiGateway.scheduleEvent({
  event_id: eventId,
  action: 'reschedule',
  new_start_at: newDate,
  reason: 'Venue change'
});

// ✅ NEW: Waitlist management
const waitlist = await apiGateway.manageWaitlist({
  event_id: eventId,
  action: 'join',
  quantity: 2,
  priority: 'high'
});
```

### **Real-time & Mobile**
```typescript
// ✅ NEW: Real-time sync
const sync = await apiGateway.syncData({
  last_sync: '2024-01-01T00:00:00Z',
  tables: ['events', 'tickets', 'notifications']
});

// ✅ NEW: Push notifications
const notification = await apiGateway.sendPushNotification({
  user_ids: ['user-123'],
  title: 'Event Update',
  message: 'Your event has been updated'
});
```

---

## 🧪 **Testing Migration**

### **1. Create Test Suite**
```typescript
// tests/api-migration.test.ts
describe('API Migration Tests', () => {
  test('getEvents migration', async () => {
    const oldResponse = await EventsService.getEvents({ category: 'music' });
    const newResponse = await apiGateway.getEvents({ category: 'music' });
    
    expect(newResponse.data).toEqual(oldResponse.data);
  });
  
  test('error handling', async () => {
    const response = await apiGateway.getEvents({ category: 'invalid' });
    
    expect(response.error).toBeDefined();
    expect(response.error?.code).toBe('INVALID_CATEGORY');
  });
});
```

### **2. Gradual Migration**
```typescript
// Use feature flags for gradual rollout
const USE_EDGE_FUNCTIONS = process.env.USE_EDGE_FUNCTIONS === 'true';

export async function getEvents(params: any) {
  if (USE_EDGE_FUNCTIONS) {
    return apiGateway.getEvents(params);
  } else {
    return EventsService.getEvents(params);
  }
}
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: Authentication Errors**
```typescript
// ❌ Problem: Missing authorization header
const response = await apiGateway.getEvents(params);

// ✅ Solution: Ensure user is authenticated
const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  // Redirect to login
  return;
}
```

### **Issue 2: Response Format Mismatch**
```typescript
// ❌ Problem: Expecting old format
const events = response.data.events; // Old format

// ✅ Solution: Use new format
const events = response.data; // New format
```

### **Issue 3: Missing Parameters**
```typescript
// ❌ Problem: Using old parameter names
const response = await apiGateway.getEvents({
  when: 'week' // Old parameter
});

// ✅ Solution: Use new parameter names
const response = await apiGateway.getEvents({
  start_date: new Date().toISOString(),
  end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
});
```

---

## 📊 **Migration Progress Tracking**

### **Phase 1: Foundation** ✅
- [x] Mark traditional services as deprecated
- [x] Create API Gateway
- [x] Update type definitions
- [x] Create migration guide

### **Phase 2: Frontend Migration** 🔄
- [ ] Update all API imports
- [ ] Migrate event-related calls
- [ ] Migrate ticket-related calls
- [ ] Migrate search-related calls
- [ ] Migrate social-related calls
- [ ] Update error handling
- [ ] Test all integrations

### **Phase 3: Cleanup** ⏳
- [ ] Remove deprecated services
- [ ] Update documentation
- [ ] Remove unused dependencies
- [ ] Final testing and validation

---

## 🎯 **Success Criteria**

### **Technical Metrics**
- [ ] 100% of API calls use Edge Functions
- [ ] Zero traditional service dependencies
- [ ] <100ms average response time
- [ ] 99.9% uptime

### **Code Quality**
- [ ] No deprecated service imports
- [ ] Consistent error handling
- [ ] Proper TypeScript types
- [ ] Comprehensive test coverage

---

## 📞 **Support**

### **Getting Help**
- **Documentation**: Check Edge Function documentation
- **Examples**: See `/examples` folder for migration examples
- **Issues**: Report issues in the project repository
- **Questions**: Ask in the development team chat

### **Rollback Plan**
If issues arise during migration:
1. Use feature flags to switch back to traditional APIs
2. Fix issues in Edge Functions
3. Gradually re-enable Edge Functions
4. Monitor performance and errors

---

**Status**: ✅ **READY FOR MIGRATION**
**Next Step**: Begin Phase 2 - Frontend Migration

