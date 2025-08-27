# Frontend Implementation Guide for Lovable

## Overview
This guide outlines what Lovable should expect and ensure is properly wired from our enhanced search functionality updates. The search system has been completely overhauled with advanced features, and the frontend needs to be updated accordingly.

## 🎯 What's Been Updated

### Backend Changes (Already Deployed)
- **Enhanced Search Edge Function** - Smart relevance scoring, advanced filtering
- **Discover Feed Edge Function** - Personalized recommendations, trending events
- **Database Functions** - New PostgreSQL functions for enhanced search
- **API Gateway** - Updated with new search methods

### Frontend Changes (Need Implementation)
- **SearchScreen** - Enhanced with new API integration
- **API Integration** - Updated to use new search endpoints
- **Type Definitions** - New interfaces for enhanced search
- **State Management** - Enhanced state variables for new features

## 🔧 What Lovable Should Implement

### 1. **SearchScreen Updates** (`apps/mobile/src/screens/main/SearchScreen.tsx`)

#### ✅ Already Updated (Verify These Are Working):
```typescript
// Enhanced state variables
const [searchFacets, setSearchFacets] = useState<any>({});
const [relatedSearches, setRelatedSearches] = useState<string[]>([]);
const [trendingSearches, setTrendingSearches] = useState<any[]>([]);
const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
const [userLocation, setUserLocation] = useState<string | null>(null);
const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
const [includePastEvents, setIncludePastEvents] = useState(false);

// Enhanced search API call
const response = await apiGateway.search({
  q: query,
  types: activeTab === 'all' ? ['events', 'organizations', 'users', 'posts'] : [activeTab],
  limit: 20,
  sort_by: 'relevance',
  category: selectedCategory,
  location: userLocation,
  radius_km: 50,
  verified_only: showVerifiedOnly,
  include_past_events: includePastEvents
});
```

#### 🎨 UI Components to Add:

##### **Search Facets Component**
```typescript
// Create: apps/mobile/src/components/search/SearchFacets.tsx
interface SearchFacetsProps {
  facets: {
    categories: { name: string; count: number }[];
    locations: { name: string; count: number }[];
    price_ranges: { range: string; count: number }[];
    dates: { range: string; count: number }[];
  };
  onFacetSelect: (type: string, value: string) => void;
  selectedFacets: Record<string, string>;
}

const SearchFacets: React.FC<SearchFacetsProps> = ({ facets, onFacetSelect, selectedFacets }) => {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.facetsContainer}>
      {/* Categories */}
      {facets.categories?.map((category) => (
        <TouchableOpacity
          key={category.name}
          style={[
            styles.facetChip,
            selectedFacets.category === category.name && styles.facetChipSelected
          ]}
          onPress={() => onFacetSelect('category', category.name)}
        >
          <Text style={styles.facetText}>{category.name}</Text>
          <Text style={styles.facetCount}>({category.count})</Text>
        </TouchableOpacity>
      ))}
      
      {/* Price Ranges */}
      {facets.price_ranges?.map((price) => (
        <TouchableOpacity
          key={price.range}
          style={[
            styles.facetChip,
            selectedFacets.price_range === price.range && styles.facetChipSelected
          ]}
          onPress={() => onFacetSelect('price_range', price.range)}
        >
          <Text style={styles.facetText}>{price.range}</Text>
          <Text style={styles.facetCount}>({price.count})</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};
```

##### **Related Searches Component**
```typescript
// Create: apps/mobile/src/components/search/RelatedSearches.tsx
interface RelatedSearchesProps {
  searches: string[];
  onSearchSelect: (query: string) => void;
}

const RelatedSearches: React.FC<RelatedSearchesProps> = ({ searches, onSearchSelect }) => {
  if (!searches.length) return null;
  
  return (
    <View style={styles.relatedContainer}>
      <Text style={styles.relatedTitle}>Related Searches</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {searches.map((search, index) => (
          <TouchableOpacity
            key={index}
            style={styles.relatedChip}
            onPress={() => onSearchSelect(search)}
          >
            <Text style={styles.relatedText}>{search}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};
```

##### **Enhanced Search Results Component**
```typescript
// Create: apps/mobile/src/components/search/EnhancedSearchResults.tsx
interface EnhancedSearchResult {
  id: string;
  type: 'event' | 'organization' | 'user' | 'post';
  title: string;
  subtitle?: string;
  image?: string;
  relevanceScore?: number;
  metadata?: {
    organizer?: string;
    isVerified?: boolean;
    category?: string;
    searchHighlights?: string[];
    quickActions?: string[];
  };
}

interface EnhancedSearchResultsProps {
  results: EnhancedSearchResult[];
  onResultPress: (result: EnhancedSearchResult) => void;
  isLoading?: boolean;
}

const EnhancedSearchResults: React.FC<EnhancedSearchResultsProps> = ({ 
  results, 
  onResultPress, 
  isLoading 
}) => {
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <FlatList
      data={results}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.resultItem}
          onPress={() => onResultPress(item)}
        >
          <Image source={{ uri: item.image }} style={styles.resultImage} />
          <View style={styles.resultContent}>
            <Text style={styles.resultTitle}>{item.title}</Text>
            <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
            
            {/* Search Highlights */}
            {item.metadata?.searchHighlights && (
              <Text style={styles.highlights}>
                {item.metadata.searchHighlights.join(' • ')}
              </Text>
            )}
            
            {/* Quick Actions */}
            {item.metadata?.quickActions && (
              <View style={styles.quickActions}>
                {item.metadata.quickActions.map((action, index) => (
                  <TouchableOpacity key={index} style={styles.actionButton}>
                    <Text style={styles.actionText}>{action}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
};
```

### 2. **Discover Screen Updates** (`apps/mobile/src/screens/main/DiscoverScreen.tsx`)

#### ✅ Expected API Integration:
```typescript
// Enhanced discover feed API call
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

// Set state with enhanced data
setTrendingEvents(response.data.trending_events || []);
setRecommendedEvents(response.data.recommended_events || []);
setNearbyEvents(response.data.nearby_events || []);
setFollowingEvents(response.data.following_events || []);
setDiscoverInsights(response.data.insights || {});
```

#### 🎨 UI Components to Add:

##### **Discover Insights Component**
```typescript
// Create: apps/mobile/src/components/discover/DiscoverInsights.tsx
interface DiscoverInsightsProps {
  insights: {
    popular_categories: { name: string; count: number }[];
    trending_topics: string[];
    price_distribution: { range: string; count: number }[];
  };
}

const DiscoverInsights: React.FC<DiscoverInsightsProps> = ({ insights }) => {
  return (
    <View style={styles.insightsContainer}>
      <Text style={styles.insightsTitle}>Discover Insights</Text>
      
      {/* Popular Categories */}
      <View style={styles.insightSection}>
        <Text style={styles.sectionTitle}>Popular Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {insights.popular_categories?.map((category) => (
            <View key={category.name} style={styles.categoryChip}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.count} events</Text>
            </View>
          ))}
        </ScrollView>
      </View>
      
      {/* Trending Topics */}
      <View style={styles.insightSection}>
        <Text style={styles.sectionTitle}>Trending Topics</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {insights.trending_topics?.map((topic, index) => (
            <TouchableOpacity key={index} style={styles.topicChip}>
              <Text style={styles.topicText}>#{topic}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </View>
  );
};
```

### 3. **Home Screen Updates** (`apps/mobile/src/screens/main/HomeScreen.tsx`)

#### ✅ Expected Integration:
```typescript
// Update feed loading to use discover feed
const loadFeed = async () => {
  try {
    const response = await apiGateway.getDiscoverFeed({
      user_id: user?.id,
      limit: 20,
      include_trending: true,
      include_recommendations: true
    });
    
    // Combine and deduplicate events
    const allEvents = [
      ...(response.data.events || []),
      ...(response.data.trending_events || []),
      ...(response.data.recommended_events || [])
    ];
    
    const uniqueEvents = deduplicateEvents(allEvents);
    setFeedItems(uniqueEvents);
  } catch (error) {
    console.error('Error loading feed:', error);
  }
};
```

### 4. **Hook Updates** (`apps/mobile/src/hooks/useFeed.ts`)

#### ✅ Expected Updates:
```typescript
// Update useFeed hook to use new API
export const useFeed = () => {
  const loadFeed = async (filters?: FeedFilters) => {
    try {
      const response = await apiGateway.getDiscoverFeed({
        user_id: user?.id,
        location: filters?.location,
        radius_km: filters?.radius_km || 50,
        categories: filters?.categories,
        limit: filters?.limit || 20,
        include_trending: filters?.include_trending ?? true,
        include_recommendations: filters?.include_recommendations ?? true
      });
      
      return response.data;
    } catch (error) {
      console.error('Error loading feed:', error);
      throw error;
    }
  };
  
  return { loadFeed };
};
```

## 🎨 Styling Requirements

### **Search Facets Styling**
```typescript
const styles = StyleSheet.create({
  facetsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
  },
  facetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  facetChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  facetText: {
    fontSize: 14,
    color: theme.colors.text,
    marginRight: 4,
  },
  facetCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
});
```

### **Related Searches Styling**
```typescript
const styles = StyleSheet.create({
  relatedContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
  },
  relatedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  relatedChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 12,
    backgroundColor: theme.colors.primary + '20',
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  relatedText: {
    fontSize: 14,
    color: theme.colors.primary,
  },
});
```

## 🔍 Testing Checklist for Lovable

### **Search Functionality**
- [ ] **Basic Search**: Type query, see results
- [ ] **Search Suggestions**: Appear while typing
- [ ] **Search Facets**: Click to filter results
- [ ] **Related Searches**: Click to search related terms
- [ ] **Trending Searches**: Display popular searches
- [ ] **Advanced Filters**: Category, location, price, date
- [ ] **Sort Options**: Relevance, date, popularity, distance
- [ ] **Error Handling**: Network errors, empty results

### **Discover Feed**
- [ ] **Personalized Recommendations**: Show relevant events
- [ ] **Trending Events**: Display popular events
- [ ] **Nearby Events**: Location-based results
- [ ] **Following Events**: Events from followed organizers
- [ ] **Discover Insights**: Show analytics and trends
- [ ] **Deduplication**: No duplicate events
- [ ] **Performance**: Fast loading, smooth scrolling

### **Integration Points**
- [ ] **API Gateway**: All methods working correctly
- [ ] **Type Safety**: TypeScript compilation passes
- [ ] **State Management**: State updates properly
- [ ] **Navigation**: Search results navigate correctly
- [ ] **Analytics**: Search behavior tracked
- [ ] **Caching**: Results cached appropriately

## 🚨 Critical Issues to Watch For

### **1. API Integration**
- **Issue**: Old API calls still being used
- **Solution**: Ensure all search calls use `apiGateway.search()` and `apiGateway.getDiscoverFeed()`

### **2. Type Errors**
- **Issue**: TypeScript errors from new interfaces
- **Solution**: Update all components to use new `EnhancedSearchResult` type

### **3. State Management**
- **Issue**: Missing state variables for new features
- **Solution**: Add all required state variables (searchFacets, relatedSearches, etc.)

### **4. Performance**
- **Issue**: Slow search or infinite loading
- **Solution**: Implement proper debouncing and loading states

### **5. Error Handling**
- **Issue**: App crashes on search errors
- **Solution**: Add try-catch blocks and error boundaries

## 📱 User Experience Expectations

### **Search Experience**
- **Instant Feedback**: Search suggestions appear while typing
- **Smart Results**: Relevant results with highlights
- **Easy Filtering**: One-tap facet filtering
- **Quick Actions**: Save, share, or follow from results

### **Discover Experience**
- **Personalized**: Content tailored to user interests
- **Trending**: Real-time popular content
- **Local**: Nearby events and venues
- **Social**: Events from followed organizers

### **Performance**
- **Fast Loading**: Results appear within 1-2 seconds
- **Smooth Scrolling**: No lag or stuttering
- **Offline Support**: Cached results when offline
- **Battery Efficient**: Optimized for mobile usage

## 🎯 Success Metrics

### **Search Metrics**
- Search completion rate > 80%
- Average search time < 2 seconds
- Facet usage rate > 30%
- Related search click rate > 15%

### **Discover Metrics**
- Feed engagement rate > 60%
- Recommendation click rate > 25%
- Trending content view rate > 40%
- User retention improvement > 20%

## 📞 Support Resources

### **Documentation**
- `docs/FRONTEND_DEBUG_SUMMARY.md` - Complete implementation details
- `docs/SEARCH_FUNCTIONALITY_STATUS.md` - Current status and features
- `docs/FRONTEND_UPDATES.md` - Specific update requirements

### **Testing Tools**
- `test-end-to-end-search-flow.sh` - Verify complete flow
- `test-frontend-backend-connection.sh` - Test API connectivity
- `scripts/test-enhanced-search.sh` - Comprehensive testing

### **Code Examples**
- Updated SearchScreen with all new features
- New UI components for facets and suggestions
- Enhanced API integration patterns

## 🎉 Expected Outcome

After implementing these updates, users should experience:

1. **Faster, Smarter Search**: Results appear quickly with better relevance
2. **Personalized Discovery**: Content tailored to their interests
3. **Enhanced Filtering**: Easy-to-use facets and filters
4. **Better UX**: Smooth, intuitive search experience
5. **Improved Performance**: Fast loading and responsive interface

The enhanced search system should significantly improve user engagement and satisfaction with the YardPass platform.
