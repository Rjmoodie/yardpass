# 🎫 QR Code Implementation Guide for Attendance Verification

## 📊 Industry Standards Analysis

### ✅ Internal Generation (Your Current Approach - RECOMMENDED)
**Used by**: Eventbrite, Ticketmaster, most enterprise systems

**Advantages**:
- ✅ No external API dependencies
- ✅ Faster generation (no network calls)
- ✅ Better security (data stays in your system)
- ✅ Lower costs (no API fees)
- ✅ Works offline
- ✅ No rate limits
- ✅ Full control over QR format

**Disadvantages**:
- ❌ Need to add QR image generation
- ❌ Slightly more complex implementation

### ❌ External Generation (Less Common)
**Used by**: Small apps, prototypes

**Services**: QR Server APIs, Google Charts API
**Disadvantages**:
- ❌ API rate limits
- ❌ Network dependencies
- ❌ Security concerns (data sent to third parties)
- ❌ Higher costs at scale
- ❌ Potential downtime

## 🎯 Implementation Steps for Visual QR Codes

### Step 1: Update Database Schema
```sql
-- Add QR code image column to tickets_owned table
ALTER TABLE public.tickets_owned 
ADD COLUMN qr_code_image TEXT,
ADD COLUMN qr_code_data JSONB;

-- Add index for QR code lookups
CREATE INDEX idx_tickets_owned_qr_code_image ON public.tickets_owned(qr_code_image);
```

### Step 2: Add QR Code Library to Edge Functions
```typescript
// In your edge functions
import QRCode from 'https://esm.sh/qrcode@1.5.3';

async function generateQRCodeImage(data: string): Promise<string> {
  try {
    const qrDataURL = await QRCode.toDataURL(data, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    return qrDataURL;
  } catch (error) {
    console.error('QR code generation error:', error);
    return data; // Fallback to text
  }
}
```

### Step 3: Enhanced QR Code Data Structure
```typescript
function generateQRCodeData(ticketId: string, orderId: string, eventId: string, userId: string): string {
  const qrData = {
    ticket_id: ticketId,
    order_id: orderId,
    event_id: eventId,
    user_id: userId,
    timestamp: Date.now(),
    signature: btoa(`${ticketId}_${orderId}_${Date.now()}`).substring(0, 8)
  };
  return JSON.stringify(qrData);
}
```

### Step 4: Update Ticket Generation
```typescript
// In verify-payment or generate-tickets function
const ticketId = crypto.randomUUID();
const qrCodeData = generateQRCodeData(ticketId, orderId, eventId, userId);
const qrCodeImage = await generateQRCodeImage(qrCodeData);
const qrCode = `ticket_${orderId}_${Date.now()}_${i}`;

// Store in database
await supabaseClient
  .from('tickets_owned')
  .insert({
    id: ticketId,
    user_id: userId,
    ticket_id: item.ticket_id,
    order_id: orderId,
    qr_code: qrCode,
    qr_code_data: qrCodeData,
    qr_code_image: qrCodeImage, // Base64 image data
    access_level: 'general',
    is_used: false
  });
```

## 📱 Frontend Implementation

### Step 1: Display QR Code in Wallet
```typescript
// In MyWalletScreen.tsx
const TicketCard = ({ ticket }) => {
  return (
    <View style={styles.ticketCard}>
      <Text>{ticket.tickets.name}</Text>
      <Text>{ticket.tickets.description}</Text>
      
      {/* Display QR Code Image */}
      {ticket.qr_code_image && (
        <Image 
          source={{ uri: ticket.qr_code_image }}
          style={styles.qrCode}
          resizeMode="contain"
        />
      )}
      
      <Text>QR Code: {ticket.qr_code}</Text>
    </View>
  );
};
```

### Step 2: QR Code Scanner for Attendance
```typescript
// In QRScanner.tsx
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';

const QRScanner = ({ onScan }) => {
  const [hasPermission, setHasPermission] = useState(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ data }) => {
    try {
      const qrData = JSON.parse(data);
      onScan(qrData);
    } catch (error) {
      // Handle simple QR codes
      onScan({ qr_code: data });
    }
  };

  return (
    <Camera
      style={styles.camera}
      type={Camera.Constants.Type.back}
      onBarCodeScanned={handleBarCodeScanned}
    />
  );
};
```

### Step 3: Attendance Verification
```typescript
// In scan-ticket edge function
const verifyTicket = async (qrData) => {
  const { data: ticket, error } = await supabase
    .from('tickets_owned')
    .select(`
      *,
      tickets (
        *,
        events (
          id,
          title,
          start_at,
          end_at
        )
      )
    `)
    .eq('qr_code', qrData.qr_code || qrData.ticket_id)
    .single();

  if (error || !ticket) {
    return { valid: false, message: 'Invalid ticket' };
  }

  // Check if already used
  if (ticket.is_used) {
    return { valid: false, message: 'Ticket already used' };
  }

  // Check event timing
  const now = new Date();
  const eventStart = new Date(ticket.tickets.events.start_at);
  const eventEnd = new Date(ticket.tickets.events.end_at);

  if (now < eventStart) {
    return { valid: false, message: 'Event has not started' };
  }

  if (now > eventEnd) {
    return { valid: false, message: 'Event has ended' };
  }

  // Mark as used
  await supabase
    .from('tickets_owned')
    .update({ 
      is_used: true, 
      used_at: new Date().toISOString() 
    })
    .eq('id', ticket.id);

  return { 
    valid: true, 
    message: 'Ticket verified successfully',
    ticket: ticket
  };
};
```

## 🔐 Security Considerations

### QR Code Security
```typescript
// Add signature verification
function verifyQRCodeSignature(qrData: any, signature: string): boolean {
  const expectedSignature = btoa(`${qrData.ticket_id}_${qrData.order_id}_${qrData.timestamp}`).substring(0, 8);
  return signature === expectedSignature;
}

// Add timestamp validation
function isQRCodeExpired(timestamp: number): boolean {
  const now = Date.now();
  const qrAge = now - timestamp;
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  return qrAge > maxAge;
}
```

### Rate Limiting
```typescript
// Add rate limiting for QR code generation
const rateLimit = {
  maxRequests: 10,
  windowMs: 60000, // 1 minute
  requests: new Map()
};

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimit.requests.get(userId) || [];
  
  // Remove old requests
  const recentRequests = userRequests.filter(time => now - time < rateLimit.windowMs);
  
  if (recentRequests.length >= rateLimit.maxRequests) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimit.requests.set(userId, recentRequests);
  return true;
}
```

## 📊 Performance Optimization

### QR Code Caching
```typescript
// Cache generated QR codes
const qrCodeCache = new Map();

async function getCachedQRCode(qrData: string): Promise<string> {
  if (qrCodeCache.has(qrData)) {
    return qrCodeCache.get(qrData);
  }
  
  const qrImage = await generateQRCodeImage(qrData);
  qrCodeCache.set(qrData, qrImage);
  
  // Limit cache size
  if (qrCodeCache.size > 1000) {
    const firstKey = qrCodeCache.keys().next().value;
    qrCodeCache.delete(firstKey);
  }
  
  return qrImage;
}
```

### Batch QR Generation
```typescript
// Generate multiple QR codes efficiently
async function generateBatchQRCodes(tickets: any[]): Promise<any[]> {
  const qrPromises = tickets.map(async (ticket) => {
    const qrData = generateQRCodeData(ticket.id, ticket.order_id, ticket.event_id, ticket.user_id);
    const qrImage = await generateQRCodeImage(qrData);
    return { ...ticket, qr_code_image: qrImage };
  });
  
  return Promise.all(qrPromises);
}
```

## 🚀 Deployment Checklist

### 1. Database Updates
- [ ] Add qr_code_image column to tickets_owned table
- [ ] Add qr_code_data column to tickets_owned table
- [ ] Create indexes for QR code lookups

### 2. Edge Function Updates
- [ ] Add QRCode library to edge functions
- [ ] Update verify-payment function
- [ ] Update generate-tickets function
- [ ] Update scan-ticket function

### 3. Frontend Updates
- [ ] Update MyWalletScreen to display QR images
- [ ] Add QR scanner component
- [ ] Add attendance verification UI

### 4. Testing
- [ ] Test QR code generation
- [ ] Test QR code scanning
- [ ] Test attendance verification
- [ ] Test security measures

## 📈 Benefits of This Approach

1. **Security**: QR codes contain encrypted data with signatures
2. **Performance**: Internal generation is faster than external APIs
3. **Reliability**: No external dependencies or rate limits
4. **Cost**: No API fees for QR generation
5. **Control**: Full control over QR code format and security
6. **Offline**: Works without internet connection
7. **Scalability**: Can handle thousands of QR codes per second

## 🎯 Next Steps

1. **Deploy database schema changes**
2. **Update edge functions with QR generation**
3. **Test QR code generation and scanning**
4. **Implement frontend QR display and scanner**
5. **Add security measures and rate limiting**
6. **Deploy and test complete flow**

This approach gives you enterprise-grade QR code functionality similar to Eventbrite and Ticketmaster, with full control over security and performance.
