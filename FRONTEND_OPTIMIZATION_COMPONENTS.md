# 🎨 **Frontend Optimization Components**

## 🔧 **React Native Performance Optimizations**

### **1. 🛒 Cart Expiration Handler**
```typescript
// hooks/useCartExpiration.ts
import { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { clearExpiredCart } from '../store/cartSlice';

export const useCartExpiration = (cartId: string, expiresAt: Date) => {
  const dispatch = useDispatch();
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const now = new Date();
    const expirationTime = new Date(expiresAt);
    const timeUntilExpiration = expirationTime.getTime() - now.getTime();

    if (timeUntilExpiration > 0) {
      timeoutRef.current = setTimeout(() => {
        dispatch(clearExpiredCart(cartId));
      }, timeUntilExpiration);
    } else {
      dispatch(clearExpiredCart(cartId));
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [cartId, expiresAt, dispatch]);
};
```

### **2. 🔍 Search Result Caching**
```typescript
// hooks/useSearchCache.ts
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SearchCache {
  query: string;
  results: any[];
  timestamp: number;
  expiresAt: number;
}

export const useSearchCache = () => {
  const [cache, setCache] = useState<Map<string, SearchCache>>(new Map());

  const getCachedResults = useCallback(async (query: string): Promise<any[] | null> => {
    try {
      const cached = await AsyncStorage.getItem(`search_${query}`);
      if (cached) {
        const data: SearchCache = JSON.parse(cached);
        if (Date.now() < data.expiresAt) {
          return data.results;
        } else {
          await AsyncStorage.removeItem(`search_${query}`);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached results:', error);
      return null;
    }
  }, []);

  const cacheResults = useCallback(async (query: string, results: any[]) => {
    try {
      const cacheData: SearchCache = {
        query,
        results,
        timestamp: Date.now(),
        expiresAt: Date.now() + (15 * 60 * 1000) // 15 minutes
      };
      await AsyncStorage.setItem(`search_${query}`, JSON.stringify(cacheData));
      setCache(prev => new Map(prev.set(query, cacheData)));
    } catch (error) {
      console.error('Error caching results:', error);
    }
  }, []);

  return { getCachedResults, cacheResults };
};
```

### **3. 📜 Virtualized Feed Component**
```typescript
// components/VirtualizedFeed.tsx
import React, { useCallback, useMemo } from 'react';
import { FlatList, View, Text, ActivityIndicator } from 'react-native';
import { useInfiniteQuery } from '@tanstack/react-query';
import { PostCard } from './PostCard';

interface FeedItem {
  id: string;
  content: string;
  media_urls: string[];
  event_id?: string;
  event_title?: string;
  user_id: string;
  user_name: string;
  user_avatar?: string;
  created_at: string;
}

export const VirtualizedFeed: React.FC = () => {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error
  } = useInfiniteQuery({
    queryKey: ['feed'],
    queryFn: async ({ pageParam = 0 }) => {
      const response = await fetch(`/api/feed?page=${pageParam}&size=20`);
      return response.json();
    },
    getNextPageParam: (lastPage, pages) => {
      return lastPage.hasMore ? pages.length : undefined;
    },
  });

  const feedData = useMemo(() => {
    return data?.pages.flatMap(page => page.data) ?? [];
  }, [data]);

  const renderItem = useCallback(({ item }: { item: FeedItem }) => (
    <PostCard post={item} />
  ), []);

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isFetchingNextPage) return null;
    return (
      <View style={{ padding: 20 }}>
        <ActivityIndicator size="small" />
      </View>
    );
  }, [isFetchingNextPage]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Error loading feed</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={feedData}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      onEndReached={handleLoadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={renderFooter}
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={10}
      getItemLayout={(data, index) => ({
        length: 200, // Approximate item height
        offset: 200 * index,
        index,
      })}
    />
  );
};
```

### **4. 🖼️ Optimized Image Upload**
```typescript
// hooks/useImageUpload.ts
import { useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

interface ImageUploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
}

export const useImageUpload = () => {
  const [uploadState, setUploadState] = useState<ImageUploadState>({
    uploading: false,
    progress: 0,
    error: null,
  });

  const compressImage = useCallback(async (uri: string): Promise<string> => {
    try {
      const result = await manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      return result.uri;
    } catch (error) {
      console.error('Error compressing image:', error);
      return uri;
    }
  }, []);

  const uploadImages = useCallback(async (images: string[], batchId?: string) => {
    setUploadState({ uploading: true, progress: 0, error: null });

    try {
      const compressedImages = await Promise.all(
        images.map(image => compressImage(image))
      );

      const formData = new FormData();
      compressedImages.forEach((image, index) => {
        formData.append('images', {
          uri: image,
          type: 'image/jpeg',
          name: `image_${index}.jpg`,
        } as any);
      });

      if (batchId) {
        formData.append('batchId', batchId);
      }

      const response = await fetch('/api/upload-images', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();
      setUploadState({ uploading: false, progress: 100, error: null });
      return result;
    } catch (error) {
      setUploadState({ uploading: false, progress: 0, error: error.message });
      throw error;
    }
  }, [compressImage]);

  return { uploadImages, uploadState };
};
```

### **5. 💾 Draft Auto-Save Hook**
```typescript
// hooks/useDraftAutoSave.ts
import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';

interface DraftData {
  title?: string;
  content?: string;
  media?: string[];
  [key: string]: any;
}

export const useDraftAutoSave = (draftType: string, initialData?: DraftData) => {
  const [draft, setDraft] = useState<DraftData>(initialData || {});
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const saveDraft = useCallback(async (data: DraftData) => {
    try {
      setSaving(true);
      const draftKey = `draft_${draftType}`;
      await AsyncStorage.setItem(draftKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving draft:', error);
    } finally {
      setSaving(false);
    }
  }, [draftType]);

  const debouncedSave = useCallback(
    debounce((data: DraftData) => saveDraft(data), 2000),
    [saveDraft]
  );

  const loadDraft = useCallback(async () => {
    try {
      const draftKey = `draft_${draftType}`;
      const saved = await AsyncStorage.getItem(draftKey);
      if (saved) {
        const { data, timestamp } = JSON.parse(saved);
        // Only load drafts from last 24 hours
        if (Date.now() - timestamp < 24 * 60 * 60 * 1000) {
          setDraft(data);
          setLastSaved(new Date(timestamp));
        } else {
          await AsyncStorage.removeItem(draftKey);
        }
      }
    } catch (error) {
      console.error('Error loading draft:', error);
    }
  }, [draftType]);

  const updateDraft = useCallback((updates: Partial<DraftData>) => {
    const newDraft = { ...draft, ...updates };
    setDraft(newDraft);
    debouncedSave(newDraft);
  }, [draft, debouncedSave]);

  const clearDraft = useCallback(async () => {
    try {
      const draftKey = `draft_${draftType}`;
      await AsyncStorage.removeItem(draftKey);
      setDraft({});
      setLastSaved(null);
    } catch (error) {
      console.error('Error clearing draft:', error);
    }
  }, [draftType]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    draft,
    updateDraft,
    clearDraft,
    saving,
    lastSaved,
  };
};
```

### **6. 📍 Location Caching Hook**
```typescript
// hooks/useLocationCache.ts
import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LocationData {
  coordinates: { lat: number; lng: number };
  formatted_address: string;
  timestamp: number;
}

export const useLocationCache = () => {
  const [cache, setCache] = useState<Map<string, LocationData>>(new Map());

  const getCachedLocation = useCallback(async (query: string): Promise<LocationData | null> => {
    try {
      const cached = await AsyncStorage.getItem(`location_${query}`);
      if (cached) {
        const data: LocationData = JSON.parse(cached);
        // Cache for 24 hours
        if (Date.now() - data.timestamp < 24 * 60 * 60 * 1000) {
          return data;
        } else {
          await AsyncStorage.removeItem(`location_${query}`);
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting cached location:', error);
      return null;
    }
  }, []);

  const cacheLocation = useCallback(async (query: string, location: Omit<LocationData, 'timestamp'>) => {
    try {
      const locationData: LocationData = {
        ...location,
        timestamp: Date.now(),
      };
      await AsyncStorage.setItem(`location_${query}`, JSON.stringify(locationData));
      setCache(prev => new Map(prev.set(query, locationData)));
    } catch (error) {
      console.error('Error caching location:', error);
    }
  }, []);

  return { getCachedLocation, cacheLocation };
};
```

### **7. 📊 Performance Monitoring Hook**
```typescript
// hooks/usePerformanceMonitor.ts
import { useCallback } from 'react';

interface PerformanceMetric {
  type: string;
  name: string;
  value: number;
  metadata?: Record<string, any>;
}

export const usePerformanceMonitor = () => {
  const logMetric = useCallback(async (metric: PerformanceMetric) => {
    try {
      await fetch('/api/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(metric),
      });
    } catch (error) {
      console.error('Error logging performance metric:', error);
    }
  }, []);

  const measureTime = useCallback(async (name: string, fn: () => Promise<any>) => {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      await logMetric({
        type: 'api_response',
        name,
        value: duration,
      });
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      await logMetric({
        type: 'api_error',
        name,
        value: duration,
        metadata: { error: error.message },
      });
      throw error;
    }
  }, [logMetric]);

  return { logMetric, measureTime };
};
```

## 🎯 **Implementation Guide**

### **Step 1: Install Dependencies**
```bash
npm install @react-native-async-storage/async-storage lodash expo-image-manipulator
```

### **Step 2: Update Components**
- Replace regular lists with `VirtualizedFeed`
- Add `useCartExpiration` to cart components
- Implement `useSearchCache` in search components
- Add `useDraftAutoSave` to form components

### **Step 3: Performance Monitoring**
- Add `usePerformanceMonitor` to track API calls
- Implement image optimization with `useImageUpload`
- Add location caching with `useLocationCache`

### **Step 4: Testing**
- Test virtualized lists with large datasets
- Verify cart expiration works correctly
- Check search caching improves performance
- Validate draft auto-save functionality

**These optimizations should significantly improve the efficiency scores identified in the report!** 🚀
