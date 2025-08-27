# Frontend Updates for Enhanced Search & Discovery

## Overview
This document outlines the necessary frontend updates to integrate the new enhanced search and discovery functions.

## 1. API Gateway Updates ✅ COMPLETED

The `packages/api/src/gateway.ts` has been updated with:
- Enhanced search function with advanced filtering
- Discover feed function with personalized recommendations
- Updated parameter interfaces for better type safety

## 2. Search Screen Updates

### File: `apps/mobile/src/screens/main/SearchScreen.tsx`

#### Current Issues:
- Uses old search API with limited functionality
- No support for advanced filtering
- No search suggestions or trending searches
- No facets or related searches

#### Required Updates:

```typescript
// Update the search function call
const debouncedSearch = useMemo(
  () => debounce(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    const startTime = performance.now();

    try {
      // ✅ NEW: Use enhanced search with advanced features
      const response = await apiGateway.search({
        q: query,
        types: activeTab === 'all' ? ['events', 'organizations', 'users', 'posts'] : [activeTab],
        limit: 20,
        sort_by: 'relevance',
        // Add optional filters
        category: selectedCategory,
        location: userLocation,
        radius_km: 50,
        verified_only: showVerifiedOnly,
        include_past_events: includePastEvents
      });
      
      if (response.error) {
        console.error('Search error:', response.error.message);
        return;
      }
      
      const searchResponse = response.data;

      if (searchResponse) {
        // ✅ NEW: Enhanced results with suggestions, trending, facets
        setSearchResults(searchResponse.results.events || []);
        setSuggestions(searchResponse.suggestions || []);
        setTrendingSearches(searchResponse.trending || []);
        setSearchFacets(searchResponse.meta.facets || {});
        setRelatedSearches(searchResponse.related_searches || []);
        setShowResults(true);

        // ✅ TRACK: Enhanced search analytics
        const searchTime = performance.now() - startTime;
        setSearchAnalytics({
          query,
          resultsCount: searchResponse.results.events.length,
          searchTime: Math.round(searchTime),
          filtersApplied: searchResponse.filters_applied
        });
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to perform search. Please try again.');
    } finally {
      setIsSearching(false);
    }
  }, 300),
  [activeTab, selectedCategory, userLocation, showVerifiedOnly, includePastEvents]
);
```

#### New State Variables to Add:
```typescript
const [searchFacets, setSearchFacets] = useState<any>({});
const [relatedSearches, setRelatedSearches] = useState<string[]>([]);
const [trendingSearches, setTrendingSearches] = useState<any[]>([]);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [userLocation, setUserLocation] = useState<string | null>(null);
const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
const [includePastEvents, setIncludePastEvents] = useState(false);
```

#### New UI Components to Add:
```typescript
// Search Facets Component
const SearchFacets = () => (
  <View style={styles.facetsContainer}>
    {searchFacets.categories?.map((category: any) => (
      <TouchableOpacity
        key={category.name}
        style={[
          styles.facetChip,
          selectedCategory === category.name && styles.facetChipSelected
        ]}
        onPress={() => setSelectedCategory(
          selectedCategory === category.name ? null : category.name
        )}
      >
        <Text style={styles.facetText}>
          {category.name} ({category.count})
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

// Related Searches Component
const RelatedSearches = () => (
  <View style={styles.relatedSearchesContainer}>
    <Text style={styles.sectionTitle}>Related Searches</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {relatedSearches.map((search, index) => (
        <TouchableOpacity
          key={index}
          style={styles.relatedSearchChip}
          onPress={() => {
            setSearchQuery(search);
            debouncedSearch(search);
          }}
        >
          <Text style={styles.relatedSearchText}>{search}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  </View>
);
```

## 3. Discover Screen Updates

### File: `apps/mobile/src/screens/main/DiscoverScreen.tsx`

#### Current Issues:
- Uses basic event listing
- No personalized recommendations
- No trending events
- No location-based discovery

#### Required Updates:

```typescript
// Update the discover feed function
const loadDiscoverFeed = useCallback(async () => {
  try {
    setIsLoading(true);
    
    // ✅ NEW: Use enhanced discover feed
    const response = await apiGateway.getDiscoverFeed({
      user_id: user?.id,
      location: userLocation,
      radius_km: 50,
      categories: selectedCategories,
      limit: 20,
      include_trending: true,
      include_recommendations: true,
      include_nearby: true,
      include_following: true
    });

    if (response.error) {
      console.error('Discover feed error:', response.error.message);
      return;
    }

    const discoverData = response.data;
    
    // ✅ NEW: Set different types of events
    setTrendingEvents(discoverData.trending_events || []);
    setRecommendedEvents(discoverData.recommended_events || []);
    setNearbyEvents(discoverData.nearby_events || []);
    setFollowingEvents(discoverData.following_events || []);
    setDiscoverInsights(discoverData.insights || {});
    
  } catch (error) {
    console.error('Discover feed error:', error);
  } finally {
    setIsLoading(false);
  }
}, [user?.id, userLocation, selectedCategories]);
```

#### New State Variables to Add:
```typescript
const [trendingEvents, setTrendingEvents] = useState<Event[]>([]);
const [recommendedEvents, setRecommendedEvents] = useState<Event[]>([]);
const [nearbyEvents, setNearbyEvents] = useState<Event[]>([]);
const [followingEvents, setFollowingEvents] = useState<Event[]>([]);
const [discoverInsights, setDiscoverInsights] = useState<any>({});
const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
```

## 4. Home Screen Updates

### File: `apps/mobile/src/screens/main/HomeScreen.tsx`

#### Update Feed Loading:
```typescript
// Update the feed loading to use discover feed
const loadFeed = useCallback(async () => {
  try {
    setHasError(false);
    
    // ✅ NEW: Use discover feed for personalized content
    const response = await apiGateway.getDiscoverFeed({
      user_id: user?.id,
      location: userLocation,
      radius_km: 50,
      limit: 20,
      include_trending: true,
      include_recommendations: true,
      include_nearby: true,
      include_following: true
    });

    if (response.error) {
      throw new Error(response.error.message);
    }

    const discoverData = response.data;
    
    // Combine all event types for the feed
    const allEvents = [
      ...discoverData.recommended_events,
      ...discoverData.trending_events,
      ...discoverData.nearby_events,
      ...discoverData.following_events
    ];

    // Remove duplicates and sort by relevance
    const uniqueEvents = allEvents.filter((event, index, self) => 
      index === self.findIndex(e => e.id === event.id)
    );

    setFeedItems(uniqueEvents);
    
  } catch (error) {
    console.error('Error loading feed:', error);
    setHasError(true);
  }
}, [user?.id, userLocation]);
```

## 5. Type Definitions Updates

### File: `packages/types/src/api.ts`

#### Add New Interfaces:
```typescript
// Enhanced Search Response
export interface EnhancedSearchResponse {
  query: string;
  results: {
    events: Event[];
    organizations: Organization[];
    users: User[];
    posts: Post[];
  };
  meta: {
    total: number;
    search_time_ms: number;
    has_more: boolean;
    facets: {
      categories: { name: string; count: number }[];
      locations: { name: string; count: number }[];
      price_ranges: { range: string; count: number }[];
      dates: { range: string; count: number }[];
    };
  };
  suggestions?: string[];
  trending?: any[];
  related_searches?: string[];
  filters_applied?: any;
}

// Discover Feed Response
export interface DiscoverFeedResponse {
  events: Event[];
  trending_events: Event[];
  recommended_events: Event[];
  nearby_events: Event[];
  following_events: Event[];
  meta: {
    total: number;
    has_more: boolean;
    user_location?: { lat: number; lng: number };
    categories_available: string[];
  };
  insights: {
    popular_categories: { name: string; count: number }[];
    trending_topics: string[];
    price_distribution: { range: string; count: number }[];
  };
}
```

## 6. Hook Updates

### File: `apps/mobile/src/hooks/useFeed.ts`

#### Update Feed Hook:
```typescript
// Update the API client to use discover feed
const apiClient = {
  getFeed: async (filter: FeedFilter) => {
    const response = await apiGateway.getDiscoverFeed({
      user_id: filter.user_id,
      location: filter.location,
      radius_km: filter.radius || 50,
      categories: filter.categories,
      limit: filter.limit || 20,
      include_trending: filter.type === 'trending',
      include_recommendations: filter.type === 'for_you',
      include_nearby: filter.type === 'near_me',
      include_following: filter.type === 'following'
    });
    
    return {
      data: {
        items: response.data.events,
        meta: response.data.meta
      }
    };
  },
};
```

## 7. Component Updates

### New Components to Create:

#### Search Facets Component
```typescript
// components/search/SearchFacets.tsx
export const SearchFacets: React.FC<{
  facets: any;
  selectedFilters: any;
  onFilterChange: (filter: string, value: any) => void;
}> = ({ facets, selectedFilters, onFilterChange }) => {
  // Implementation for search facets UI
};
```

#### Enhanced Search Results Component
```typescript
// components/search/EnhancedSearchResults.tsx
export const EnhancedSearchResults: React.FC<{
  results: any;
  suggestions: string[];
  trending: any[];
  relatedSearches: string[];
  onSuggestionPress: (suggestion: string) => void;
}> = ({ results, suggestions, trending, relatedSearches, onSuggestionPress }) => {
  // Implementation for enhanced search results UI
};
```

#### Discover Insights Component
```typescript
// components/discover/DiscoverInsights.tsx
export const DiscoverInsights: React.FC<{
  insights: any;
}> = ({ insights }) => {
  // Implementation for discover insights UI
};
```

## 8. Styling Updates

### Add New Styles:
```typescript
// styles/search.ts
export const searchStyles = StyleSheet.create({
  facetsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  facetChip: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  facetChipSelected: {
    backgroundColor: '#007AFF',
  },
  relatedSearchesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  relatedSearchChip: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
});
```

## 9. Testing Updates

### Update Test Files:
- Update search screen tests to include new functionality
- Add tests for discover feed
- Test new UI components
- Test error handling for new API calls

## 10. Performance Considerations

### Optimizations:
- Implement proper memoization for expensive operations
- Use React.memo for components that don't need frequent re-renders
- Implement virtual scrolling for large result sets
- Add loading states and skeleton screens
- Implement proper error boundaries

## Implementation Priority

1. **High Priority**: Update API gateway and search screen
2. **Medium Priority**: Update discover screen and home screen
3. **Low Priority**: Add new UI components and styling
4. **Testing**: Update tests and add new test coverage

## Migration Notes

- The old search API will continue to work during migration
- New features are additive and won't break existing functionality
- Users can opt-in to enhanced features gradually
- Analytics tracking should be updated to capture new metrics
