import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Dimensions,
  FlatList,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';

const { width } = Dimensions.get('window');

const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock data - replace with real data from API
  const categories = [
    { id: 'all', name: 'All', icon: 'grid-outline' },
    { id: 'music', name: 'Music', icon: 'musical-notes-outline' },
    { id: 'sports', name: 'Sports', icon: 'football-outline' },
    { id: 'tech', name: 'Tech', icon: 'laptop-outline' },
    { id: 'food', name: 'Food', icon: 'restaurant-outline' },
    { id: 'art', name: 'Art', icon: 'color-palette-outline' },
  ];

  const mockEvents = [
    {
      id: '1',
      title: 'Summer Music Festival 2024',
      date: '2024-08-20',
      time: '18:00',
      venue: 'Central Park, NYC',
      price: 89.99,
      image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=300&fit=crop',
      category: 'music',
      attendees: 2500,
      organizer: 'Music Events NYC',
    },
    {
      id: '2',
      title: 'Tech Conference 2024',
      date: '2024-09-15',
      time: '09:00',
      venue: 'Convention Center, SF',
      price: 299.99,
      image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=300&fit=crop',
      category: 'tech',
      attendees: 1200,
      organizer: 'Tech Events Inc',
    },
    {
      id: '3',
      title: 'Food & Wine Festival',
      date: '2024-10-05',
      time: '14:00',
      venue: 'Pier 39, SF',
      price: 149.99,
      image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=300&fit=crop',
      category: 'food',
      attendees: 800,
      organizer: 'Culinary Events',
    },
    {
      id: '4',
      title: 'Art Exhibition Opening',
      date: '2024-08-25',
      time: '19:00',
      venue: 'Museum of Modern Art, NYC',
      price: 45.00,
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400&h=300&fit=crop',
      category: 'art',
      attendees: 300,
      organizer: 'MoMA',
    },
    {
      id: '5',
      title: 'Basketball Championship',
      date: '2024-09-10',
      time: '20:00',
      venue: 'Madison Square Garden, NYC',
      price: 199.99,
      image: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=400&h=300&fit=crop',
      category: 'sports',
      attendees: 18000,
      organizer: 'NBA Events',
    },
  ];

  const filteredEvents = selectedCategory === 'all' 
    ? mockEvents 
    : mockEvents.filter(event => event.category === selectedCategory);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatAttendees = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const renderEventCard = ({ item: event }: { item: any }) => (
    <TouchableOpacity
      style={[styles.eventCard, { borderColor: theme.colors.border }]}
      onPress={() => navigation.navigate('EventDetail' as never, { event } as never)}
      activeOpacity={0.8}
    >
      <Image source={{ uri: event.image }} style={styles.eventImage} />
      
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={2}>
            {event.title}
          </Text>
          <Text style={[styles.eventPrice, { color: theme.colors.primary }]}>
            ${event.price}
          </Text>
        </View>

        <View style={styles.eventDetails}>
          <View style={styles.eventDetail}>
            <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.eventDetailText, { color: theme.colors.textSecondary }]}>
              {formatDate(event.date)} • {formatTime(event.time)}
            </Text>
          </View>

          <View style={styles.eventDetail}>
            <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.eventDetailText, { color: theme.colors.textSecondary }]} numberOfLines={1}>
              {event.venue}
            </Text>
          </View>

          <View style={styles.eventDetail}>
            <Ionicons name="people-outline" size={16} color={theme.colors.textSecondary} />
            <Text style={[styles.eventDetailText, { color: theme.colors.textSecondary }]}>
              {formatAttendees(event.attendees)} attending
            </Text>
          </View>
        </View>

        <View style={styles.eventFooter}>
          <Text style={[styles.organizer, { color: theme.colors.textSecondary }]}>
            by {event.organizer}
          </Text>
          <TouchableOpacity
            style={[styles.bookButton, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.bookButtonText}>Book Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Discover Events</Text>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => Alert.alert('Coming Soon', 'Advanced filters will be available soon')}
          activeOpacity={0.7}
        >
          <Ionicons name="filter-outline" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { borderColor: theme.colors.border }]}>
          <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.colors.text }]}
            placeholder="Search events, venues, organizers..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
        contentContainerStyle={styles.categoriesContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              selectedCategory === category.id && { backgroundColor: theme.colors.primary }
            ]}
            onPress={() => setSelectedCategory(category.id)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={category.icon as any}
              size={20}
              color={selectedCategory === category.id ? theme.colors.white : theme.colors.text}
            />
            <Text style={[
              styles.categoryText,
              { color: selectedCategory === category.id ? theme.colors.white : theme.colors.text }
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventCard}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.eventsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="calendar-outline" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
              No events found
            </Text>
            <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
              Try adjusting your search or filters
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  categoriesContainer: {
    marginBottom: 16,
  },
  categoriesContent: {
    paddingHorizontal: 20,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '500',
  },
  eventsList: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
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
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
    lineHeight: 22,
  },
  eventPrice: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  eventDetails: {
    marginBottom: 16,
  },
  eventDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventDetailText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  organizer: {
    fontSize: 12,
    flex: 1,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 40,
  },
});

export default DiscoverScreen;
