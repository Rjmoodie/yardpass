import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  price: string;
  attendees: number;
  maxAttendees: number;
  isAttending: boolean;
  isSaved: boolean;
  organizer: {
    name: string;
    avatar: string;
    isVerified: boolean;
  };
}

const CalendarScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'calendar' | 'list'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    'all',
    'Music Festival',
    'Dance Party',
    'Art Exhibition',
    'Food Festival',
    'Comedy Show',
    'Sports Event',
    'Workshop',
    'Conference',
  ];

  const mockEvents: Event[] = [
    {
      id: '1',
      title: 'Summer Music Festival 2024',
      description: 'The biggest music festival of the summer featuring top artists from around the world.',
      date: '2024-07-15',
      time: '2:00 PM',
      location: 'Central Park, NYC',
      image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
      category: 'Music Festival',
      price: '$75',
      attendees: 1250,
      maxAttendees: 2000,
      isAttending: true,
      isSaved: true,
      organizer: {
        name: 'Music Events Co.',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
        isVerified: true,
      },
    },
    {
      id: '2',
      title: 'Art Gallery Opening',
      description: 'Exclusive opening of contemporary art exhibition featuring local artists.',
      date: '2024-06-20',
      time: '7:00 PM',
      location: 'Modern Art Gallery, Brooklyn',
      image: 'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=800',
      category: 'Art Exhibition',
      price: 'Free',
      attendees: 85,
      maxAttendees: 150,
      isAttending: false,
      isSaved: false,
      organizer: {
        name: 'Brooklyn Arts Collective',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        isVerified: false,
      },
    },
    {
      id: '3',
      title: 'Food Truck Festival',
      description: 'A celebration of street food with over 50 food trucks and live entertainment.',
      date: '2024-06-25',
      time: '12:00 PM',
      location: 'Riverside Park, Manhattan',
      image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=800',
      category: 'Food Festival',
      price: '$25',
      attendees: 320,
      maxAttendees: 500,
      isAttending: false,
      isSaved: true,
      organizer: {
        name: 'NYC Food Events',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
        isVerified: true,
      },
    },
    {
      id: '4',
      title: 'Comedy Night at The Cellar',
      description: 'Stand-up comedy night featuring up-and-coming comedians and special guests.',
      date: '2024-06-18',
      time: '8:30 PM',
      location: 'The Comedy Cellar, Greenwich Village',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
      category: 'Comedy Show',
      price: '$35',
      attendees: 45,
      maxAttendees: 80,
      isAttending: true,
      isSaved: false,
      organizer: {
        name: 'Comedy Cellar',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
        isVerified: true,
      },
    },
  ];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    
    return { daysInMonth, startingDay };
  };

  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getEventsForDate = (date: string) => {
    return mockEvents.filter(event => event.date === date);
  };

  const handleDateSelect = (day: number) => {
    const newDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), day);
    setSelectedDate(newDate);
  };

  const handleAttendToggle = (eventId: string) => {
    Alert.alert(
      'Event Attendance',
      'Would you like to attend this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Attend', onPress: () => console.log('Attending event:', eventId) },
      ]
    );
  };

  const handleSaveToggle = (eventId: string) => {
    console.log('Saving event:', eventId);
  };

  const handleEventPress = (event: Event) => {
    console.log('Opening event:', event.title);
  };

  const renderCalendar = () => {
    const { daysInMonth, startingDay } = getDaysInMonth(selectedDate);
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDay; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const eventsForDay = getEventsForDate(dateString);
      const isSelected = selectedDate.getDate() === day;
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[styles.calendarDay, isSelected && styles.calendarDaySelected]}
          onPress={() => handleDateSelect(day)}
        >
          <Text style={[styles.calendarDayText, isSelected && styles.calendarDayTextSelected]}>
            {day}
          </Text>
          {eventsForDay.length > 0 && (
            <View style={styles.eventIndicator}>
              <Text style={styles.eventIndicatorText}>{eventsForDay.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.calendarContainer}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => {
            const prevMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1);
            setSelectedDate(prevMonth);
          }}>
            <Ionicons name="chevron-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>{getMonthName(selectedDate)}</Text>
          <TouchableOpacity onPress={() => {
            const nextMonth = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1);
            setSelectedDate(nextMonth);
          }}>
            <Ionicons name="chevron-forward" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.calendarWeekdays}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <Text key={day} style={styles.weekdayText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarGrid}>
          {days}
        </View>
      </View>
    );
  };

  const renderEventCard = ({ item }: { item: Event }) => (
    <TouchableOpacity style={styles.eventCard} onPress={() => handleEventPress(item)}>
      <Image source={{ uri: item.image }} style={styles.eventImage} />
      
      <View style={styles.eventContent}>
        <View style={styles.eventHeader}>
          <View style={styles.eventTitleContainer}>
            <Text style={styles.eventTitle} numberOfLines={1}>{item.title}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => handleSaveToggle(item.id)}
          >
            <Ionicons 
              name={item.isSaved ? "bookmark" : "bookmark-outline"} 
              size={20} 
              color={item.isSaved ? "#00ff88" : "#a3a3a3"} 
            />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.eventDescription} numberOfLines={2}>
          {item.description}
        </Text>
        
        <View style={styles.eventDetails}>
          <View style={styles.eventDetail}>
            <Ionicons name="calendar" size={14} color="#00ff88" />
            <Text style={styles.eventDetailText}>{item.date}</Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="time" size={14} color="#00ff88" />
            <Text style={styles.eventDetailText}>{item.time}</Text>
          </View>
          
          <View style={styles.eventDetail}>
            <Ionicons name="location" size={14} color="#00ff88" />
            <Text style={styles.eventDetailText} numberOfLines={1}>{item.location}</Text>
          </View>
        </View>
        
        <View style={styles.eventFooter}>
          <View style={styles.organizerInfo}>
            <Image source={{ uri: item.organizer.avatar }} style={styles.organizerAvatar} />
            <View style={styles.organizerDetails}>
              <Text style={styles.organizerName}>{item.organizer.name}</Text>
              {item.organizer.isVerified && (
                <Ionicons name="checkmark-circle" size={12} color="#00ff88" />
              )}
            </View>
          </View>
          
          <View style={styles.eventStats}>
            <Text style={styles.priceText}>{item.price}</Text>
            <Text style={styles.attendeesText}>
              {item.attendees}/{item.maxAttendees} attending
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.attendButton, item.isAttending && styles.attendButtonActive]}
          onPress={() => handleAttendToggle(item.id)}
        >
          <Text style={[styles.attendButtonText, item.isAttending && styles.attendButtonTextActive]}>
            {item.isAttending ? 'Attending' : 'Attend'}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderCategoryFilter = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.categoryFilter}
    >
      {categories.map(category => (
        <TouchableOpacity
          key={category}
          style={[
            styles.categoryChip,
            selectedCategory === category && styles.categoryChipActive
          ]}
          onPress={() => setSelectedCategory(category)}
        >
          <Text style={[
            styles.categoryChipText,
            selectedCategory === category && styles.categoryChipTextActive
          ]}>
            {category === 'all' ? 'All Events' : category}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  const filteredEvents = mockEvents.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || event.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Events</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity style={styles.headerButton} onPress={() => setShowFilters(!showFilters)}>
            <Ionicons name="filter" size={24} color="#00ff88" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="add" size={24} color="#00ff88" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#a3a3a3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events..."
            placeholderTextColor="#a3a3a3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'calendar' && styles.tabActive]}
          onPress={() => setActiveTab('calendar')}
        >
          <Ionicons 
            name="calendar" 
            size={20} 
            color={activeTab === 'calendar' ? '#00ff88' : '#a3a3a3'} 
          />
          <Text style={[styles.tabText, activeTab === 'calendar' && styles.tabTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'list' && styles.tabActive]}
          onPress={() => setActiveTab('list')}
        >
          <Ionicons 
            name="list" 
            size={20} 
            color={activeTab === 'list' ? '#00ff88' : '#a3a3a3'} 
          />
          <Text style={[styles.tabText, activeTab === 'list' && styles.tabTextActive]}>
            List
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter */}
      {renderCategoryFilter()}

      {/* Content */}
      {activeTab === 'calendar' ? (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {renderCalendar()}
          
          {/* Events for Selected Date */}
          <View style={styles.selectedDateEvents}>
            <Text style={styles.selectedDateTitle}>
              Events for {selectedDate.toLocaleDateString()}
            </Text>
            {getEventsForDate(selectedDate.toISOString().split('T')[0]).length > 0 ? (
              getEventsForDate(selectedDate.toISOString().split('T')[0]).map(event => (
                <View key={event.id} style={styles.selectedDateEvent}>
                  <Text style={styles.selectedDateEventTitle}>{event.title}</Text>
                  <Text style={styles.selectedDateEventTime}>{event.time}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noEventsText}>No events on this date</Text>
            )}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={filteredEvents}
          renderItem={renderEventCard}
          keyExtractor={(item) => item.id}
          style={styles.eventsList}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.eventsListContent}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    paddingVertical: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
  },
  tabActive: {
    backgroundColor: '#00ff88',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
    marginLeft: 4,
  },
  tabTextActive: {
    color: '#1a1a1a',
  },
  categoryFilter: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#333333',
    marginRight: 8,
  },
  categoryChipActive: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  categoryChipTextActive: {
    color: '#1a1a1a',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  calendarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  calendarTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  calendarDaySelected: {
    backgroundColor: '#00ff88',
    borderRadius: 20,
  },
  calendarDayText: {
    fontSize: 16,
    color: 'white',
  },
  calendarDayTextSelected: {
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  eventIndicator: {
    position: 'absolute',
    bottom: 2,
    backgroundColor: '#00ff88',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  eventIndicatorText: {
    fontSize: 10,
    color: '#1a1a1a',
    fontWeight: 'bold',
  },
  selectedDateEvents: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  selectedDateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  selectedDateEvent: {
    backgroundColor: '#262626',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedDateEventTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  selectedDateEventTime: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 2,
  },
  noEventsText: {
    fontSize: 14,
    color: '#a3a3a3',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  eventsList: {
    flex: 1,
  },
  eventsListContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  eventCard: {
    backgroundColor: '#262626',
    borderRadius: 12,
    marginBottom: 16,
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitleContainer: {
    flex: 1,
    marginRight: 8,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  categoryBadge: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  categoryText: {
    fontSize: 12,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  saveButton: {
    padding: 4,
  },
  eventDescription: {
    fontSize: 14,
    color: '#a3a3a3',
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
    fontSize: 12,
    color: '#a3a3a3',
    marginLeft: 6,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  organizerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerName: {
    fontSize: 12,
    color: '#a3a3a3',
    marginRight: 4,
  },
  eventStats: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00ff88',
  },
  attendeesText: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  attendButton: {
    backgroundColor: '#333333',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
  },
  attendButtonActive: {
    backgroundColor: '#00ff88',
  },
  attendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  attendButtonTextActive: {
    color: '#1a1a1a',
  },
});

export default CalendarScreen;
