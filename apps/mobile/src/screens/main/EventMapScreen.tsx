import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import MapView, { Marker, Callout } from 'react-native-maps';
import * as Location from 'expo-location';
import { supabase } from '@/services/supabase';

const { width, height } = Dimensions.get('window');

interface Event {
  id: string;
  title: string;
  description: string;
  venue: string;
  city: string;
  latitude: number;
  longitude: number;
  start_date: string;
  cover_image: string;
  category: string;
  price_range: any;
}

const EventMapScreen: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const [events, setEvents] = useState<Event[]>([]);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [loading, setLoading] = useState(true);

  // Get user location
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission denied', 'Location permission is required to show nearby events');
          return;
        }

        const location = await Location.getCurrentPositionAsync({});
        setUserLocation(location);
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.log('Error getting location:', error);
      }
    })();
  }, []);

  // Fetch events with coordinates
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          venue,
          city,
          latitude,
          longitude,
          start_date,
          cover_image,
          category,
          price_range
        `)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .execute();

      if (error) {
        console.error('Error fetching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerPress = (event: Event) => {
    Alert.alert(
      event.title,
      `${event.description}\n\nVenue: ${event.venue}\nCity: ${event.city}\nDate: ${new Date(event.start_date).toLocaleDateString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'View Details', onPress: () => console.log('Navigate to event details') },
      ]
    );
  };

  const centerOnUserLocation = () => {
    if (userLocation) {
      setRegion({
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    }
  };

  const searchEvents = async () => {
    if (!searchText.trim()) {
      fetchEvents();
      return;
    }

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('events')
        .select(`
          id,
          title,
          description,
          venue,
          city,
          latitude,
          longitude,
          start_date,
          cover_image,
          category,
          price_range
        `)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .or(`title.ilike.%${searchText}%,venue.ilike.%${searchText}%,city.ilike.%${searchText}%`)
        .gte('start_date', new Date().toISOString())
        .order('start_date', { ascending: true });

      if (error) {
        console.error('Error searching events:', error);
        return;
      }

      setEvents(data || []);
    } catch (error) {
      console.error('Error searching events:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        region={region}
        onRegionChangeComplete={setRegion}
        showsUserLocation={true}
        showsMyLocationButton={false}
      >
        {events.map((event) => (
          <Marker
            key={event.id}
            coordinate={{
              latitude: event.latitude,
              longitude: event.longitude,
            }}
            title={event.title}
            description={event.venue}
            onPress={() => handleMarkerPress(event)}
          >
            <Callout>
              <View style={styles.calloutContainer}>
                <Text style={styles.calloutTitle}>{event.title}</Text>
                <Text style={styles.calloutVenue}>{event.venue}</Text>
                <Text style={styles.calloutDate}>
                  {new Date(event.start_date).toLocaleDateString()}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>Event Map</Text>
        <TouchableOpacity style={styles.menuButton}>
          <Ionicons name="menu" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#a3a3a3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search events or locations"
            placeholderTextColor="#a3a3a3"
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={searchEvents}
            returnKeyType="search"
          />
        </View>
      </View>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <View style={styles.controlGroup}>
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setRegion({
              ...region,
              latitudeDelta: region.latitudeDelta * 0.5,
              longitudeDelta: region.longitudeDelta * 0.5,
            })}
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.controlDivider} />
          <TouchableOpacity 
            style={styles.controlButton}
            onPress={() => setRegion({
              ...region,
              latitudeDelta: region.latitudeDelta * 2,
              longitudeDelta: region.longitudeDelta * 2,
            })}
          >
            <Ionicons name="remove" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.locationButton} onPress={centerOnUserLocation}>
          <Ionicons name="locate" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Event Count Badge */}
      {events.length > 0 && (
        <View style={styles.eventCountBadge}>
          <Text style={styles.eventCountText}>{events.length} events nearby</Text>
        </View>
      )}

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={32} color="black" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  map: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  headerSpacer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
  },
  menuButton: {
    backgroundColor: 'rgba(38, 38, 38, 0.8)',
    borderRadius: 20,
    padding: 8,
    backdropFilter: 'blur(10px)',
  },
  searchContainer: {
    position: 'absolute',
    top: 120,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchInputContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 12,
    zIndex: 1,
  },
  searchInput: {
    width: '100%',
    backgroundColor: 'rgba(38, 38, 38, 0.8)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingLeft: 48,
    paddingRight: 16,
    color: 'white',
    fontSize: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapControls: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    zIndex: 10,
    alignItems: 'flex-end',
    gap: 12,
  },
  controlGroup: {
    backgroundColor: 'rgba(38, 38, 38, 0.8)',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  controlButton: {
    padding: 12,
  },
  controlDivider: {
    height: 1,
    backgroundColor: '#333333',
    marginHorizontal: 8,
  },
  locationButton: {
    backgroundColor: 'rgba(38, 38, 38, 0.8)',
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  eventCountBadge: {
    position: 'absolute',
    top: 180,
    left: 16,
    backgroundColor: 'rgba(0, 255, 136, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  eventCountText: {
    color: 'black',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -50 }, { translateY: -50 }],
    backgroundColor: 'rgba(38, 38, 38, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  loadingText: {
    color: 'white',
    fontSize: 16,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  calloutContainer: {
    width: 200,
    padding: 8,
  },
  calloutTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  calloutVenue: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  calloutDate: {
    fontSize: 12,
    color: '#999',
  },
});

export default EventMapScreen;
