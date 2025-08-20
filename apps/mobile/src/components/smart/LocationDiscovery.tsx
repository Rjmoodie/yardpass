import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useLocationIntelligence, useUserAnalytics } from '@/hooks/useSmartServices';
import RecommendationCard from './RecommendationCard';
import { theme } from '@/constants/theme';

interface LocationDiscoveryProps {
  onEventPress?: (event: any) => void;
  onLocationPress?: (location: any) => void;
  showMap?: boolean;
  maxEvents?: number;
}

const LocationDiscovery: React.FC<LocationDiscoveryProps> = ({
  onEventPress,
  onLocationPress,
  showMap = false,
  maxEvents = 10
}) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const { 
    currentLocation, 
    getCurrentLocation, 
    nearbyEvents, 
    insights, 
    isLoading, 
    error,
    radius,
    setRadius 
  } = useLocationIntelligence();
  const { trackEvent } = useUserAnalytics();

  useEffect(() => {
    if (!currentLocation) {
      getCurrentLocation();
    }
  }, [currentLocation, getCurrentLocation]);

  const handleEventPress = (event: any) => {
    trackEvent('location_event_clicked', {
      event_id: event.id,
      event_title: event.title,
      distance: event.distance_meters,
      location: currentLocation
    });
    onEventPress?.(event);
  };

  const handleLocationPress = () => {
    trackEvent('location_discovery_clicked', {
      current_location: currentLocation,
      radius: radius,
      event_count: nearbyEvents.length
    });
    onLocationPress?.({ currentLocation, radius, insights });
  };

  const handleRadiusChange = (newRadius: number) => {
    setRadius(newRadius);
    trackEvent('location_radius_changed', {
      old_radius: radius,
      new_radius: newRadius
    });
  };

  const formatDistance = (meters: number) => {
    if (meters < 1000) {
      return `${Math.round(meters)}m`;
    }
    return `${(meters / 1000).toFixed(1)}km`;
  };

  const formatLocation = () => {
    if (!currentLocation) return 'Getting location...';
    return `${currentLocation.latitude.toFixed(4)}, ${currentLocation.longitude.toFixed(4)}`;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Finding events near you...
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="location-off-outline" size={48} color={theme.colors.error} />
        <Text style={[styles.errorTitle, { color: theme.colors.text }]}>
          Location Access Required
        </Text>
        <Text style={[styles.errorDescription, { color: theme.colors.textSecondary }]}>
          Enable location services to discover events near you
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={getCurrentLocation}
        >
          <Text style={[styles.retryButtonText, { color: '#FFFFFF' }]}>
            Enable Location
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Location Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.locationInfo}>
          <Ionicons name="location" size={20} color={theme.colors.primary} />
          <View style={styles.locationText}>
            <Text style={[styles.locationTitle, { color: theme.colors.text }]}>
              Events Near You
            </Text>
            <Text style={[styles.locationSubtitle, { color: theme.colors.textSecondary }]}>
              {formatLocation()}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.refreshButton, { borderColor: theme.colors.border }]}
          onPress={getCurrentLocation}
        >
          <Ionicons name="refresh" size={16} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Radius Selector */}
      <View style={[styles.radiusContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.radiusLabel, { color: theme.colors.textSecondary }]}>
          Search Radius: {radius}km
        </Text>
        <View style={styles.radiusButtons}>
          {[5, 10, 25, 50].map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.radiusButton,
                radius === r && { backgroundColor: theme.colors.primary }
              ]}
              onPress={() => handleRadiusChange(r)}
            >
              <Text style={[
                styles.radiusButtonText,
                { color: radius === r ? '#FFFFFF' : theme.colors.textSecondary }
              ]}>
                {r}km
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Insights */}
      {insights && (
        <View style={[styles.insightsContainer, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.insightsTitle, { color: theme.colors.text }]}>
            Location Insights
          </Text>
          <View style={styles.insightsGrid}>
            <View style={styles.insightItem}>
              <Ionicons name="calendar-outline" size={16} color={theme.colors.primary} />
              <Text style={[styles.insightValue, { color: theme.colors.text }]}>
                {insights.totalEvents}
              </Text>
              <Text style={[styles.insightLabel, { color: theme.colors.textSecondary }]}>
                Events
              </Text>
            </View>
            
            {insights.averageDistance > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="navigate-outline" size={16} color={theme.colors.success} />
                <Text style={[styles.insightValue, { color: theme.colors.text }]}>
                  {Math.round(insights.averageDistance / 1000)}km
                </Text>
                <Text style={[styles.insightLabel, { color: theme.colors.textSecondary }]}>
                  Avg Distance
                </Text>
              </View>
            )}

            {insights.popularCategories && insights.popularCategories.length > 0 && (
              <View style={styles.insightItem}>
                <Ionicons name="trending-up-outline" size={16} color={theme.colors.warning} />
                <Text style={[styles.insightValue, { color: theme.colors.text }]}>
                  {insights.popularCategories[0]}
                </Text>
                <Text style={[styles.insightLabel, { color: theme.colors.textSecondary }]}>
                  Top Category
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Nearby Events */}
      <View style={styles.eventsContainer}>
        <View style={styles.eventsHeader}>
          <Text style={[styles.eventsTitle, { color: theme.colors.text }]}>
            Nearby Events ({nearbyEvents.length})
          </Text>
          <TouchableOpacity onPress={handleLocationPress}>
            <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
              See All
            </Text>
          </TouchableOpacity>
        </View>

        {nearbyEvents.length === 0 ? (
          <View style={styles.emptyEvents}>
            <Ionicons name="location-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
              No Events Nearby
            </Text>
            <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
              Try increasing the search radius or check back later
            </Text>
          </View>
        ) : (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.eventsList}
          >
            {nearbyEvents.slice(0, maxEvents).map((event, index) => (
              <View key={event.id} style={styles.eventCard}>
                <RecommendationCard
                  item={{
                    id: event.id,
                    type: 'event',
                    title: event.title,
                    description: event.description,
                    relevanceScore: 1 - (event.distance_meters / (radius * 1000)),
                    metadata: {
                      category: event.category,
                      startDate: event.start_at,
                      location: event.city,
                      attendees: Math.floor(Math.random() * 100) + 10
                    }
                  }}
                  onPress={handleEventPress}
                  showRelevance={false}
                />
                <View style={styles.distanceBadge}>
                  <Text style={[styles.distanceText, { color: '#FFFFFF' }]}>
                    {formatDistance(event.distance_meters)}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationText: {
    marginLeft: 12,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  locationSubtitle: {
    fontSize: 12,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  radiusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  radiusLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  radiusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  radiusButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  radiusButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  insightsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  insightItem: {
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 4,
  },
  insightLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  eventsContainer: {
    flex: 1,
    paddingTop: 16,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  emptyEvents: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  eventsList: {
    paddingHorizontal: 8,
  },
  eventCard: {
    position: 'relative',
    marginHorizontal: 4,
  },
  distanceBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  distanceText: {
    fontSize: 12,
    fontWeight: '600',
  },
});

export default LocationDiscovery;
