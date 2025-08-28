import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../../hooks/useNavigation';
import { useActions } from '../../hooks/useActions';

const { width } = Dimensions.get('window');

interface SearchResult {
  id: string;
  type: 'event' | 'user' | 'organization' | 'post';
  title: string;
  subtitle: string;
  image?: string;
  relevanceScore: number;
  metadata?: {
    organizer?: string;
    isVerified?: boolean;
    category?: string;
    searchHighlights?: string[];
    quickActions?: string[];
  };
}

interface TrendingTopic {
  id: string;
  title: string;
  posts: number;
  trending: boolean;
}

interface RecentSearch {
  id: string;
  query: string;
  type: string;
  timestamp: string;
  resultsCount: number;
}

interface SearchAnalytics {
  query: string;
  searchTime: number;
  resultsCount: number;
  filtersApplied: string[];
}

const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<TrendingTopic[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [searchAnalytics, setSearchAnalytics] = useState<SearchAnalytics | null>(null);
  
  const searchInputRef = useRef<TextInput>(null);
  
  const {
    navigateToEvent,
    navigateToUserProfile,
    navigateToPostDetails,
    navigateToSearch,
  } = useNavigation();

  // Mock data
  const mockTrendingTopics: TrendingTopic[] = [
    { id: '1', title: '#SummerFest2024', posts: 1234, trending: true },
    { id: '2', title: '#LiveMusic', posts: 856, trending: true },
    { id: '3', title: '#FoodFestival', posts: 567, trending: false },
    { id: '4', title: '#ArtExhibition', posts: 234, trending: false },
  ];

  const mockRecentSearches: RecentSearch[] = [
    { id: '1', query: 'Summer Music Festival', type: 'event', timestamp: '2024-01-15T10:30:00Z', resultsCount: 45 },
    { id: '2', query: 'John Smith', type: 'user', timestamp: '2024-01-14T15:20:00Z', resultsCount: 1 },
    { id: '3', query: 'Rock Concert', type: 'event', timestamp: '2024-01-13T09:15:00Z', resultsCount: 23 },
  ];

  // Initialize mock data
  React.useEffect(() => {
    setTrendingTopics(mockTrendingTopics);
    setRecentSearches(mockRecentSearches);
  }, []);

  // ✅ OPTIMIZED: Debounced search function
  const debouncedSearch = useCallback(
    React.useMemo(
      () => {
        let timeoutId: NodeJS.Timeout;
        return (query: string) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            performSearch(query);
          }, 300);
        };
      },
      []
    ),
    []
  );

  // ✅ OPTIMIZED: Debounced suggestions function
  const debouncedGetSuggestions = useCallback(
    React.useMemo(
      () => {
        let timeoutId: NodeJS.Timeout;
        return (query: string) => {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => {
            getSuggestions(query);
          }, 200);
        };
      },
      []
    ),
    []
  );

  // ✅ OPTIMIZED: Perform search with analytics
  const performSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsLoading(true);
    const startTime = Date.now();

    try {
      // Mock search results
      const mockResults: SearchResult[] = [
        {
          id: '1',
          type: 'event',
          title: 'Summer Music Festival 2024',
          subtitle: 'The biggest music festival of the summer',
          image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400',
          relevanceScore: 0.95,
          metadata: {
            organizer: 'Music Events Co.',
            isVerified: true,
            category: 'Music Festival',
            searchHighlights: ['summer', 'music', 'festival'],
            quickActions: ['Buy Tickets', 'Share', 'Save']
          }
        },
        {
          id: '2',
          type: 'user',
          title: 'Sarah Johnson',
          subtitle: 'Event Organizer • 15 events',
          image: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400',
          relevanceScore: 0.87,
          metadata: {
            isVerified: true,
            category: 'Organizer',
            searchHighlights: ['sarah', 'johnson'],
            quickActions: ['Follow', 'Message', 'View Profile']
          }
        },
        {
          id: '3',
          type: 'post',
          title: 'Amazing concert experience!',
          subtitle: 'Just attended the best concert ever...',
          image: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=400',
          relevanceScore: 0.82,
          metadata: {
            category: 'Post',
            searchHighlights: ['concert', 'experience'],
            quickActions: ['Like', 'Comment', 'Share']
          }
        }
      ];

      const searchTime = Date.now() - startTime;
      
      setSearchResults(mockResults);
      setShowResults(true);
      setSearchAnalytics({
        query,
        searchTime,
        resultsCount: mockResults.length,
        filtersApplied: []
      });

      // ✅ TRACK: Search analytics
      console.log('Search completed:', {
        query,
        resultsCount: mockResults.length,
        searchTime,
        filtersApplied: []
      });

    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search Error', 'Failed to perform search. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ✅ OPTIMIZED: Get search suggestions
  const getSuggestions = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      // Mock suggestions
      const mockSuggestions = [
        `${query} festival`,
        `${query} concert`,
        `${query} 2024`,
        `${query} tickets`,
        `${query} near me`
      ];

      setSuggestions(mockSuggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Suggestions error:', error);
    }
  }, []);

  // ✅ OPTIMIZED: Handle search input
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
          // Mock analytics tracking
          console.log('Analytics tracking:', {
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
        query: searchAnalytics.query,
        resultId: result.id,
        resultType: result.type,
        position
      });
      }

      // Navigate based on result type
      switch (result.type) {
        case 'event':
          navigateToEvent(result.id);
          break;
        case 'user':
          navigateToUserProfile(result.id);
          break;
        case 'organization':
          // Navigate to organizer profile (if implemented)
          console.log('Navigate to organizer:', result.id);
          break;
        case 'post':
          navigateToPostDetails(result.id);
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
  }, [searchAnalytics, searchQuery, navigateToEvent, navigateToUserProfile, navigateToPostDetails]);

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
      style={styles.trendingTopic}
      onPress={() => handleSearch(item.title)}
    >
      <View style={styles.trendingHeader}>
        <Text style={styles.trendingTitle}>{item.title}</Text>
        {item.trending && (
          <Ionicons name="trending-up" size={16} color="#00ff88" />
        )}
      </View>
      <Text style={styles.trendingPosts}>{item.posts} posts</Text>
    </TouchableOpacity>
  ), [handleSearch]);

  const renderRecentSearch = useCallback(({ item }: { item: RecentSearch }) => (
    <TouchableOpacity 
      style={styles.recentSearch}
      onPress={() => handleSearch(item.query)}
    >
      <Ionicons 
        name={item.type === 'user' ? 'person' : item.type === 'event' ? 'calendar' : 'search'} 
        size={20} 
        color="#666" 
      />
      <View style={styles.recentSearchContent}>
        <Text style={styles.recentSearchText}>{item.query}</Text>
        <Text style={styles.recentSearchMeta}>
          {item.resultsCount} results • {new Date(item.timestamp).toLocaleDateString()}
        </Text>
      </View>
      <TouchableOpacity 
        style={styles.removeButton}
        onPress={() => {
          setRecentSearches(prev => prev.filter(search => search.id !== item.id));
        }}
      >
        <Ionicons name="close" size={16} color="#666" />
      </TouchableOpacity>
    </TouchableOpacity>
  ), [handleSearch]);

  const renderSearchResult = useCallback(({ item, index }: { item: SearchResult; index: number }) => (
    <TouchableOpacity 
      style={styles.searchResult}
      onPress={() => handleResultClick(item, index + 1)}
    >
      <Image source={{ uri: item.image }} style={styles.resultImage} />
      <View style={styles.resultContent}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>{item.title}</Text>
          {item.metadata?.isVerified && (
            <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
          )}
        </View>
        <Text style={styles.resultSubtitle}>{item.subtitle}</Text>
        {item.metadata?.organizer && (
          <Text style={styles.resultOrganizer}>{item.metadata.organizer}</Text>
        )}
        <View style={styles.resultMeta}>
          <Text style={styles.resultType}>{item.type}</Text>
          <Text style={styles.resultScore}>{Math.round(item.relevanceScore * 100)}% match</Text>
        </View>
      </View>
    </TouchableOpacity>
  ), [handleResultClick]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Header */}
      <View style={styles.searchHeader}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search events, people, posts..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity onPress={() => {}} style={styles.filterButton}>
          <Ionicons name="options" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Search Results */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#00ff88" />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      )}

      {showResults && !isLoading && (
        <FlatList
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          style={styles.resultsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Search Suggestions */}
      {showSuggestions && !showResults && !isLoading && (
        <View style={styles.suggestionsContainer}>
          {suggestions.map((suggestion, index) => (
            <TouchableOpacity
              key={index}
              style={styles.suggestionItem}
              onPress={() => handleSearch(suggestion)}
            >
              <Ionicons name="search" size={16} color="#666" />
              <Text style={styles.suggestionText}>{suggestion}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Default Content */}
      {!showResults && !showSuggestions && !isLoading && (
        <View style={styles.defaultContent}>
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
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
            <Text style={styles.sectionTitle}>Trending Topics</Text>
            <FlatList
              data={trendingTopics}
              renderItem={renderTrendingTopic}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.trendingList}
            />
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    marginLeft: 8,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
    marginTop: 12,
  },
  resultsList: {
    flex: 1,
  },
  searchResult: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  resultImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
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
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  resultSubtitle: {
    color: '#999',
    fontSize: 14,
    marginBottom: 4,
  },
  resultOrganizer: {
    color: '#00ff88',
    fontSize: 12,
    marginBottom: 4,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  resultType: {
    color: '#666',
    fontSize: 12,
    textTransform: 'uppercase',
  },
  resultScore: {
    color: '#00ff88',
    fontSize: 12,
  },
  suggestionsContainer: {
    padding: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  suggestionText: {
    color: 'white',
    fontSize: 16,
    marginLeft: 12,
  },
  defaultContent: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  recentSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  recentSearchContent: {
    flex: 1,
    marginLeft: 12,
  },
  recentSearchText: {
    color: 'white',
    fontSize: 16,
  },
  recentSearchMeta: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  removeButton: {
    padding: 4,
  },
  trendingList: {
    paddingRight: 16,
  },
  trendingTopic: {
    backgroundColor: '#333',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    minWidth: 120,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  trendingTitle: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  trendingPosts: {
    color: '#666',
    fontSize: 12,
  },
});

export default SearchScreen;
