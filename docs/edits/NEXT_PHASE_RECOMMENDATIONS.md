# YardPass Next Phase Recommendations
## Completing the Edge Functions Implementation

### 🎯 **PHASE 2: FRONTEND INTEGRATION & OPTIMIZATION**

---

## 📋 **Immediate Actions (Week 1)**

### **1. Frontend API Migration**

#### **1.1 Run Migration Script**
```bash
# Make script executable
chmod +x scripts/migrate-api.js

# Run migration
node scripts/migrate-api.js
```

#### **1.2 Manual Updates Required**
```typescript
// Update SearchScreen.tsx
// OLD:
import { SearchService } from '@/services/search';
const searchResponse = await SearchService.search({ q: query });

// NEW:
import { apiGateway } from '@yardpass/api';
const response = await apiGateway.search({ q: query });
if (response.error) {
  console.error('Search error:', response.error.message);
  return;
}
const searchResponse = response.data;
```

### **2. Error Handling Standardization**

#### **2.1 Create Error Handler Utility**
```typescript
// utils/apiErrorHandler.ts
export class ApiErrorHandler {
  static handle(response: EdgeFunctionResponse<any>) {
    if (response.error) {
      console.error('API Error:', response.error);
      
      // Show user-friendly message
      const message = this.getUserMessage(response.error.code);
      showToast(message, 'error');
      
      // Track error for analytics
      this.trackError(response.error);
      
      return false;
    }
    return true;
  }
  
  private static getUserMessage(code: string): string {
    const messages = {
      'UNAUTHORIZED': 'Please log in to continue',
      'FORBIDDEN': 'You don\'t have permission to perform this action',
      'NOT_FOUND': 'The requested resource was not found',
      'VALIDATION_ERROR': 'Please check your input and try again',
      'NETWORK_ERROR': 'Connection error. Please check your internet and try again',
      'DEFAULT': 'Something went wrong. Please try again'
    };
    return messages[code] || messages.DEFAULT;
  }
  
  private static trackError(error: any) {
    // Send to analytics service
    analytics.track('api_error', {
      code: error.code,
      message: error.message,
      url: window.location.href
    });
  }
}
```

#### **2.2 Update API Calls**
```typescript
// Example: Updated API call with error handling
const response = await apiGateway.getEvents(params);
if (!ApiErrorHandler.handle(response)) {
  return;
}
const events = response.data;
```

### **3. Response Format Standardization**

#### **3.1 Create Response Wrapper**
```typescript
// utils/apiResponse.ts
export class ApiResponse<T> {
  constructor(
    public data?: T,
    public error?: any,
    public meta?: any
  ) {}
  
  static success<T>(data: T, meta?: any): ApiResponse<T> {
    return new ApiResponse(data, undefined, meta);
  }
  
  static error<T>(error: any): ApiResponse<T> {
    return new ApiResponse(undefined, error);
  }
  
  isSuccess(): boolean {
    return !this.error && this.data !== undefined;
  }
  
  isError(): boolean {
    return !!this.error;
  }
}
```

---

## 🚀 **Performance Optimizations (Week 2)**

### **1. Edge Function Caching**

#### **1.1 Add Caching Headers**
```typescript
// Update Edge Functions to include caching
const response = new Response(JSON.stringify(data), {
  status: 200,
  headers: {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'Cache-Control': 'public, max-age=300', // 5 minutes
    'ETag': generateETag(data)
  }
});
```

#### **1.2 Implement ETag Generation**
```typescript
// utils/etag.ts
import { createHash } from 'crypto';

export function generateETag(data: any): string {
  const hash = createHash('md5');
  hash.update(JSON.stringify(data));
  return `"${hash.digest('hex')}"`;
}
```

### **2. Request Deduplication**

#### **2.1 Create Request Cache**
```typescript
// utils/requestCache.ts
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes
  
  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.data;
    }
    
    const data = await fetcher();
    this.cache.set(key, { data, timestamp: Date.now() });
    return data;
  }
  
  invalidate(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }
}

export const requestCache = new RequestCache();
```

#### **2.2 Use in API Gateway**
```typescript
// Update API Gateway to use caching
async getEvents(params: any): Promise<EdgeFunctionResponse<any>> {
  const cacheKey = `events:${JSON.stringify(params)}`;
  
  return requestCache.get(cacheKey, () => 
    this.call('get-events', { method: 'GET', params })
  );
}
```

### **3. Batch Operations**

#### **3.1 Create Batch API**
```typescript
// supabase/functions/batch-operations/index.ts
interface BatchRequest {
  operations: Array<{
    type: 'get_events' | 'get_tickets' | 'get_notifications';
    params: any;
  }>;
}

serve(async (req) => {
  const { operations }: BatchRequest = await req.json();
  
  const results = await Promise.all(
    operations.map(async (op) => {
      switch (op.type) {
        case 'get_events':
          return await getEvents(op.params);
        case 'get_tickets':
          return await getTickets(op.params);
        case 'get_notifications':
          return await getNotifications(op.params);
      }
    })
  );
  
  return new Response(JSON.stringify({ results }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
```

---

## 🔒 **Security Enhancements (Week 3)**

### **1. Rate Limiting**

#### **1.1 Add Rate Limiting to Edge Functions**
```typescript
// utils/rateLimiter.ts
import { Redis } from 'redis';

class RateLimiter {
  private redis: Redis;
  
  constructor() {
    this.redis = new Redis(Deno.env.get('REDIS_URL'));
  }
  
  async checkLimit(userId: string, endpoint: string, limit: number, window: number): Promise<boolean> {
    const key = `rate_limit:${userId}:${endpoint}`;
    const current = await this.redis.incr(key);
    
    if (current === 1) {
      await this.redis.expire(key, window);
    }
    
    return current <= limit;
  }
}

export const rateLimiter = new RateLimiter();
```

#### **1.2 Implement in Edge Functions**
```typescript
// Add to all Edge Functions
const canProceed = await rateLimiter.checkLimit(
  user.id, 
  'get-events', 
  100, // 100 requests
  3600 // per hour
);

if (!canProceed) {
  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### **2. Input Validation**

#### **2.1 Create Validation Schema**
```typescript
// utils/validation.ts
import { z } from 'zod';

export const EventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000),
  start_at: z.string().datetime(),
  end_at: z.string().datetime(),
  venue: z.string().min(1).max(200),
  city: z.string().min(1).max(100),
  category: z.enum(['music', 'sports', 'business', 'education', 'other']),
  visibility: z.enum(['public', 'private', 'unlisted'])
});

export const TicketPurchaseSchema = z.object({
  event_id: z.string().uuid(),
  tickets: z.array(z.object({
    tier_id: z.string().uuid(),
    quantity: z.number().min(1).max(10)
  })).min(1),
  promo_code: z.string().optional()
});
```

#### **2.2 Add Validation to Edge Functions**
```typescript
// Add to create-event function
const validatedData = EventSchema.parse(eventData);
```

### **3. Audit Logging**

#### **3.1 Create Audit Logger**
```typescript
// utils/auditLogger.ts
export class AuditLogger {
  static async log(action: string, userId: string, details: any) {
    await supabaseClient
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        details,
        ip_address: req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      });
  }
}
```

---

## 📊 **Monitoring & Analytics (Week 4)**

### **1. Performance Monitoring**

#### **1.1 Add Performance Tracking**
```typescript
// utils/performance.ts
export class PerformanceTracker {
  static async track(operation: string, fn: () => Promise<any>) {
    const start = performance.now();
    
    try {
      const result = await fn();
      const duration = performance.now() - start;
      
      // Log performance
      await this.logPerformance(operation, duration, 'success');
      
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      
      // Log error performance
      await this.logPerformance(operation, duration, 'error', error);
      
      throw error;
    }
  }
  
  private static async logPerformance(operation: string, duration: number, status: string, error?: any) {
    await supabaseClient
      .from('performance_logs')
      .insert({
        operation,
        duration_ms: Math.round(duration),
        status,
        error_message: error?.message,
        timestamp: new Date().toISOString()
      });
  }
}
```

#### **1.2 Use in API Gateway**
```typescript
// Update API Gateway methods
async getEvents(params: any): Promise<EdgeFunctionResponse<any>> {
  return PerformanceTracker.track('get_events', () =>
    this.call('get-events', { method: 'GET', params })
  );
}
```

### **2. Error Tracking**

#### **2.1 Create Error Tracker**
```typescript
// utils/errorTracker.ts
export class ErrorTracker {
  static async track(error: any, context: any) {
    await supabaseClient
      .from('error_logs')
      .insert({
        error_type: error.constructor.name,
        error_message: error.message,
        error_stack: error.stack,
        context: JSON.stringify(context),
        user_id: context.userId,
        timestamp: new Date().toISOString()
      });
  }
}
```

### **3. Usage Analytics**

#### **3.1 Track API Usage**
```typescript
// utils/usageTracker.ts
export class UsageTracker {
  static async track(endpoint: string, userId: string, params: any) {
    await supabaseClient
      .from('api_usage')
      .insert({
        endpoint,
        user_id: userId,
        params: JSON.stringify(params),
        timestamp: new Date().toISOString()
      });
  }
}
```

---

## 🧪 **Testing Strategy (Week 5)**

### **1. Unit Tests**

#### **1.1 Test API Gateway**
```typescript
// tests/apiGateway.test.ts
import { apiGateway } from '@yardpass/api';

describe('API Gateway', () => {
  test('getEvents returns data', async () => {
    const response = await apiGateway.getEvents({ category: 'music' });
    
    expect(response).toHaveProperty('data');
    expect(response.data).toBeInstanceOf(Array);
  });
  
  test('handles errors properly', async () => {
    const response = await apiGateway.getEvents({ category: 'invalid' });
    
    expect(response).toHaveProperty('error');
    expect(response.error.code).toBe('VALIDATION_ERROR');
  });
});
```

### **2. Integration Tests**

#### **2.1 Test Edge Functions**
```typescript
// tests/edgeFunctions.test.ts
describe('Edge Functions', () => {
  test('create-event creates event', async () => {
    const eventData = {
      title: 'Test Event',
      description: 'Test Description',
      start_at: '2024-12-25T18:00:00Z',
      end_at: '2024-12-25T21:00:00Z',
      venue: 'Test Venue',
      city: 'Test City',
      category: 'music',
      visibility: 'public'
    };
    
    const response = await apiGateway.createEvent(eventData);
    
    expect(response.data).toHaveProperty('id');
    expect(response.data.title).toBe('Test Event');
  });
});
```

### **3. Performance Tests**

#### **3.1 Load Testing**
```typescript
// tests/performance.test.ts
import { loadTest } from 'k6';

export default function() {
  const response = http.get('/functions/v1/get-events');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });
}
```

---

## 📈 **Deployment & CI/CD (Week 6)**

### **1. Automated Deployment**

#### **1.1 GitHub Actions Workflow**
```yaml
# .github/workflows/deploy-edge-functions.yml
name: Deploy Edge Functions

on:
  push:
    branches: [main]
    paths: ['supabase/functions/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          
      - name: Install Supabase CLI
        run: npm install -g supabase
          
      - name: Deploy Edge Functions
        run: |
          supabase functions deploy --use-api
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### **2. Environment Management**

#### **2.1 Environment Configuration**
```typescript
// config/environments.ts
export const environments = {
  development: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    apiBaseUrl: '/functions/v1'
  },
  staging: {
    supabaseUrl: process.env.STAGING_SUPABASE_URL,
    supabaseAnonKey: process.env.STAGING_SUPABASE_ANON_KEY,
    apiBaseUrl: '/functions/v1'
  },
  production: {
    supabaseUrl: process.env.PROD_SUPABASE_URL,
    supabaseAnonKey: process.env.PROD_SUPABASE_ANON_KEY,
    apiBaseUrl: '/functions/v1'
  }
};
```

---

## 🎯 **Success Metrics & KPIs**

### **Technical Metrics**
- [ ] **Response Time**: <100ms average
- [ ] **Uptime**: 99.9%
- [ ] **Error Rate**: <1%
- [ ] **Cache Hit Rate**: >80%

### **Business Metrics**
- [ ] **API Usage**: Track endpoint usage
- [ ] **User Engagement**: Monitor feature adoption
- [ ] **Performance**: Monitor user experience
- [ ] **Cost Optimization**: Track infrastructure costs

### **Security Metrics**
- [ ] **Security Incidents**: 0
- [ ] **Rate Limit Violations**: <5%
- [ ] **Failed Authentication**: <2%
- [ ] **Data Breaches**: 0

---

## 📋 **Implementation Checklist**

### **Week 1: Frontend Migration** ✅
- [x] Create migration script
- [x] Update API imports
- [x] Standardize error handling
- [x] Update response formats

### **Week 2: Performance Optimization** 🔄
- [ ] Implement caching
- [ ] Add request deduplication
- [ ] Create batch operations
- [ ] Optimize response times

### **Week 3: Security Enhancements** ⏳
- [ ] Add rate limiting
- [ ] Implement input validation
- [ ] Create audit logging
- [ ] Security testing

### **Week 4: Monitoring & Analytics** ⏳
- [ ] Performance tracking
- [ ] Error tracking
- [ ] Usage analytics
- [ ] Dashboard creation

### **Week 5: Testing Strategy** ⏳
- [ ] Unit tests
- [ ] Integration tests
- [ ] Performance tests
- [ ] Security tests

### **Week 6: Deployment & CI/CD** ⏳
- [ ] Automated deployment
- [ ] Environment management
- [ ] Monitoring setup
- [ ] Documentation updates

---

## 🚀 **Next Steps**

1. **Run Migration Script**: Execute the migration script to update frontend code
2. **Test All Integrations**: Verify all API calls work correctly
3. **Implement Performance Optimizations**: Add caching and request deduplication
4. **Add Security Enhancements**: Implement rate limiting and validation
5. **Set Up Monitoring**: Create performance and error tracking
6. **Deploy to Production**: Use automated deployment pipeline

**Status**: ✅ **READY FOR IMPLEMENTATION**
**Priority**: High - Complete Edge Functions migration for production readiness
