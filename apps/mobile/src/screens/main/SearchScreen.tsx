import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/hooks/useTheme';
import { apiGateway } from '@yardpass/api';
import { debounce } from 'lodash';

// ✅ OPTIMIZED: Enhanced search result interface
interface SearchResult {
  id: string;
  type: 'user' | 'event' | 'post' | 'organization';
  title: string;
  subtitle?: string;
  image?: string;
  avatar?: string;
  followers?: string;
  isVerified?: boolean;
  isFollowing?: boolean;
  relevanceScore?: number;
  metadata?: any;
}

// ✅ OPTIMIZED: Search analytics interface
interface SearchAnalytics {
  query: string;
  resultsCount: number;
  searchTime: number;
  clickedResult?: {
    id: string;
    type: string;
    position: number;
  };
}

// ✅ OPTIMIZED: Trending topics with real data structure
interface TrendingTopic {
  id: string;
  title: string;
  posts: string;
  category: string;
  trending: boolean;
}

// ✅ OPTIMIZED: Recent search with analytics
interface RecentSearch {
  id: string;
  query: string;
  type: string;
  timestamp: string;
  resultsCount: number;
}

const SearchScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const theme = currentTheme;

  // ✅ OPTIMIZED: State management with proper typing
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'events' | 'posts' | 'organizations'>('all');
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [searchAnalytics, setSearchAnalytics] = useState<SearchAnalytics | null>(null);

  // ✅ NEW: Enhanced search state variables
  const [searchFacets, setSearchFacets] = useState<any>({});
  const [relatedSearches, setRelatedSearches] = useState<string[]>([]);
  const [trendingSearches, setTrendingSearches] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [includePastEvents, setIncludePastEvents] = useState(false);

  // ✅ OPTIMIZED: Refs for performance
  const searchInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // ✅ OPTIMIZED: Memoized trending topics
  const memoizedTrendingTopics = useMemo(() => [
    { id: '1', title: '#SummerFest2024', posts: '12.5K', category: 'festival', trending: true },
    { id: '2', title: '#LiveMusic', posts: '8.2K', category: 'music', trending: true },
    { id: '3', title: '#FoodFestival', posts: '5.7K', category: 'food', trending: false },
    { id: '4', title: '#ArtExhibition', posts: '3.1K', category: 'art', trending: false },
    { id: '5', title: '#ComedyNight', posts: '2.8K', category: 'comedy', trending: false },
  ], []);

  // ✅ OPTIMIZED: Memoized recent searches
  const memoizedRecentSearches = useMemo(() => [
    { id: '1', query: 'Liam Carter', type: 'user', timestamp: '2024-01-15T10:30:00Z', resultsCount: 3 },
    { id: '2', query: 'Electric Echoes Festival', type: 'event', timestamp: '2024-01-14T15:45:00Z', resultsCount: 1 },
    { id: '3', query: 'Dance videos', type: 'post', timestamp: '2024-01-13T09:20:00Z', resultsCount: 12 },
    { id: '4', query: 'Live music', type: 'event', timestamp: '2024-01-12T18:15:00Z', resultsCount: 8 },
  ], []);

  // ✅ OPTIMIZED: Initialize data
  useEffect(() => {
    setTrendingTopics(memoizedTrendingTopics);
    setRecentSearches(memoizedRecentSearches);
  }, [memoizedTrendingTopics, memoizedRecentSearches]);

  // ✅ OPTIMIZED: Debounced search function with new API
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
        // ✅ NEW: Use enhanced search with all features
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
          const transformedResults = transformEnhancedResults(searchResponse.results.events || []);
          setSearchResults(transformedResults);
          setSuggestions(searchResponse.suggestions || []);
          setTrendingSearches(searchResponse.trending || []);
          setSearchFacets(searchResponse.meta.facets || {});
          setRelatedSearches(searchResponse.related_searches || []);
          setShowResults(true);

          // ✅ TRACK: Enhanced search analytics
          const searchTime = performance.now() - startTime;
          setSearchAnalytics({
            query,
            resultsCount: transformedResults.length,
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
    }, 300), // 300ms debounce
    [activeTab, selectedCategory, userLocation, showVerifiedOnly, includePastEvents]
  );

  // ✅ ENHANCED: Debounced suggestions function
  const debouncedGetSuggestions = useMemo(
    () => debounce(async (query: string) => {
      if (query.length < 1) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      try {
        // ✅ NEW: Use dedicated suggestions endpoint
        const response = await apiGateway.getSearchSuggestions({
          q: query,
          limit: 5
        });
        
        if (response.error) {
          console.error('Suggestions error:', response.error.message);
          return;
        }
        
        const suggestionsResponse = response.data;
        if (suggestionsResponse.suggestions) {
          setSuggestions(suggestionsResponse.suggestions);
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Suggestions error:', error);
        // Don't show error for suggestions - fallback gracefully
      }
    }, 200), // 200ms debounce for suggestions
    []
  );

  // ✅ OPTIMIZED: Handle search input changes
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (query.length >= 1) {
      debouncedGetSuggestions(query);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    if (query.length >= 2) {
      debouncedSearch(query);
    } else {
      setSearchResults([]);
      setShowResults(false);
    }
  }, [debouncedSearch, debouncedGetSuggestions]);

  // ✅ OPTIMIZED: Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setShowResults(false);
    setShowSuggestions(false);
    setSearchResults([]);
    setSearchAnalytics(null);
    searchInputRef.current?.focus();
  }, []);

  // ✅ OPTIMIZED: Handle result click with analytics
  const handleResultClick = useCallback(async (result: SearchResult, position: number) => {
    try {
      // ✅ TRACK: Result click analytics
      if (searchAnalytics) {
        try {
          await apiGateway.trackUserBehavior({
            action: 'search_result_click',
            metadata: {
              query: searchAnalytics.query,
              resultId: result.id,
              resultType: result.type,
              position,
              searchTime: searchAnalytics.searchTime
            }
          });
        } catch (error) {
          console.error('Analytics error:', error);
          // Don't block user experience for analytics errors
        }
      console.log('Track result click:', {
          searchAnalytics.query,
          result.id,
          result.type,
          position
        );
      }

      // Navigate based on result type
      switch (result.type) {
        case 'event':
          navigation.navigate('EventDetail', { eventId: result.id });
          break;
        case 'user':
          navigation.navigate('UserProfile', { userId: result.id });
          break;
        case 'organization':
          navigation.navigate('OrganizerDetail', { organizerId: result.id });
          break;
        case 'post':
          navigation.navigate('PostDetail', { postId: result.id });
          break;
      }

      // Add to recent searches
      const newRecentSearch: RecentSearch = {
        id: Date.now().toString(),
        query: searchAnalytics?.query || searchQuery,
        type: result.type,
        timestamp: new Date().toISOString(),
        resultsCount: searchAnalytics?.resultsCount || 0
      };

      setRecentSearches(prev => [newRecentSearch, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Result click error:', error);
    }
  }, [searchAnalytics, searchQuery, navigation]);

  // ✅ ENHANCED: Transform enhanced search results
  const transformEnhancedResults = useCallback((searchData: any): SearchResult[] => {
    const results: SearchResult[] = [];

    // Transform enhanced search results (already in correct format)
    if (searchData && Array.isArray(searchData)) {
      return searchData.map((item: any) => ({
        id: item.id,
        type: item.result_type || 'event',
        title: item.result_data?.title || item.result_data?.name || 'Unknown',
        subtitle: item.result_data?.description || '',
        image: item.result_data?.cover_image_url || item.result_data?.logo_url,
        relevanceScore: item.relevance_score || 0,
        metadata: {
          organizer: item.organizer_info?.name,
          isVerified: item.organizer_info?.is_verified,
          category: item.result_data?.category,
          searchHighlights: item.search_highlights,
          quickActions: item.quick_actions
        }
      }));
    }

    return results;
  }, []);

  // ✅ OPTIMIZED: Memoized render functions
  const renderTrendingTopic = useCallback(({ item }: { item: TrendingTopic }) => (
    <TouchableOpacity 
      style={[styles.trendingTopic, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleSearch(item.title)}
    >
      <View style={styles.trendingHeader}>
        <Text style={[styles.trendingTitle, { color: theme.colors.text }]}>{item.title}</Text>
        {item.trending && (
          <Ionicons name="trending-up" size={16} color="#00ff88" />
        )}
      </View>
      <Text style={[styles.trendingPosts, { color: theme.colors.textSecondary }]}>{item.posts} posts</Text>
    </TouchableOpacity>
  ), [theme.colors, handleSearch]);

  const renderRecentSearch = useCallback(({ item }: { item: RecentSearch }) => (
    <TouchableOpacity 
      style={styles.recentSearch}
      onPress={() => handleSearch(item.query)}
    >
      <Ionicons 
        name={item.type === 'user' ? 'person' : item.type === 'event' ? 'calendar' : 'search'} 
        size={20} 
        color={theme.colors.textSecondary} 
      />
      <View style={styles.recentSearchContent}>
        <Text style={[styles.recentSearchText, { color: theme.colors.text }]}>{item.query}</Text>
        <Text style={[styles.recentSearchMeta, { color: theme.colors.textSecondary }]}>
          {item.resultsCount} results • {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => {
          setRecentSearches(prev => prev.filter(search => search.id !== item.id));
        }}
      >
        <Ionicons name="close" size={16} color={theme.colors.textSecondary} />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [theme.colors, handleSearch]);

  const renderSearchResult = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
    <TouchableOpacity
      style={[styles.searchResult, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleResultClick(item, index + 1)}
      activeOpacity={0.7}
    >
      <View style={styles.resultImageContainer}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} style={styles.resultAvatar} />
        ) : item.image ? (
          <Image source={{ uri: item.image }} style={styles.resultImage} />
        ) : (
          <View style={[styles.resultPlaceholder, { backgroundColor: theme.colors.border }]}>
            <Ionicons 
              name={item.type === 'event' ? 'calendar' : item.type === 'user' ? 'person' : 'business'} 
              size={24} 
              color={theme.colors.textSecondary} 
            />
          </View>
        )}
      </View>
      
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={[styles.resultTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.title}
          </Text>
          {item.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
          )}
        </View>
        
        {item.subtitle && (
          <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.subtitle}
          </Text>
        )}
        
        {item.relevanceScore && (
          <View style={styles.relevanceIndicator}>
            <View 
              style={[
                styles.relevanceBar, 
                { 
                  width: `${item.relevanceScore * 100}%`,
                  backgroundColor: item.relevanceScore > 0.7 ? '#00ff88' : 
                                  item.relevanceScore > 0.4 ? '#ffaa00' : '#ff4444'
                }
              ]} 
            />
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [theme.colors, handleResultClick]);

  const renderSuggestion = useCallback(({ item }: { item: string }) => (
    <TouchableOpacity
      style={[styles.suggestion, { backgroundColor: theme.colors.surface }]}
      onPress={() => handleSearch(item)}
    >
      <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
      <Text style={[styles.suggestionText, { color: theme.colors.text }]}>{item}</Text>
    </TouchableOpacity>
  ), [theme.colors, handleSearch]);

  // ✅ OPTIMIZED: Memoized empty state
  const renderEmptyState = useMemo(() => {
    if (isSearching) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>Searching...</Text>
        </View>
      );
    }

    if (searchQuery.length >= 2 && searchResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Ionicons name="search" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.text }]}>No results found</Text>
          <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
            Try adjusting your search terms
          </Text>
        </View>
      );
    }

    return null;
  }, [isSearching, searchQuery, searchResults.length, theme.colors]);

  // ✅ OPTIMIZED: Memoized search stats
  const searchStats = useMemo(() => {
    if (!searchAnalytics) return null;

    return (
      <View style={styles.searchStats}>
        <Text style={[styles.searchStatsText, { color: theme.colors.textSecondary }]}>
          {searchAnalytics.resultsCount} results in {searchAnalytics.searchTime}ms
        </Text>
      </View>
    );
  }, [searchAnalytics, theme.colors]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Search</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { borderColor: theme.colors.border }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
          <TextInput
            ref={searchInputRef}
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search events, organizers, users..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Search Suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={[styles.suggestionsContainer, { backgroundColor: theme.colors.surface }]}>
          <FlatList
            data={suggestions}
            renderItem={renderSuggestion}
            keyExtractor={(item) => item}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Search Results */}
      {showResults ? (
        <View style={styles.resultsContainer}>
          {/* Search Stats */}
          {searchStats}
          
          {/* Results List */}
          <FlatList
            data={searchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.resultsList}
          />
        </View>
      ) : (
        /* Default Content */
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Recent Searches</Text>
              <FlatList
                data={recentSearches}
                renderItem={renderRecentSearch}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {/* Trending Topics */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Trending Topics</Text>
            <FlatList
              data={trendingTopics}
              renderItem={renderTrendingTopic}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

// ✅ OPTIMIZED: Memoized component for performance
export default React.memo(SearchScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingBottom: 15,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  suggestionsContainer: {
    marginHorizontal: 20,
    borderRadius: 12,
    maxHeight: 200,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  suggestionText: {
    marginLeft: 10,
    fontSize: 16,
  },
  resultsContainer: {
    flex: 1,
  },
  searchStats: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  searchStatsText: {
    fontSize: 14,
  },
  resultsList: {
    paddingHorizontal: 20,
  },
  searchResult: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 8,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  resultImageContainer: {
    marginRight: 12,
  },
  resultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  resultAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  resultPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  resultSubtitle: {
    fontSize: 14,
    marginBottom: 6,
  },
  relevanceIndicator: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 1,
    overflow: 'hidden',
  },
  relevanceBar: {
    height: '100%',
    borderRadius: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  recentSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  recentSearchContent: {
    flex: 1,
    marginLeft: 12,
  },
  recentSearchText: {
    fontSize: 16,
    marginBottom: 2,
  },
  recentSearchMeta: {
    fontSize: 12,
  },
  removeButton: {
    padding: 4,
  },
  trendingList: {
    paddingHorizontal: 20,
  },
  trendingTopic: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginRight: 10,
    borderRadius: 20,
    minWidth: 120,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  trendingTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  trendingPosts: {
    fontSize: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});
