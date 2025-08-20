import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SmartServicesAPI } from '@/services/smartServices';
import { 
  SmartSearchRequest, 
  SmartSearchResponse,
  LocationIntelligenceRequest,
  LocationIntelligenceResponse,
  ContentRecommendationRequest,
  ContentRecommendationResponse,
  SearchSuggestion,
  GeoPoint
} from '@yardpass/types';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// Smart Search Hook
export const useSmartSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'all' | 'events' | 'users' | 'posts' | 'organizations'>('all');
  const [filters, setFilters] = useState<Record<string, any>>({});

  const searchMutation = useMutation({
    mutationFn: (request: SmartSearchRequest) => SmartServicesAPI.smartSearch(request),
    onSuccess: (data) => {
      // Track successful search
      console.log('Smart search completed:', data);
    },
    onError: (error) => {
      console.error('Smart search failed:', error);
    }
  });

  const search = useCallback(async (query: string) => {
    if (!query.trim()) return;

    const request: SmartSearchRequest = {
      query: query.trim(),
      type: searchType === 'all' ? undefined : searchType,
      limit: 20,
      filters
    };

    searchMutation.mutate(request);
  }, [searchType, filters, searchMutation]);

  const debouncedSearch = useMemo(
    () => {
      let timeoutId: NodeJS.Timeout;
      return (query: string) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => search(query), 300);
      };
    },
    [search]
  );

  return {
    searchQuery,
    setSearchQuery,
    searchType,
    setSearchType,
    filters,
    setFilters,
    search,
    debouncedSearch,
    isLoading: searchMutation.isPending,
    data: searchMutation.data,
    error: searchMutation.error
  };
};

// Search Suggestions Hook
export const useSearchSuggestions = (query: string) => {
  const { data: suggestions, isLoading, error } = useQuery({
    queryKey: ['searchSuggestions', query],
    queryFn: () => SmartServicesAPI.getSearchSuggestions(query, 5),
    enabled: query.length >= 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  return {
    suggestions: suggestions || [],
    isLoading,
    error
  };
};

// Location Intelligence Hook
export const useLocationIntelligence = () => {
  const [currentLocation, setCurrentLocation] = useState<GeoPoint | null>(null);
  const [radius, setRadius] = useState(10); // km

  const nearbyEventsQuery = useQuery({
    queryKey: ['nearbyEvents', currentLocation, radius],
    queryFn: () => currentLocation ? SmartServicesAPI.getNearbyEvents(currentLocation, radius) : null,
    enabled: !!currentLocation,
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  const getCurrentLocation = useCallback(async () => {
    try {
      // This would integrate with expo-location
      // For now, using a default location
      const defaultLocation: GeoPoint = {
        latitude: 40.7128,
        longitude: -74.0060
      };
      setCurrentLocation(defaultLocation);
    } catch (error) {
      console.error('Failed to get current location:', error);
    }
  }, []);

  return {
    currentLocation,
    setCurrentLocation,
    radius,
    setRadius,
    getCurrentLocation,
    nearbyEvents: nearbyEventsQuery.data?.data?.events || [],
    insights: nearbyEventsQuery.data?.data?.insights,
    isLoading: nearbyEventsQuery.isLoading,
    error: nearbyEventsQuery.error
  };
};

// Content Recommendations Hook
export const useContentRecommendations = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const queryClient = useQueryClient();

  const recommendationsQuery = useQuery({
    queryKey: ['contentRecommendations', user?.id],
    queryFn: () => user?.id ? SmartServicesAPI.getPersonalizedRecommendations(user.id, 10) : null,
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const refreshRecommendations = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['contentRecommendations', user?.id] });
  }, [queryClient, user?.id]);

  return {
    recommendations: recommendationsQuery.data?.data?.recommendations || [],
    trending: recommendationsQuery.data?.data?.trending || [],
    isLoading: recommendationsQuery.isLoading,
    error: recommendationsQuery.error,
    refreshRecommendations
  };
};

// User Analytics Hook
export const useUserAnalytics = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  const trackEvent = useCallback(async (eventName: string, properties: Record<string, any> = {}) => {
    try {
      // Track user behavior for personalization
      await SmartServicesAPI.trackSearchAnalytics({
        query: eventName,
        query_length: eventName.length,
        search_type: 'analytics',
        results_count: 0,
        has_results: false,
        filters_applied: properties
      });
    } catch (error) {
      console.error('Failed to track analytics event:', error);
    }
  }, []);

  const trackSearchClick = useCallback(async (query: string, resultId: string, resultType: string, position: number) => {
    try {
      await SmartServicesAPI.trackSearchAnalytics({
        query,
        query_length: query.length,
        search_type: 'click',
        results_count: 1,
        has_results: true,
        filters_applied: {
          clicked_result_id: resultId,
          clicked_result_type: resultType,
          position_clicked: position
        }
      });
    } catch (error) {
      console.error('Failed to track search click:', error);
    }
  }, []);

  return {
    trackEvent,
    trackSearchClick,
    userId: user?.id
  };
};

// Smart Feed Hook (combines multiple smart services)
export const useSmartFeed = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { recommendations, trending, isLoading: recommendationsLoading } = useContentRecommendations();
  const { nearbyEvents, insights, isLoading: locationLoading } = useLocationIntelligence();

  const smartFeedItems = useMemo(() => {
    const items = [];

    // Add personalized recommendations
    if (recommendations.length > 0) {
      items.push({
        type: 'recommendations' as const,
        title: 'Recommended for You',
        items: recommendations.slice(0, 5)
      });
    }

    // Add nearby events
    if (nearbyEvents.length > 0) {
      items.push({
        type: 'nearby' as const,
        title: 'Events Near You',
        items: nearbyEvents.slice(0, 5),
        insights
      });
    }

    // Add trending content
    if (trending.length > 0) {
      items.push({
        type: 'trending' as const,
        title: 'Trending Now',
        items: trending.slice(0, 5)
      });
    }

    return items;
  }, [recommendations, nearbyEvents, trending, insights]);

  return {
    smartFeedItems,
    isLoading: recommendationsLoading || locationLoading,
    hasRecommendations: recommendations.length > 0,
    hasNearbyEvents: nearbyEvents.length > 0,
    hasTrending: trending.length > 0
  };
};
