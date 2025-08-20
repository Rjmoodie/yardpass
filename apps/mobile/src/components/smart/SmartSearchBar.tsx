import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSmartSearch, useSearchSuggestions } from '@/hooks/useSmartServices';
import { theme } from '@/constants/theme';

interface SmartSearchBarProps {
  onSearch?: (query: string) => void;
  onSuggestionPress?: (suggestion: string) => void;
  placeholder?: string;
  showSuggestions?: boolean;
  style?: any;
}

const SmartSearchBar: React.FC<SmartSearchBarProps> = ({
  onSearch,
  onSuggestionPress,
  placeholder = 'Search events, people, places...',
  showSuggestions = true,
  style
}) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  
  const {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    debouncedSearch,
    isLoading,
    data: searchResults
  } = useSmartSearch();

  const { suggestions, isLoading: suggestionsLoading } = useSearchSuggestions(searchQuery);
  
  const [isFocused, setIsFocused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: isFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isFocused, fadeAnim]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.length >= 2) {
      debouncedSearch(query);
      setShowResults(true);
    } else {
      setShowResults(false);
    }
    onSearch?.(query);
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowResults(false);
    onSuggestionPress?.(suggestion);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    setSearchQuery('');
    setShowResults(false);
    inputRef.current?.clear();
    inputRef.current?.focus();
  };

  const renderSuggestion = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[styles.suggestionItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handleSuggestionPress(item.query)}
    >
      <Ionicons 
        name="search-outline" 
        size={16} 
        color={theme.colors.textSecondary} 
      />
      <Text style={[styles.suggestionText, { color: theme.colors.text }]}>
        {item.query}
      </Text>
      {item.usage_count > 0 && (
        <Text style={[styles.usageCount, { color: theme.colors.textSecondary }]}>
          {item.usage_count} searches
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[styles.resultItem, { borderBottomColor: theme.colors.border }]}
      onPress={() => handleSuggestionPress(item.title)}
    >
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: theme.colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.resultSubtitle, { color: theme.colors.textSecondary }]}>
          {item.subtitle}
        </Text>
      </View>
      <View style={styles.resultMeta}>
        <Text style={[styles.resultType, { color: theme.colors.primary }]}>
          {item.type}
        </Text>
        {item.relevanceScore && (
          <Text style={[styles.relevanceScore, { color: theme.colors.success }]}>
            {Math.round(item.relevanceScore * 100)}% match
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      {/* Search Input */}
      <View style={[
        styles.searchContainer,
        { 
          backgroundColor: theme.colors.surface,
          borderColor: isFocused ? theme.colors.primary : theme.colors.border,
          ...theme.shadows?.sm
        }
      ]}>
        <Ionicons 
          name="search" 
          size={20} 
          color={isFocused ? theme.colors.primary : theme.colors.textSecondary} 
        />
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: theme.colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearch}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          returnKeyType="search"
          autoCorrect={false}
          autoCapitalize="none"
        />
        {isLoading && (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        )}
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Search Type Selector */}
      <Animated.View 
        style={[
          styles.typeSelector,
          { 
            opacity: fadeAnim,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }
        ]}
      >
        {['all', 'events', 'users', 'posts', 'organizations'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.typeButton,
              searchType === type && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setSearchType(type as any)}
          >
            <Text style={[
              styles.typeText,
              { 
                color: searchType === type ? '#FFFFFF' : theme.colors.textSecondary 
              }
            ]}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* Suggestions and Results */}
      {showSuggestions && (isFocused || showResults) && (
        <Animated.View 
          style={[
            styles.resultsContainer,
            { 
              opacity: fadeAnim,
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }
          ]}
        >
          {suggestionsLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
                Finding suggestions...
              </Text>
            </View>
          )}

          {!suggestionsLoading && suggestions.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                Popular Searches
              </Text>
              <FlatList
                data={suggestions}
                renderItem={renderSuggestion}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {!suggestionsLoading && searchResults?.data?.events?.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: theme.colors.textSecondary }]}>
                Search Results ({searchResults.data.events.length})
              </Text>
              <FlatList
                data={searchResults.data.events}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}

          {!suggestionsLoading && suggestions.length === 0 && searchResults?.data?.events?.length === 0 && searchQuery.length >= 2 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={24} color={theme.colors.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
                No results found for "{searchQuery}"
              </Text>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  clearButton: {
    marginLeft: 8,
  },
  typeSelector: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  typeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginHorizontal: 2,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  resultsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 400,
    paddingVertical: 8,
    ...theme.shadows?.lg,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  section: {
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  suggestionText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  usageCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  resultSubtitle: {
    fontSize: 12,
  },
  resultMeta: {
    alignItems: 'flex-end',
  },
  resultType: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  relevanceScore: {
    fontSize: 10,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default SmartSearchBar;
