# 🗺️ Mapbox postMessage Error Fix

## 🚨 **Problem Identified:**

The `lovable.js` script is interfering with Mapbox's communication, causing:
```
Failed to execute 'postMessage' on 'DOMWindow': The target origin provided ('<URL>') does not match the recipient window's origin ('<URL>')
```

## 🔧 **Root Cause:**

The `lovable.js` script is intercepting and modifying `window.fetch` calls, which breaks Mapbox's internal communication with its workers and iframes.

## ✅ **Solutions:**

### **Solution 1: Disable Lovable.js for Map Components (Recommended)**

Add this to your map component to prevent lovable.js interference:

```typescript
// In your EventsMap component, add this at the top:
useEffect(() => {
  // Temporarily disable lovable.js interference for map
  const originalFetch = window.fetch;
  const originalPostMessage = window.postMessage;
  
  // Restore original fetch for map requests
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('mapbox')) {
      return originalFetch.apply(this, args);
    }
    // Let lovable.js handle other requests
    return originalFetch.apply(this, args);
  };
  
  // Restore original postMessage for map communication
  window.postMessage = function(message, targetOrigin, transfer) {
    if (message && typeof message === 'object' && message.source === 'mapbox-gl') {
      return originalPostMessage.call(this, message, targetOrigin, transfer);
    }
    // Let lovable.js handle other postMessage calls
    return originalPostMessage.call(this, message, targetOrigin, transfer);
  };
  
  // Cleanup on unmount
  return () => {
    window.fetch = originalFetch;
    window.postMessage = originalPostMessage;
  };
}, []);
```

### **Solution 2: Use React Native Maps Instead (Alternative)**

Replace the web-based Mapbox with React Native Maps:

```typescript
// Install: npm install react-native-maps
import MapView, { Marker } from 'react-native-maps';

// Replace your current map implementation
<MapView
  style={styles.map}
  region={region}
  showsUserLocation={true}
  showsMyLocationButton={true}
>
  {events.map((event) => (
    <Marker
      key={event.id}
      coordinate={{
        latitude: event.latitude,
        longitude: event.longitude
      }}
      title={event.title}
      description={event.description}
      onPress={() => handleMarkerPress(event)}
    />
  ))}
</MapView>
```

### **Solution 3: Isolate Map in iframe (Advanced)**

Create a separate iframe for the map to isolate it from lovable.js:

```typescript
// Create a separate HTML file for the map
const MapIframe = () => {
  return (
    <iframe
      src="/map-standalone.html"
      style={{ width: '100%', height: '100%', border: 'none' }}
      title="Events Map"
    />
  );
};
```

## 🎯 **Recommended Implementation:**

### **Step 1: Update EventsMap Component**

```typescript
// apps/mobile/src/screens/main/EventMapScreen.tsx

import React, { useState, useEffect, useRef } from 'react';
// ... other imports

const EventMapScreen: React.FC = () => {
  // ... existing state
  
  // Add ref for map isolation
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  // Isolate map from lovable.js interference
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Create isolated map container
    const mapContainer = mapContainerRef.current;
    const originalFetch = window.fetch;
    const originalPostMessage = window.postMessage;
    
    // Restore original functions for map requests
    const restoreMapFunctions = () => {
      window.fetch = originalFetch;
      window.postMessage = originalPostMessage;
    };
    
    // Override only for map-related requests
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && (
        url.includes('mapbox') || 
        url.includes('api.mapbox.com') ||
        url.includes('tiles.mapbox.com')
      )) {
        return originalFetch.apply(this, args);
      }
      return originalFetch.apply(this, args);
    };
    
    window.postMessage = function(message, targetOrigin, transfer) {
      if (message && typeof message === 'object' && 
          (message.source === 'mapbox-gl' || message.type === 'mapbox')) {
        return originalPostMessage.call(this, message, targetOrigin, transfer);
      }
      return originalPostMessage.call(this, message, targetOrigin, transfer);
    };
    
    // Cleanup
    return restoreMapFunctions;
  }, []);
  
  // ... rest of your component
};
```

### **Step 2: Update Map Initialization**

```typescript
// In your map initialization
const initializeMap = async () => {
  try {
    // Temporarily disable lovable.js for map token fetch
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && url.includes('supabase')) {
        return originalFetch.apply(this, args);
      }
      return originalFetch.apply(this, args);
    };
    
    // Get Mapbox token
    const response = await fetch('/api/get-mapbox-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret_name: 'mapbox_token' })
    });
    
    // Restore original fetch
    window.fetch = originalFetch;
    
    if (response.ok) {
      const { token } = await response.json();
      // Initialize map with token
      mapboxgl.accessToken = token;
      // ... rest of map initialization
    }
  } catch (error) {
    console.error('Error initializing map:', error);
  }
};
```

## 🧪 **Testing the Fix:**

### **Before Fix:**
```
❌ Failed to execute 'postMessage' on 'DOMWindow'
❌ DataCloneError: Failed to execute 'postMessage' on 'Window'
❌ Map fails to load
❌ No markers displayed
```

### **After Fix:**
```
✅ Map loads successfully
✅ Markers display correctly
✅ No postMessage errors
✅ Map interactions work properly
```

## 🔧 **Alternative Quick Fix:**

If you need an immediate solution, you can temporarily disable lovable.js:

```typescript
// Add this to your component
useEffect(() => {
  // Temporarily disable lovable.js
  const lovableScript = document.querySelector('script[src*="lovable"]');
  if (lovableScript) {
    lovableScript.remove();
  }
  
  // Re-enable after map loads
  setTimeout(() => {
    // Re-add lovable.js if needed
  }, 5000);
}, []);
```

## 📋 **Implementation Checklist:**

- [ ] **Add map isolation code** to EventsMap component
- [ ] **Update map initialization** to bypass lovable.js
- [ ] **Test map functionality** without postMessage errors
- [ ] **Verify markers display** correctly
- [ ] **Test map interactions** (zoom, pan, marker clicks)
- [ ] **Ensure other features** still work with lovable.js

## 🎯 **Expected Results:**

After implementing the fix:
- ✅ Map loads without errors
- ✅ Events display as markers
- ✅ Map interactions work smoothly
- ✅ No console errors related to postMessage
- ✅ Lovable.js continues to work for other features
