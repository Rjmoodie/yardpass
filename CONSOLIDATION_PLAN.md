# YardPass API Consolidation Plan
## Edge Functions First Architecture

### 🎯 **DECISION: EDGE FUNCTIONS ARE THE NEW STANDARD**

**Status**: ✅ **APPROVED** - Override traditional API services with Edge Functions implementation

---

## 📊 **Current State Analysis**

### ✅ **Edge Functions (35+ functions) - NEW STANDARD**
- **Security**: `SUPABASE_ANON_KEY` with RLS enforcement ✅
- **Database**: Direct Supabase integration ✅
- **Real-time**: Built-in capabilities ✅
- **Performance**: Serverless, auto-scaling ✅
- **Deployment**: Simple, versioned ✅

### ❌ **Traditional API Services (11 services) - LEGACY**
- **Security**: `SUPABASE_SERVICE_ROLE_KEY` (security risk) ❌
- **Database**: Indirect access ❌
- **Real-time**: No built-in support ❌
- **Performance**: Server infrastructure required ❌
- **Deployment**: Complex process ❌

---

## 🚨 **Critical Discrepancies**

### 1. **Security Model Conflicts**
```
Edge Functions:     Traditional APIs:
├── SUPABASE_ANON_KEY    ├── SUPABASE_SERVICE_ROLE_KEY
├── RLS Enforcement      ├── Bypasses RLS
├── User Context         ├── Admin Context
└── Secure by Default    └── Security Risk
```

### 2. **Duplicate Functionality**
```
Functionality:          Edge Functions:        Traditional APIs:
├── Event Management    ├── create-event       ├── events.ts
├── Event Retrieval     ├── get-events         ├── events.ts
├── Ticket Management   ├── purchase-tickets   ├── tickets.ts
├── Ticket Scanning     ├── scan-ticket        ├── tickets.ts
├── Search              ├── search             ├── search.ts
├── Analytics           ├── event-analytics    ├── (none)
├── Social              ├── social-feed        ├── posts.ts
└── Payments            ├── checkout-session   ├── orders.ts
```

### 3. **Response Format Inconsistencies**
```
Edge Functions:         Traditional APIs:
├── Direct Supabase     ├── Wrapped responses
├── Error handling      ├── Custom error types
├── Pagination          ├── Custom pagination
└── Real-time data      └── Static data
```

---

## 🚀 **Consolidation Strategy**

### **Phase 1: Immediate Actions** (Priority: HIGH)

#### 1.1 **Deprecate Traditional API Services**
```bash
# Mark traditional services as deprecated
packages/api/src/services/
├── events.ts          # ❌ DEPRECATED - Use Edge Functions
├── tickets.ts         # ❌ DEPRECATED - Use Edge Functions
├── posts.ts           # ❌ DEPRECATED - Use Edge Functions
├── orders.ts          # ❌ DEPRECATED - Use Edge Functions
├── search.ts          # ❌ DEPRECATED - Use Edge Functions
├── organizations.ts   # ❌ DEPRECATED - Use Edge Functions
├── comments.ts        # ❌ DEPRECATED - Use Edge Functions
├── upload.ts          # ❌ DEPRECATED - Use Edge Functions
├── video.ts           # ❌ DEPRECATED - Use Edge Functions
├── checkins.ts        # ❌ DEPRECATED - Use Edge Functions
└── auth.ts            # ⚠️ KEEP - Core auth logic
```

#### 1.2 **Update Frontend Integration**
```typescript
// OLD: Traditional API calls
import { EventsService } from '@yardpass/api';
const events = await EventsService.getEvents(params);

// NEW: Edge Function calls
const response = await fetch('/functions/v1/get-events', {
  method: 'GET',
  headers: { Authorization: `Bearer ${token}` }
});
```

#### 1.3 **Standardize Response Formats**
```typescript
// Standard Edge Function Response Format
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

### **Phase 2: Migration** (Priority: MEDIUM)

#### 2.1 **Create API Gateway**
```typescript
// packages/api/src/gateway.ts
export class ApiGateway {
  private baseUrl: string;
  
  constructor(baseUrl: string = '/functions/v1') {
    this.baseUrl = baseUrl;
  }
  
  // Events
  async getEvents(params: GetEventsParams) {
    return this.call('get-events', { method: 'GET', params });
  }
  
  async createEvent(eventData: CreateEventData) {
    return this.call('create-event', { method: 'POST', body: eventData });
  }
  
  // Tickets
  async purchaseTickets(purchaseData: PurchaseData) {
    return this.call('purchase-tickets', { method: 'POST', body: purchaseData });
  }
  
  async scanTicket(scanData: ScanData) {
    return this.call('scan-ticket', { method: 'POST', body: scanData });
  }
  
  // Search
  async search(query: SearchQuery) {
    return this.call('search', { method: 'GET', params: query });
  }
  
  // Analytics
  async getEventAnalytics(eventId: string) {
    return this.call('event-analytics', { method: 'GET', params: { event_id: eventId } });
  }
  
  // Social
  async getSocialFeed(params: FeedParams) {
    return this.call('social-feed', { method: 'GET', params });
  }
  
  // Payments
  async createCheckoutSession(checkoutData: CheckoutData) {
    return this.call('checkout-session', { method: 'POST', body: checkoutData });
  }
  
  private async call(endpoint: string, options: CallOptions) {
    const url = `${this.baseUrl}/${endpoint}`;
    const response = await fetch(url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    
    return response.json();
  }
}
```

#### 2.2 **Update Type Definitions**
```typescript
// packages/types/src/edge-functions.ts
export interface EdgeFunctionEndpoints {
  // Events
  'GET /functions/v1/get-events': {
    request: GetEventsRequest;
    response: GetEventsResponse;
  };
  'POST /functions/v1/create-event': {
    request: CreateEventRequest;
    response: CreateEventResponse;
  };
  
  // Tickets
  'POST /functions/v1/purchase-tickets': {
    request: PurchaseTicketsRequest;
    response: PurchaseTicketsResponse;
  };
  'POST /functions/v1/scan-ticket': {
    request: ScanTicketRequest;
    response: ScanTicketResponse;
  };
  
  // Search
  'GET /functions/v1/search': {
    request: SearchRequest;
    response: SearchResponse;
  };
  
  // Analytics
  'GET /functions/v1/event-analytics': {
    request: EventAnalyticsRequest;
    response: EventAnalyticsResponse;
  };
  
  // Social
  'GET /functions/v1/social-feed': {
    request: SocialFeedRequest;
    response: SocialFeedResponse;
  };
  
  // Payments
  'POST /functions/v1/checkout-session': {
    request: CheckoutSessionRequest;
    response: CheckoutSessionResponse;
  };
}
```

### **Phase 3: Cleanup** (Priority: LOW)

#### 3.1 **Remove Traditional Services**
```bash
# Remove deprecated services
rm packages/api/src/services/events.ts
rm packages/api/src/services/tickets.ts
rm packages/api/src/services/posts.ts
rm packages/api/src/services/orders.ts
rm packages/api/src/services/search.ts
rm packages/api/src/services/organizations.ts
rm packages/api/src/services/comments.ts
rm packages/api/src/services/upload.ts
rm packages/api/src/services/video.ts
rm packages/api/src/services/checkins.ts
```

#### 3.2 **Update Documentation**
- Update API documentation to reflect Edge Functions
- Remove references to traditional services
- Add Edge Function usage examples

---

## 📋 **Implementation Checklist**

### ✅ **Phase 1: Immediate Actions**
- [ ] Mark traditional services as deprecated
- [ ] Create API Gateway for Edge Functions
- [ ] Update frontend integration examples
- [ ] Standardize response formats

### 🔄 **Phase 2: Migration**
- [ ] Update all frontend API calls
- [ ] Test all Edge Function integrations
- [ ] Update type definitions
- [ ] Create migration guide

### 🧹 **Phase 3: Cleanup**
- [ ] Remove deprecated services
- [ ] Update documentation
- [ ] Remove unused dependencies
- [ ] Final testing and validation

---

## 🎯 **Benefits of Consolidation**

### ✅ **Security Improvements**
- All API calls use RLS enforcement
- No more service role key exposure
- Consistent authentication model

### ✅ **Performance Improvements**
- Serverless auto-scaling
- Reduced latency
- Better resource utilization

### ✅ **Maintenance Improvements**
- Single deployment model
- Consistent error handling
- Unified monitoring

### ✅ **Cost Improvements**
- No server infrastructure costs
- Pay-per-use pricing
- Automatic scaling

---

## 🚨 **Migration Risks & Mitigation**

### **Risk 1: Breaking Changes**
**Mitigation**: 
- Maintain backward compatibility during transition
- Use feature flags for gradual rollout
- Comprehensive testing before deployment

### **Risk 2: Performance Issues**
**Mitigation**:
- Monitor Edge Function performance
- Optimize cold start times
- Use connection pooling where needed

### **Risk 3: Security Vulnerabilities**
**Mitigation**:
- Comprehensive security testing
- RLS policy validation
- Regular security audits

---

## 📊 **Success Metrics**

### **Technical Metrics**
- [ ] 100% of API calls use Edge Functions
- [ ] Zero traditional service dependencies
- [ ] <100ms average response time
- [ ] 99.9% uptime

### **Business Metrics**
- [ ] Reduced infrastructure costs
- [ ] Improved developer productivity
- [ ] Faster feature deployment
- [ ] Better user experience

---

**Status**: ✅ **READY FOR IMPLEMENTATION**
**Next Step**: Begin Phase 1 - Immediate Actions

