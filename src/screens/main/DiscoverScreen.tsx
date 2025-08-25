import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  FlatList,
  Image,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { fetchEvents, setFilters, clearFilters, resetPagination } from '@/store/slices/eventsSlice';
import { theme } from '@/constants/theme';

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const { width } = Dimensions.get('window');

const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const { events, isLoading, error, pagination, filters } = useSelector((state: RootState) => state.events);
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  const categories: Category[] = [
    { id: 'all', name: 'All', icon: 'grid', color: theme.colors.primary },
    { id: 'music', name: 'Music', icon: 'musical-notes', color: '#FF6B6B' },
    { id: 'tech', name: 'Tech', icon: 'laptop', color: '#4ECDC4' },
    { id: 'food', name: 'Food', icon: 'restaurant', color: '#FFE66D' },
    { id: 'sports', name: 'Sports', icon: 'football', color: '#95E1D3' },
    { id: 'art', name: 'Art', icon: 'color-palette', color: '#F8BBD9' },
    { id: 'business', name: 'Business', icon: 'briefcase', color: '#D7CCC8' },
  ];

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    // Debounce search query
    const timeoutId = setTimeout(() => {
      if (searchQuery !== filters.search) {
        dispatch(setFilters({ search: searchQuery }));
        dispatch(resetPagination());
        loadEvents();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
    }
  }, [error]);

  const loadEvents = async (page = 1) => {
    const params = {
      page,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      search: searchQuery,
      ...filters,
    };

    await dispatch(fetchEvents(params) as any);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    dispatch(resetPagination());
    await loadEvents(1);
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (pagination.hasNext && !isLoading) {
      loadEvents(pagination.page + 1);
    }
  };

  const handleEventPress = (event: any) => {
    navigation.navigate('EventDetails' as never, { eventId: event.id } as never);
  };

  const handleMapView = () => {
    setViewMode('map');
    navigation.navigate('EventMap' as never);
  };

  const handleListView = () => {
    setViewMode('list');
  };

  const handleCategorySelect = (categoryId: string) => {
    const newCategory = categoryId === 'all' ? null : categoryId;
    setSelectedCategory(newCategory);
    dispatch(setFilters({ category: newCategory }));
    dispatch(resetPagination());
    loadEvents(1);
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.selectedCategory,
      ]}
      onPress={() => handleCategorySelect(item.id)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={20} color="white" />
      </View>
      <Text style={[
        styles.categoryText,
        selectedCategory === item.id && styles.selectedCategoryText,
      ]}>
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  const renderEvent = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => handleEventPress(item)}>
      <Image 
        source={{ uri: item.cover_image_url || 'https://via.placeholder.com/400x300' }} 
        style={styles.eventImage} 
      />
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventPrice}>
            {item.ticket_tiers?.[0]?.price ? `$${item.ticket_tiers[0].price}` : 'Free'}
          </Text>
        </View>
        
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.eventDetails}>
          <View style={styles.eventDetail}>
            <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.eventDetailText}>
              {new Date(item.start_at).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.eventDetailText}>
              {new Date(item.start_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.eventDetailText}>{item.venue || item.city}</Text>
          </View>
        </View>
        
        <View style={styles.eventFooter}>
          <Text style={styles.organizerText}>
            by {item.organizer?.display_name || 'Unknown Organizer'}
          </Text>
          <View style={styles.attendeesContainer}>
            <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.attendeesText}>
              {item.attendees_count || 0} attending
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search" size={64} color={theme.colors.textSecondary} />
      <Text style={styles.emptyTitle}>
        {searchQuery || selectedCategory ? 'No events found' : 'No events available'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery || selectedCategory 
          ? 'Try adjusting your search or filters'
          : 'Check back later for new events'
        }
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Discover Events</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.viewButton, viewMode === 'list' && styles.activeViewButton]}
            onPress={handleListView}
          >
            <Ionicons name="list" size={20} color={viewMode === 'list' ? 'white' : theme.colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewButton, viewMode === 'map' && styles.activeViewButton]}
            onPress={handleMapView}
          >
            <Ionicons name="map" size={20} color={viewMode === 'map' ? 'white' : theme.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events, locations, organizers..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={theme.colors.textSecondary}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <View style={styles.categoriesContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategory}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesList}
        />
      </View>

      {/* Events List */}
      <FlatList
        data={events}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        style={styles.eventsList}
        contentContainerStyle={styles.eventsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.1}
        ListFooterComponent={
          isLoading && pagination.page > 1 ? (
            <View style={styles.loadingFooter}>
              <Text style={styles.loadingText}>Loading more events...</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
  activeViewButton: {
    backgroundColor: theme.colors.primary,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: theme.colors.text,
  },
  categoriesContainer: {
    paddingVertical: 16,
  },
  categoriesList: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: theme.colors.surface,
  },
  selectedCategory: {
    backgroundColor: theme.colors.primary + '20',
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
  selectedCategoryText: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  eventsList: {
    flex: 1,
  },
  eventsContainer: {
    padding: 20,
  },
  eventCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  eventImage: {
    width: '100%',
    height: 200,
  },
  eventContent: {
    padding: 16,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    flex: 1,
    marginRight: 12,
  },
  eventPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  eventDescription: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  eventDetails: {
    marginBottom: 12,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  eventDetailText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  organizerText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  attendeesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  attendeesText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

export default DiscoverScreen;
