import { Platform, Dimensions } from 'react-native';
import { performanceMonitor } from './performance';

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, any>;
  timestamp?: number;
  userId?: string;
  sessionId?: string;
}

export interface UserProperties {
  userId: string;
  email?: string;
  username?: string;
  displayName?: string;
  isOrganizer?: boolean;
  isAdmin?: boolean;
  createdAt?: string;
  lastActiveAt?: string;
}

export interface AnalyticsConfig {
  enabled: boolean;
  sampleRate: number;
  batchSize: number;
  flushInterval: number;
  enableDebugMode: boolean;
  enableCrashReporting: boolean;
  enablePerformanceMonitoring: boolean;
}

class AnalyticsService {
  private config: AnalyticsConfig;
  private events: AnalyticsEvent[] = [];
  private userProperties: UserProperties | null = null;
  private sessionId: string;
  private isInitialized = false;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 1.0, // 100% of events
      batchSize: 50,
      flushInterval: 30000, // 30 seconds
      enableDebugMode: __DEV__,
      enableCrashReporting: true,
      enablePerformanceMonitoring: true,
      ...config
    };

    this.sessionId = this.generateSessionId();
  }

  /**
   * Initialize the analytics service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Start flush timer
      this.startFlushTimer();
      
      // Initialize performance monitoring if enabled
      if (this.config.enablePerformanceMonitoring) {
        await performanceMonitor.initialize();
      }

      this.isInitialized = true;
      console.log('Analytics service initialized');
    } catch (error) {
      console.error('Failed to initialize analytics service:', error);
    }
  }

  /**
   * Set user properties for tracking
   */
  setUser(user: UserProperties): void {
    this.userProperties = user;
    this.track('user_identified', {
      userId: user.userId,
      email: user.email,
      username: user.username,
      displayName: user.displayName,
      isOrganizer: user.isOrganizer,
      isAdmin: user.isAdmin,
    });
  }

  /**
   * Clear user data
   */
  clearUser(): void {
    this.userProperties = null;
  }

  /**
   * Track an event
   */
  track(eventName: string, properties: Record<string, any> = {}): void {
    if (!this.config.enabled) return;

    // Apply sampling
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    const event: AnalyticsEvent = {
      name: eventName,
      properties: {
        ...properties,
        platform: Platform.OS,
        platformVersion: Platform.Version,
        screenWidth: Dimensions.get('window').width,
        screenHeight: Dimensions.get('window').height,
        timestamp: Date.now(),
      },
      timestamp: Date.now(),
      userId: this.userProperties?.userId,
      sessionId: this.sessionId,
    };

    this.events.push(event);

    // Debug logging
    if (this.config.enableDebugMode) {
      console.log('Analytics Event:', event);
    }

    // Flush if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Track screen view
   */
  trackScreen(screenName: string, properties: Record<string, any> = {}): void {
    this.track('screen_view', {
      screen_name: screenName,
      ...properties,
    });
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: string, target: string, properties: Record<string, any> = {}): void {
    this.track('user_engagement', {
      action,
      target,
      ...properties,
    });
  }

  /**
   * Track feed interactions
   */
  trackFeedInteraction(action: 'like' | 'share' | 'comment' | 'save' | 'view', postId: string, properties: Record<string, any> = {}): void {
    this.track('feed_interaction', {
      action,
      post_id: postId,
      ...properties,
    });
  }

  /**
   * Track event interactions
   */
  trackEventInteraction(action: 'view' | 'purchase_ticket' | 'share' | 'follow_organizer', eventId: string, properties: Record<string, any> = {}): void {
    this.track('event_interaction', {
      action,
      event_id: eventId,
      ...properties,
    });
  }

  /**
   * Track authentication events
   */
  trackAuth(action: 'sign_in' | 'sign_up' | 'sign_out' | 'password_reset', method: string, properties: Record<string, any> = {}): void {
    this.track('authentication', {
      action,
      method,
      ...properties,
    });
  }

  /**
   * Track errors
   */
  trackError(error: Error, context: Record<string, any> = {}): void {
    this.track('error', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      ...context,
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metricName: string, value: number, properties: Record<string, any> = {}): void {
    this.track('performance', {
      metric_name: metricName,
      value,
      ...properties,
    });
  }

  /**
   * Track business metrics
   */
  trackBusinessMetric(metricName: string, value: number, currency?: string, properties: Record<string, any> = {}): void {
    this.track('business_metric', {
      metric_name: metricName,
      value,
      currency,
      ...properties,
    });
  }

  /**
   * Track user journey
   */
  trackUserJourney(step: string, properties: Record<string, any> = {}): void {
    this.track('user_journey', {
      step,
      ...properties,
    });
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Flush events to analytics service
   */
  private async flush(): Promise<void> {
    if (this.events.length === 0) return;

    try {
      const eventsToSend = [...this.events];
      this.events = [];

      await this.sendToAnalytics(eventsToSend);
      
      if (this.config.enableDebugMode) {
        console.log(`Flushed ${eventsToSend.length} analytics events`);
      }
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      
      // Restore events for retry
      this.events.unshift(...this.events);
    }
  }

  /**
   * Send events to analytics service
   */
  private async sendToAnalytics(events: AnalyticsEvent[]): Promise<void> {
    // Implement analytics service integration here
    // Example with Firebase Analytics:
    // for (const event of events) {
    //   await analytics.logEvent(event.name, event.properties);
    // }
    
    // Example with Mixpanel:
    // for (const event of events) {
    //   mixpanel.track(event.name, event.properties);
    // }
    
    // Example with Amplitude:
    // for (const event of events) {
    //   amplitude.track(event.name, event.properties);
    // }
    
    console.log('Analytics events would be sent to service:', events.length);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get analytics report
   */
  getReport(): {
    events: AnalyticsEvent[];
    userProperties: UserProperties | null;
    sessionId: string;
    config: AnalyticsConfig;
  } {
    return {
      events: this.events,
      userProperties: this.userProperties,
      sessionId: this.sessionId,
      config: this.config,
    };
  }

  /**
   * Cleanup
   */
  cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    
    // Flush remaining events
    this.flush();
  }
}

// Export singleton instance
const analytics = new AnalyticsService();
export default analytics;
