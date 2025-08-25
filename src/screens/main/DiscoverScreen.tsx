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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { theme } from '@/constants/theme';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  image: string;
  category: string;
  organizer: string;
  attendees: number;
  maxAttendees: number;
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const { width } = Dimensions.get('window');

const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [events, setEvents] = useState<Event[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<Event[]>([]);

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
    filterEvents();
  }, [events, searchQuery, selectedCategory]);

  const loadEvents = async () => {
    // TODO: Load from API
    const mockEvents: Event[] = [
      {
        id: '1',
        title: 'Summer Music Festival 2024',
        description: 'The biggest music festival of the summer featuring top artists from around the world.',
        date: '2024-08-20',
        time: '6:00 PM',
        location: 'Central Park, New York',
        price: 299.99,
        image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
        category: 'music',
        organizer: 'Music Events Inc.',
        attendees: 1250,
        maxAttendees: 2000,
      },
      {
        id: '2',
        title: 'Tech Innovation Summit',
        description: 'Join industry leaders for a day of innovation, networking, and cutting-edge technology.',
        date: '2024-09-15',
        time: '9:00 AM',
        location: 'Convention Center, San Francisco',
        price: 149.99,
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
        category: 'tech',
        organizer: 'TechCorp',
        attendees: 450,
        maxAttendees: 500,
      },
      {
        id: '3',
        title: 'Food & Wine Festival',
        description: 'Taste the finest cuisines and wines from renowned chefs and wineries.',
        date: '2024-10-05',
        time: '5:00 PM',
        location: 'Downtown Plaza, Los Angeles',
        price: 89.99,
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
        category: 'food',
        organizer: 'Culinary Events',
        attendees: 320,
        maxAttendees: 400,
      },
      {
        id: '4',
        title: 'Contemporary Art Exhibition',
        description: 'Explore modern art from emerging and established artists in this curated exhibition.',
        date: '2024-11-12',
        time: '10:00 AM',
        location: 'Modern Art Museum, Chicago',
        price: 25.00,
        image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
        category: 'art',
        organizer: 'Art Gallery Collective',
        attendees: 180,
        maxAttendees: 300,
      },
    ];
    
    setEvents(mockEvents);
  };

  const filterEvents = () => {
    let filtered = events;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter(event =>
        event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        event.organizer.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(event => event.category === selectedCategory);
    }

    setFilteredEvents(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setRefreshing(false);
  };

  const handleEventPress = (event: Event) => {
    navigation.navigate('EventDetails' as never, { eventId: event.id } as never);
  };

  const handleMapView = () => {
    setViewMode('map');
    navigation.navigate('EventMap' as never);
  };

  const handleListView = () => {
    setViewMode('list');
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.selectedCategory,
      ]}
      onPress={() => setSelectedCategory(item.id === 'all' ? null : item.id)}
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

  const renderEvent = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => handleEventPress(item)}>
      <Image source={{ uri: item.image }} style={styles.eventImage} />
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={styles.eventTitle}>{item.title}</Text>
          <Text style={styles.eventPrice}>${item.price}</Text>
        </View>
        
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.eventDetails}>
          <View style={styles.eventDetail}>
            <Ionicons name="calendar" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.eventDetailText}>{item.date}</Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="time" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.eventDetailText}>{item.time}</Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="location" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.eventDetailText}>{item.location}</Text>
          </View>
        </View>
        
        <View style={styles.eventFooter}>
          <Text style={styles.organizerText}>by {item.organizer}</Text>
          <View style={styles.attendeesContainer}>
            <Ionicons name="people" size={16} color={theme.colors.textSecondary} />
            <Text style={styles.attendeesText}>
              {item.attendees}/{item.maxAttendees}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
        data={filteredEvents}
        renderItem={renderEvent}
        keyExtractor={(item) => item.id}
        style={styles.eventsList}
        contentContainerStyle={styles.eventsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={64} color={theme.colors.textSecondary} />
            <Text style={styles.emptyTitle}>
              {searchQuery ? 'No events found' : 'No events available'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery 
                ? 'Try adjusting your search or filters'
                : 'Check back later for new events'
              }
            </Text>
          </View>
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
});

export default DiscoverScreen;
