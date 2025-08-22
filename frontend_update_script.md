# Frontend Update Guide for Event Creation

## Current Issue
The frontend is calling the `create-event` edge function but may not be handling the new response format that includes ticket tiers.

## Frontend Changes Needed

### 1. Update Event Creation Response Handling

Find the component that calls the edge function (likely `EventCreationWizard.tsx`) and update the response handling:

```typescript
// OLD CODE (if it exists):
const response = await supabase.functions.invoke('create-event', {
  body: eventData
});

// NEW CODE:
const response = await supabase.functions.invoke('create-event', {
  body: eventData
});

if (response.data.success) {
  const { event, ticket_tiers } = response.data;
  
  // Handle the event
  console.log('Event created:', event);
  
  // Handle the ticket tiers
  if (ticket_tiers && ticket_tiers.length > 0) {
    console.log('Ticket tiers created:', ticket_tiers);
    // You can now display pricing info or redirect to ticket management
  }
  
  // Navigate to event page or show success message
  navigate(`/events/${event.slug}`);
} else {
  console.error('Event creation failed:', response.data.error);
}
```

### 2. Update Event Type Definitions

Add ticket tier types to your TypeScript definitions:

```typescript
// Add to your types file
export interface TicketTier {
  id: string;
  name: string;
  price_cents: number;
  currency: string;
  unlocks_access_level: string;
}

export interface CreateEventResponse {
  success: boolean;
  event: {
    id: string;
    title: string;
    slug: string;
    start_at: string;
    venue: string;
    category: string;
  };
  ticket_tiers: TicketTier[];
}
```

### 3. Update Success Handling

If you want to show ticket pricing after event creation:

```typescript
// After successful event creation
if (response.data.success) {
  const { event, ticket_tiers } = response.data;
  
  // Show success message with pricing info
  if (ticket_tiers.length > 0) {
    const pricingInfo = ticket_tiers.map(tier => 
      `${tier.name}: $${(tier.price_cents / 100).toFixed(2)} ${tier.currency}`
    ).join(', ');
    
    showSuccessMessage(`Event created successfully! Ticket pricing: ${pricingInfo}`);
  } else {
    showSuccessMessage('Event created successfully!');
  }
}
```

## Files to Update

1. **EventCreationWizard.tsx** - Update the handleSubmit function
2. **types/index.ts** - Add new type definitions
3. **Any success/error handling components** - Update to show ticket info

## Testing

After making these changes:

1. Deploy the updated edge function
2. Test creating an event with ticket tiers
3. Verify the response includes both event and ticket data
4. Check that the frontend displays the information correctly

## No Breaking Changes

The good news is that the edge function maintains backward compatibility:
- If no ticket tiers are provided, it still creates the event
- The response structure is enhanced but doesn't break existing code
- The `success` field remains the same
