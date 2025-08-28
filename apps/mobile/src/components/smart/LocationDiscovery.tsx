import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface LocationDiscoveryProps {
  onLocationSelect: (location: string) => void;
  currentLocation?: string;
}

const LocationDiscovery: React.FC<LocationDiscoveryProps> = ({
  onLocationSelect,
  currentLocation,
}) => {
  const [isDiscovering, setIsDiscovering] = useState(false);

  const popularLocations = [
    'New York, NY',
    'Los Angeles, CA',
    'Chicago, IL',
    'Miami, FL',
    'Austin, TX',
  ];

  const handleLocationSelect = (location: string) => {
    onLocationSelect(location);
  };

  const discoverNearby = () => {
    setIsDiscovering(true);
    // TODO: Implement location discovery
    setTimeout(() => {
      setIsDiscovering(false);
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Events Near You</Text>
        <TouchableOpacity 
          style={styles.discoverButton}
          onPress={discoverNearby}
          disabled={isDiscovering}
        >
          <Ionicons 
            name={isDiscovering ? "refresh" : "location"} 
            size={20} 
            color="white" 
          />
          <Text style={styles.discoverButtonText}>
            {isDiscovering ? 'Discovering...' : 'Discover Nearby'}
          </Text>
        </TouchableOpacity>
      </View>

      {currentLocation && (
        <View style={styles.currentLocation}>
          <Ionicons name="location" size={16} color="#00ff88" />
          <Text style={styles.currentLocationText}>{currentLocation}</Text>
        </View>
      )}

      <Text style={styles.subtitle}>Popular Locations</Text>
      <View style={styles.locationsList}>
        {popularLocations.map((location) => (
          <TouchableOpacity
            key={location}
            style={styles.locationItem}
            onPress={() => handleLocationSelect(location)}
          >
            <Ionicons name="location-outline" size={16} color="#666" />
            <Text style={styles.locationText}>{location}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  discoverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ff88',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  discoverButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  currentLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  currentLocationText: {
    color: '#00ff88',
    fontSize: 14,
    marginLeft: 8,
  },
  subtitle: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationsList: {
    gap: 8,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    padding: 12,
    borderRadius: 8,
  },
  locationText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
});

export default LocationDiscovery;
