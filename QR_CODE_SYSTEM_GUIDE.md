# 🎫 Complete QR Code Attendance System Guide

## 📋 System Overview

This guide covers the complete QR code system for smooth attendance processing, from ticket generation to scanning and verification.

## 🔄 Order Flow with QR Generation

### 1. Payment Completion → QR Generation
```
Payment Success → verify-payment function → Generate QR Codes → Store in Database
```

### 2. QR Code Structure
```typescript
// QR Code Data (JSON)
{
  ticket_id: "uuid",
  order_id: "uuid", 
  event_id: "uuid",
  user_id: "uuid",
  timestamp: 1234567890,
  signature: "abc12345"
}

// QR Code Image (Base64)
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...

// QR Code String (Database lookup)
ticket_order123_1234567890_1
```

## 🗄️ Database Schema Updates

### tickets_owned Table
```sql
ALTER TABLE public.tickets_owned 
ADD COLUMN qr_code_image TEXT, -- Base64 QR image
ADD COLUMN qr_code_data JSONB; -- Structured QR data

-- Indexes for performance
CREATE INDEX idx_tickets_owned_qr_code_image ON public.tickets_owned(qr_code_image);
CREATE INDEX idx_tickets_owned_qr_code_data ON public.tickets_owned USING GIN(qr_code_data);
```

## 🔧 Edge Functions

### 1. verify-payment (Updated)
- ✅ Generates visual QR codes
- ✅ Creates structured QR data
- ✅ Stores both image and data
- ✅ Handles payment verification

### 2. scan-ticket (Updated)
- ✅ Validates QR codes
- ✅ Checks permissions
- ✅ Verifies signatures
- ✅ Handles attendance marking
- ✅ Creates check-in records

## 📱 Frontend Components

### QR Scanner Component
```typescript
// src/components/QRScanner.tsx
interface QRScannerProps {
  eventId: string;
  onScanSuccess: (result: any) => void;
  onScanError: (error: string) => void;
  onClose: () => void;
  isVisible: boolean;
}
```

### Ticket Display Component
```typescript
// src/components/TicketCard.tsx
interface TicketCardProps {
  ticket: {
    id: string;
    qr_code_image: string;
    qr_code_data: any;
    access_level: string;
    tickets: {
      name: string;
      description: string;
    };
  };
}
```

## 🔐 Security Features

### QR Code Security
1. **Signature Verification**: Each QR code has a unique signature
2. **Timestamp Validation**: QR codes expire after 24 hours
3. **Event Validation**: QR codes are tied to specific events
4. **Permission Checks**: Only authorized scanners can scan

### Scanner Permissions
- Event creators
- Organization admins/owners
- Assigned event scanners

## 📊 Scanning Process

### 1. Scanner Authentication
```typescript
// Check scanner permissions
const hasPermission = await checkScannerPermissions(user.id, eventId);
```

### 2. QR Code Validation
```typescript
// Verify QR code data
const qrData = JSON.parse(qrCodeString);
const isValid = verifySignature(qrData);
const isExpired = checkTimestamp(qrData.timestamp);
```

### 3. Ticket Verification
```typescript
// Check ticket status
const ticket = await getTicketByQRCode(qrCode);
if (ticket.is_used) return "Already used";
if (now < eventStart) return "Event not started";
if (now > eventEnd) return "Event ended";
```

### 4. Attendance Marking
```typescript
// Mark ticket as used
await updateTicketStatus(ticketId, { is_used: true, used_at: now });

// Create check-in record
await createCheckin({
  tickets_owned_id: ticketId,
  scanned_by: scannerId,
  location: scannerLocation,
  metadata: { device_info, scan_timestamp }
});
```

## 🎯 Implementation Steps

### Step 1: Database Migration
```sql
-- Run these SQL commands
ALTER TABLE public.tickets_owned 
ADD COLUMN qr_code_image TEXT,
ADD COLUMN qr_code_data JSONB;

CREATE INDEX idx_tickets_owned_qr_code_image ON public.tickets_owned(qr_code_image);
CREATE INDEX idx_tickets_owned_qr_code_data ON public.tickets_owned USING GIN(qr_code_data);
```

### Step 2: Deploy Edge Functions
```bash
# Deploy updated functions
supabase functions deploy verify-payment
supabase functions deploy scan-ticket
```

### Step 3: Update Frontend
```bash
# Add QR scanner component
# Update ticket display components
# Add scanning interface for organizers
```

### Step 4: Test Complete Flow
1. Purchase ticket
2. Verify QR code generation
3. Test QR code scanning
4. Verify attendance marking
5. Check analytics

## 📈 Benefits

### For Attendees
- ✅ Visual QR codes in wallet
- ✅ Fast entry process
- ✅ No paper tickets needed
- ✅ Secure verification

### For Organizers
- ✅ Real-time attendance tracking
- ✅ Fraud prevention
- ✅ Analytics and insights
- ✅ Multiple scanner support

### For System
- ✅ Scalable architecture
- ✅ Offline capability
- ✅ Security features
- ✅ Performance optimized

## 🚀 Next Steps

1. **Deploy database changes**
2. **Update edge functions**
3. **Create frontend components**
4. **Test complete flow**
5. **Add analytics dashboard**
6. **Implement scanner app**

This system provides enterprise-grade QR code functionality similar to Eventbrite and Ticketmaster!
