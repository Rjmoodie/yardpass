import { supabase } from '../lib/supabase';
import { ApiResponse } from '@yardpass/types';

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface LocationInsights {
  nearby_events_count: number;
  popular_venues: Array<{
    venue: string;
    event_count: number;
    avg_attendance: number;
  }>;
  category_distribution: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  time_distribution: Array<{
    time_slot: string;
    count: number;
  }>;
  price_analysis: {
    avg_price: number;
    min_price: number;
    max_price: number;
    price_ranges: Array<{
      range: string;
      count: number;
    }>;
  };
}

export interface GeographicAudience {
  primary_markets: Array<{
    city: string;
    attendee_count: number;
    percentage: number;
  }>;
  travel_patterns: Array<{
    from_city: string;
    to_city: string;
    attendee_count: number;
  }>;
  radius_analysis: Array<{
    radius_miles: number;
    attendee_count: number;
    percentage: number;
  }>;
}

export class LocationIntelligenceService {
  /**
   * Get nearby events with intelligent filtering
   */
  static async getNearbyEvents(
    location: GeoPoint,
    radiusMiles: number = 25,
    filters: {
      category_id?: string;
      date_range?: { start: string; end: string };
      price_range?: { min: number; max: number };
      limit?: number;
    } = {}
  ): Promise<ApiResponse<{
    events: any[];
    distance_info: Array<{
      event_id: string;
      distance_miles: number;
      travel_time_minutes?: number;
    }>;
    meta: {
      total_found: number;
      radius_miles: number;
      location: GeoPoint;
    };
  }>> {
    try {
      const radiusMeters = radiusMiles * 1609.34; // Convert to meters
      
      let query = supabase
        .from('events')
        .select(`
          *,
          org:orgs(name, slug, is_verified),
          tickets(id, name, price, quantity_available),
          checkins(id)
        `)
        .eq('status', 'published')
        .eq('visibility', 'public')
        .not('location', 'is', null);

      // Apply PostGIS spatial query for nearby events
      query = query.rpc('nearby_events', {
        lat_param: location.lat,
        lng_param: location.lng,
        radius_param: radiusMeters,
      });

      // Apply additional filters
      if (filters.category_id) {
        query = query.eq('category_id', filters.category_id);
      }

      if (filters.date_range) {
        query = query
          .gte('start_at', filters.date_range.start)
          .lte('end_at', filters.date_range.end);
      }

      if (filters.price_range) {
        query = query
          .gte('tickets.price', filters.price_range.min)
          .lte('tickets.price', filters.price_range.max);
      }

      const { data: events, error } = await query
        .order('start_at', { ascending: true })
        .limit(filters.limit || 50);

      if (error) throw error;

      // Calculate distances and travel times
      const eventsWithDistance = await Promise.all(
        events?.map(async (event) => {
          const distance = this.calculateDistance(location, {
            lat: event.location.coordinates[1],
            lng: event.location.coordinates[0],
          });

          const travelTime = await this.estimateTravelTime(location, {
            lat: event.location.coordinates[1],
            lng: event.location.coordinates[0],
          });

          return {
            ...event,
            distance_miles: distance,
            travel_time_minutes: travelTime,
          };
        }) || []
      );

      // Sort by distance
      eventsWithDistance.sort((a, b) => a.distance_miles - b.distance_miles);

      const distanceInfo = eventsWithDistance.map(event => ({
        event_id: event.id,
        distance_miles: event.distance_miles,
        travel_time_minutes: event.travel_time_minutes,
      }));

      return {
        success: true,
        data: {
          events: eventsWithDistance,
          distance_info: distanceInfo,
          meta: {
            total_found: eventsWithDistance.length,
            radius_miles: radiusMiles,
            location,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get nearby events',
      };
    }
  }

  /**
   * Get location insights for an organization
   */
  static async getLocationInsights(orgId: string): Promise<ApiResponse<LocationInsights>> {
    try {
      // Get all events for the organization
      const { data: events, error: eventsError } = await supabase
        .from('events')
        .select(`
          *,
          tickets(price),
          checkins(id)
        `)
        .eq('org_id', orgId)
        .eq('status', 'published');

      if (eventsError) throw eventsError;

      if (!events || events.length === 0) {
        return {
          success: true,
          data: {
            nearby_events_count: 0,
            popular_venues: [],
            category_distribution: [],
            time_distribution: [],
            price_analysis: {
              avg_price: 0,
              min_price: 0,
              max_price: 0,
              price_ranges: [],
            },
          },
        };
      }

      // Analyze venues
      const venueStats = this.analyzeVenues(events);

      // Analyze categories
      const categoryStats = this.analyzeCategories(events);

      // Analyze time distribution
      const timeStats = this.analyzeTimeDistribution(events);

      // Analyze pricing
      const priceStats = this.analyzePricing(events);

      return {
        success: true,
        data: {
          nearby_events_count: events.length,
          popular_venues: venueStats,
          category_distribution: categoryStats,
          time_distribution: timeStats,
          price_analysis: priceStats,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get location insights',
      };
    }
  }

  /**
   * Get geographic audience analysis for an event
   */
  static async getGeographicAudience(eventId: string): Promise<ApiResponse<GeographicAudience>> {
    try {
      // Get event location
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('location, city')
        .eq('id', eventId)
        .single();

      if (eventError) throw eventError;

      if (!event?.location) {
        return {
          success: false,
          error: 'Event location not available',
        };
      }

      // Get check-ins for this event
      const { data: checkins, error: checkinsError } = await supabase
        .from('checkins')
        .select(`
          *,
          tickets_owned:(
            user_id,
            user:profiles(preferences)
          )
        `)
        .eq('event_id', eventId);

      if (checkinsError) throw checkinsError;

      // Analyze primary markets (cities where attendees come from)
      const primaryMarkets = this.analyzePrimaryMarkets(checkins || []);

      // Analyze travel patterns
      const travelPatterns = this.analyzeTravelPatterns(checkins || [], event.city);

      // Analyze radius distribution
      const radiusAnalysis = this.analyzeRadiusDistribution(checkins || [], event.location);

      return {
        success: true,
        data: {
          primary_markets: primaryMarkets,
          travel_patterns: travelPatterns,
          radius_analysis: radiusAnalysis,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get geographic audience',
      };
    }
  }

  /**
   * Get optimal event times based on location and audience
   */
  static async getOptimalEventTimes(
    location: GeoPoint,
    categoryId?: string
  ): Promise<ApiResponse<{
    recommended_times: Array<{
      day_of_week: string;
      time_slot: string;
      success_score: number;
      reasoning: string;
    }>;
    traffic_considerations: Array<{
      time_slot: string;
      traffic_level: 'low' | 'medium' | 'high';
      recommendation: string;
    }>;
  }>> {
    try {
      // Get historical event data for this location/category
      let query = supabase
        .from('events')
        .select(`
          start_at,
          end_at,
          category_id,
          checkins(id)
        `)
        .eq('status', 'published')
        .not('location', 'is', null);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data: events, error } = await query;

      if (error) throw error;

      // Analyze successful event times
      const timeAnalysis = this.analyzeSuccessfulTimes(events || []);

      // Get traffic considerations
      const trafficAnalysis = this.getTrafficConsiderations(location);

      return {
        success: true,
        data: {
          recommended_times: timeAnalysis,
          traffic_considerations: trafficAnalysis,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get optimal event times',
      };
    }
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private static calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.lat - point1.lat);
    const dLng = this.toRadians(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.lat)) * Math.cos(this.toRadians(point2.lat)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Estimate travel time (placeholder - would integrate with real API)
   */
  private static async estimateTravelTime(from: GeoPoint, to: GeoPoint): Promise<number | undefined> {
    // This would integrate with Google Maps API or similar
    // For now, return a rough estimate based on distance
    const distance = this.calculateDistance(from, to);
    return Math.round(distance * 2); // Rough estimate: 2 minutes per mile
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Analyze venue popularity
   */
  private static analyzeVenues(events: any[]): Array<{ venue: string; event_count: number; avg_attendance: number }> {
    const venueStats = new Map<string, { count: number; totalAttendance: number }>();

    events.forEach(event => {
      const venue = event.venue || 'Unknown Venue';
      const attendance = event.checkins?.length || 0;
      
      if (venueStats.has(venue)) {
        const stats = venueStats.get(venue)!;
        stats.count++;
        stats.totalAttendance += attendance;
      } else {
        venueStats.set(venue, { count: 1, totalAttendance: attendance });
      }
    });

    return Array.from(venueStats.entries())
      .map(([venue, stats]) => ({
        venue,
        event_count: stats.count,
        avg_attendance: Math.round(stats.totalAttendance / stats.count),
      }))
      .sort((a, b) => b.event_count - a.event_count)
      .slice(0, 10);
  }

  /**
   * Analyze category distribution
   */
  private static analyzeCategories(events: any[]): Array<{ category: string; count: number; percentage: number }> {
    const categoryStats = new Map<string, number>();
    const total = events.length;

    events.forEach(event => {
      const category = event.category?.name || 'Uncategorized';
      categoryStats.set(category, (categoryStats.get(category) || 0) + 1);
    });

    return Array.from(categoryStats.entries())
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze time distribution
   */
  private static analyzeTimeDistribution(events: any[]): Array<{ time_slot: string; count: number }> {
    const timeSlots = new Map<string, number>();

    events.forEach(event => {
      const startTime = new Date(event.start_at);
      const hour = startTime.getHours();
      let timeSlot: string;

      if (hour < 12) timeSlot = 'Morning (6AM-12PM)';
      else if (hour < 17) timeSlot = 'Afternoon (12PM-5PM)';
      else if (hour < 21) timeSlot = 'Evening (5PM-9PM)';
      else timeSlot = 'Night (9PM-6AM)';

      timeSlots.set(timeSlot, (timeSlots.get(timeSlot) || 0) + 1);
    });

    return Array.from(timeSlots.entries())
      .map(([time_slot, count]) => ({ time_slot, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Analyze pricing
   */
  private static analyzePricing(events: any[]): {
    avg_price: number;
    min_price: number;
    max_price: number;
    price_ranges: Array<{ range: string; count: number }>;
  } {
    const prices: number[] = [];
    const priceRanges = new Map<string, number>();

    events.forEach(event => {
      event.tickets?.forEach((ticket: any) => {
        if (ticket.price) {
          prices.push(ticket.price);
          
          let range: string;
          if (ticket.price < 25) range = '$0-$25';
          else if (ticket.price < 50) range = '$25-$50';
          else if (ticket.price < 100) range = '$50-$100';
          else if (ticket.price < 200) range = '$100-$200';
          else range = '$200+';

          priceRanges.set(range, (priceRanges.get(range) || 0) + 1);
        }
      });
    });

    return {
      avg_price: prices.length > 0 ? Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) : 0,
      min_price: prices.length > 0 ? Math.min(...prices) : 0,
      max_price: prices.length > 0 ? Math.max(...prices) : 0,
      price_ranges: Array.from(priceRanges.entries())
        .map(([range, count]) => ({ range, count }))
        .sort((a, b) => b.count - a.count),
    };
  }

  /**
   * Analyze primary markets
   */
  private static analyzePrimaryMarkets(checkins: any[]): Array<{ city: string; attendee_count: number; percentage: number }> {
    const cityStats = new Map<string, number>();
    const total = checkins.length;

    checkins.forEach(checkin => {
      // Extract city from user preferences or use default
      const city = checkin.tickets_owned?.user?.preferences?.location?.city || 'Unknown';
      cityStats.set(city, (cityStats.get(city) || 0) + 1);
    });

    return Array.from(cityStats.entries())
      .map(([city, attendee_count]) => ({
        city,
        attendee_count,
        percentage: Math.round((attendee_count / total) * 100),
      }))
      .sort((a, b) => b.attendee_count - a.attendee_count)
      .slice(0, 10);
  }

  /**
   * Analyze travel patterns
   */
  private static analyzeTravelPatterns(checkins: any[], eventCity: string): Array<{ from_city: string; to_city: string; attendee_count: number }> {
    const travelStats = new Map<string, number>();

    checkins.forEach(checkin => {
      const fromCity = checkin.tickets_owned?.user?.preferences?.location?.city || 'Unknown';
      if (fromCity !== eventCity) {
        const key = `${fromCity} → ${eventCity}`;
        travelStats.set(key, (travelStats.get(key) || 0) + 1);
      }
    });

    return Array.from(travelStats.entries())
      .map(([key, attendee_count]) => {
        const [from_city, to_city] = key.split(' → ');
        return { from_city, to_city, attendee_count };
      })
      .sort((a, b) => b.attendee_count - a.attendee_count)
      .slice(0, 10);
  }

  /**
   * Analyze radius distribution
   */
  private static analyzeRadiusDistribution(checkins: any[], eventLocation: any): Array<{ radius_miles: number; attendee_count: number; percentage: number }> {
    const radiusStats = new Map<number, number>();
    const total = checkins.length;

    checkins.forEach(checkin => {
      const userLocation = checkin.tickets_owned?.user?.preferences?.location;
      if (userLocation?.lat && userLocation?.lng) {
        const distance = this.calculateDistance(
          { lat: eventLocation.coordinates[1], lng: eventLocation.coordinates[0] },
          { lat: userLocation.lat, lng: userLocation.lng }
        );

        let radius: number;
        if (distance <= 10) radius = 10;
        else if (distance <= 25) radius = 25;
        else if (distance <= 50) radius = 50;
        else if (distance <= 100) radius = 100;
        else radius = 100;

        radiusStats.set(radius, (radiusStats.get(radius) || 0) + 1);
      }
    });

    return Array.from(radiusStats.entries())
      .map(([radius_miles, attendee_count]) => ({
        radius_miles,
        attendee_count,
        percentage: Math.round((attendee_count / total) * 100),
      }))
      .sort((a, b) => a.radius_miles - b.radius_miles);
  }

  /**
   * Analyze successful event times
   */
  private static analyzeSuccessfulTimes(events: any[]): Array<{ day_of_week: string; time_slot: string; success_score: number; reasoning: string }> {
    const timeStats = new Map<string, { count: number; totalAttendance: number }>();

    events.forEach(event => {
      const startTime = new Date(event.start_at);
      const dayOfWeek = startTime.toLocaleDateString('en-US', { weekday: 'long' });
      const hour = startTime.getHours();
      
      let timeSlot: string;
      if (hour < 12) timeSlot = 'Morning (6AM-12PM)';
      else if (hour < 17) timeSlot = 'Afternoon (12PM-5PM)';
      else if (hour < 21) timeSlot = 'Evening (5PM-9PM)';
      else timeSlot = 'Night (9PM-6AM)';

      const key = `${dayOfWeek} - ${timeSlot}`;
      const attendance = event.checkins?.length || 0;

      if (timeStats.has(key)) {
        const stats = timeStats.get(key)!;
        stats.count++;
        stats.totalAttendance += attendance;
      } else {
        timeStats.set(key, { count: 1, totalAttendance: attendance });
      }
    });

    return Array.from(timeStats.entries())
      .map(([key, stats]) => {
        const [day_of_week, time_slot] = key.split(' - ');
        const avgAttendance = stats.totalAttendance / stats.count;
        const success_score = Math.min(100, Math.round((avgAttendance / 100) * 100)); // Normalize to 100

        let reasoning = '';
        if (success_score >= 80) reasoning = 'High attendance consistently';
        else if (success_score >= 60) reasoning = 'Good attendance patterns';
        else if (success_score >= 40) reasoning = 'Moderate attendance';
        else reasoning = 'Lower attendance - consider different timing';

        return {
          day_of_week,
          time_slot,
          success_score,
          reasoning,
        };
      })
      .sort((a, b) => b.success_score - a.success_score)
      .slice(0, 8);
  }

  /**
   * Get traffic considerations
   */
  private static getTrafficConsiderations(location: GeoPoint): Array<{ time_slot: string; traffic_level: 'low' | 'medium' | 'high'; recommendation: string }> {
    // This would integrate with traffic APIs
    // For now, return general recommendations
    return [
      {
        time_slot: 'Morning (6AM-9AM)',
        traffic_level: 'high' as const,
        recommendation: 'Avoid morning rush hour - consider later start times',
      },
      {
        time_slot: 'Afternoon (12PM-2PM)',
        traffic_level: 'medium' as const,
        recommendation: 'Moderate traffic - good for lunch events',
      },
      {
        time_slot: 'Evening (5PM-7PM)',
        traffic_level: 'high' as const,
        recommendation: 'Peak rush hour - consider 7PM+ start times',
      },
      {
        time_slot: 'Night (7PM-10PM)',
        traffic_level: 'low' as const,
        recommendation: 'Low traffic - optimal for evening events',
      },
    ];
  }
}
