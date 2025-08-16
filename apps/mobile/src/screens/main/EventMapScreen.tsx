import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

interface MapMarker {
  id: string;
  x: number;
  y: number;
  size: number;
  isPulsing?: boolean;
}

const mapMarkers: MapMarker[] = [
  {
    id: '1',
    x: 50, // 50% of screen width
    y: 40, // 40% of screen height
    size: 20,
    isPulsing: true,
  },
  {
    id: '2',
    x: 30, // 30% of screen width
    y: 60, // 60% of screen height
    size: 16,
    isPulsing: false,
  },
];

const EventMapScreen: React.FC = () => {
  const [searchText, setSearchText] = useState('');
  const pulseAnim = new Animated.Value(1);

  // Start pulsing animation
  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };
    pulse();
  }, []);

  const MapMarker = ({ marker }: { marker: MapMarker }) => (
    <View
      style={[
        styles.mapMarker,
        {
          left: `${marker.x}%`,
          top: `${marker.y}%`,
          transform: [{ translateX: -marker.size / 2 }, { translateY: -marker.size / 2 }],
        },
      ]}
    >
      {marker.isPulsing ? (
        <Animated.View
          style={[
            styles.pulsingMarker,
            {
              width: marker.size,
              height: marker.size,
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <View style={styles.markerCenter} />
        </Animated.View>
      ) : (
        <View
          style={[
            styles.staticMarker,
            {
              width: marker.size,
              height: marker.size,
            },
          ]}
        >
          <View style={styles.markerCenter} />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Map Background */}
      <View style={styles.mapContainer}>
        <Image
          source={{
            uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBYWp_aujf_4Oz9odvSvrm86a9dV44saowYCQj9Z7yeFirALAG1wPLpRzPdSXWBT309QnM__ln5ROUCdWHfr7ZubYWRlWA4DvJH_hXJE_tI0q83ZKuawAUpNFhmwQHTpNzRQkrLHuSw88wrknpQB-kOulXqBYnsWsZxx3gdziXemFZh4l92oGgBJ4hoKJZpN_y9mudJ7SjM-ooWDBxABvFnHuWGPuUUAjpdUlOY9NqyUt9oZ0b0QennvzlPNnjKUVp5BFfNQp1YhpDs',
          }}
          style={styles.mapImage}
        />
        <View style={styles.mapOverlay} />
        <LinearGradient
          colors={[
            'rgba(0, 255, 136, 0.5)',
            'rgba(0, 255, 136, 0.2)',
            'rgba(0, 255, 136, 0.05)',
            'transparent',
          ]}
          style={styles.mapGradient}
        />
        
        {/* Map Markers */}
        {mapMarkers.map((marker) => (
          <MapMarker key={marker.id} marker={marker} />
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>YardPass</Text>
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
          />
        </View>
      </View>

      {/* Map Controls */}
      <View style={styles.mapControls}>
        <View style={styles.controlGroup}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.controlDivider} />
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="remove" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.locationButton}>
          <Ionicons name="locate" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={32} color="black" />
      </TouchableOpacity>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#00ff88" />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search" size={24} color="#a3a3a3" />
          <Text style={styles.navLabel}>Search</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="add-circle" size={24} color="#a3a3a3" />
          <Text style={styles.navLabel}>Create</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="ticket" size={24} color="#a3a3a3" />
          <Text style={styles.navLabel}>Tickets</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#a3a3a3" />
          <Text style={styles.navLabel}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  mapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  mapGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapMarker: {
    position: 'absolute',
  },
  pulsingMarker: {
    borderRadius: 10,
    backgroundColor: '#00ff88',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staticMarker: {
    borderRadius: 8,
    backgroundColor: 'rgba(0, 255, 136, 0.8)',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerCenter: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'white',
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
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 12,
    paddingBottom: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  navLabel: {
    color: '#a3a3a3',
    fontSize: 12,
    fontWeight: '500',
  },
  activeNavLabel: {
    color: '#00ff88',
  },
});

export default EventMapScreen;
