// ✅ OPTIMIZED: Performance monitoring service with search analytics
import { supabase } from './supabase';

export interface PerformanceMetrics {
  // Existing metrics
  appLoadTime: number;
  screenRenderTime: number;
  apiResponseTime: number;
  imageLoadTime: number;
  navigationTime: number;
  
  // Ticketing metrics
  ticketPurchaseTime: number;
  qrValidationTime: number;
  ticketListLoadTime: number;
  paymentProcessingTime: number;
  databaseQueryTime: number;
  
  // Organizer metrics
  organizerLoadTime: number;
  organizerEventsLoadTime: number;
  organizerFollowersLoadTime: number;
  eventOrganizerLoadTime: number;
  organizerSearchTime: number;
  
  // ✅ NEW: Search metrics
  searchQueryTime: number;
  searchResultsCount: number;
  searchRelevanceScore: number;
  searchSuggestionTime: number;
  searchClickThroughRate: number;
  searchZeroResultRate: number;
  searchAnalyticsTime: number;
}

export interface PerformanceConfig {
  enabled: boolean;
  trackTicketing: boolean;
  trackPayments: boolean;
  trackQRValidation: boolean;
  trackOrganizers: boolean;
  trackSearch: boolean; // ✅ NEW: Search tracking
  alertThreshold: number;
  logToConsole: boolean;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private config: PerformanceConfig;
  private alerts: string[] = [];

  constructor(config: PerformanceConfig) {
    this.config = config;
    this.metrics = this.initializeMetrics();
  }

  private initializeMetrics(): PerformanceMetrics {
    return {
      appLoadTime: 0,
      screenRenderTime: 0,
      apiResponseTime: 0,
      imageLoadTime: 0,
      navigationTime: 0,
      ticketPurchaseTime: 0,
      qrValidationTime: 0,
      ticketListLoadTime: 0,
      paymentProcessingTime: 0,
      databaseQueryTime: 0,
      organizerLoadTime: 0,
      organizerEventsLoadTime: 0,
      organizerFollowersLoadTime: 0,
      eventOrganizerLoadTime: 0,
      organizerSearchTime: 0,
      // ✅ NEW: Search metrics initialization
      searchQueryTime: 0,
      searchResultsCount: 0,
      searchRelevanceScore: 0,
      searchSuggestionTime: 0,
      searchClickThroughRate: 0,
      searchZeroResultRate: 0,
      searchAnalyticsTime: 0,
    };
  }

  // ✅ NEW: Search performance tracking methods
  trackSearchQuery(duration: number, resultsCount: number, relevanceScore: number) {
    if (!this.config.trackSearch) return;

    this.metrics.searchQueryTime = duration;
    this.metrics.searchResultsCount = resultsCount;
    this.metrics.searchRelevanceScore = relevanceScore;

    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Search query took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }

    if (this.config.logToConsole) {
      console.log(`🔍 Search Performance: ${duration}ms, ${resultsCount} results, relevance: ${relevanceScore.toFixed(2)}`);
    }
  }

  trackSearchSuggestions(duration: number) {
    if (!this.config.trackSearch) return;

    this.metrics.searchSuggestionTime = duration;

    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Search suggestions took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }

    if (this.config.logToConsole) {
      console.log(`💡 Search Suggestions: ${duration}ms`);
    }
  }

  trackSearchClickThrough(rate: number) {
    if (!this.config.trackSearch) return;

    this.metrics.searchClickThroughRate = rate;

    if (this.config.logToConsole) {
      console.log(`📊 Search CTR: ${rate.toFixed(2)}%`);
    }
  }

  trackSearchZeroResults(rate: number) {
    if (!this.config.trackSearch) return;

    this.metrics.searchZeroResultRate = rate;

    if (rate > 10) { // Alert if zero result rate is above 10%
      this.alerts.push(`High zero result rate: ${rate.toFixed(2)}%`);
    }

    if (this.config.logToConsole) {
      console.log(`❌ Search Zero Results: ${rate.toFixed(2)}%`);
    }
  }

  trackSearchAnalytics(duration: number) {
    if (!this.config.trackSearch) return;

    this.metrics.searchAnalyticsTime = duration;

    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Search analytics took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }

    if (this.config.logToConsole) {
      console.log(`📈 Search Analytics: ${duration}ms`);
    }
  }

  // Existing tracking methods
  trackAppLoad(duration: number) {
    this.metrics.appLoadTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`App load took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackScreenRender(duration: number) {
    this.metrics.screenRenderTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Screen render took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackApiResponse(duration: number) {
    this.metrics.apiResponseTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`API response took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackImageLoad(duration: number) {
    this.metrics.imageLoadTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Image load took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackNavigation(duration: number) {
    this.metrics.navigationTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Navigation took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  // Ticketing tracking methods
  trackTicketPurchase(duration: number) {
    if (!this.config.trackTicketing) return;
    this.metrics.ticketPurchaseTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Ticket purchase took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackQRValidation(duration: number) {
    if (!this.config.trackQRValidation) return;
    this.metrics.qrValidationTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`QR validation took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackTicketListLoad(duration: number) {
    if (!this.config.trackTicketing) return;
    this.metrics.ticketListLoadTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Ticket list load took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackPaymentProcessing(duration: number) {
    if (!this.config.trackPayments) return;
    this.metrics.paymentProcessingTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Payment processing took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackDatabaseQuery(duration: number) {
    this.metrics.databaseQueryTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Database query took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  // Organizer tracking methods
  trackOrganizerLoad(duration: number) {
    if (!this.config.trackOrganizers) return;
    this.metrics.organizerLoadTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Organizer load took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackOrganizerEventsLoad(duration: number) {
    if (!this.config.trackOrganizers) return;
    this.metrics.organizerEventsLoadTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Organizer events load took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackOrganizerFollowersLoad(duration: number) {
    if (!this.config.trackOrganizers) return;
    this.metrics.organizerFollowersLoadTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Organizer followers load took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackEventOrganizerLoad(duration: number) {
    if (!this.config.trackOrganizers) return;
    this.metrics.eventOrganizerLoadTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Event organizer load took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  trackOrganizerSearch(duration: number) {
    if (!this.config.trackOrganizers) return;
    this.metrics.organizerSearchTime = duration;
    if (duration > this.config.alertThreshold) {
      this.alerts.push(`Organizer search took ${duration}ms (threshold: ${this.config.alertThreshold}ms)`);
    }
  }

  // ✅ NEW: Get search performance summary
  getSearchPerformanceSummary() {
    return {
      averageQueryTime: this.metrics.searchQueryTime,
      averageResultsCount: this.metrics.searchResultsCount,
      averageRelevanceScore: this.metrics.searchRelevanceScore,
      averageSuggestionTime: this.metrics.searchSuggestionTime,
      clickThroughRate: this.metrics.searchClickThroughRate,
      zeroResultRate: this.metrics.searchZeroResultRate,
      analyticsTime: this.metrics.searchAnalyticsTime,
      performance: this.getSearchPerformanceGrade(),
    };
  }

  // ✅ NEW: Get search performance grade
  private getSearchPerformanceGrade(): string {
    const queryTime = this.metrics.searchQueryTime;
    const suggestionTime = this.metrics.searchSuggestionTime;
    const relevanceScore = this.metrics.searchRelevanceScore;
    const zeroResultRate = this.metrics.searchZeroResultRate;

    let score = 0;

    // Query time scoring (40% weight)
    if (queryTime < 200) score += 40;
    else if (queryTime < 300) score += 30;
    else if (queryTime < 500) score += 20;
    else score += 10;

    // Suggestion time scoring (20% weight)
    if (suggestionTime < 200) score += 20;
    else if (suggestionTime < 300) score += 15;
    else if (suggestionTime < 500) score += 10;
    else score += 5;

    // Relevance score (25% weight)
    if (relevanceScore > 0.8) score += 25;
    else if (relevanceScore > 0.6) score += 20;
    else if (relevanceScore > 0.4) score += 15;
    else score += 10;

    // Zero result rate (15% weight)
    if (zeroResultRate < 5) score += 15;
    else if (zeroResultRate < 10) score += 12;
    else if (zeroResultRate < 15) score += 8;
    else score += 5;

    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    return 'D';
  }

  // Existing summary methods
  getTicketingPerformanceSummary() {
    return {
      averagePurchaseTime: this.metrics.ticketPurchaseTime,
      averageQRValidationTime: this.metrics.qrValidationTime,
      averageListLoadTime: this.metrics.ticketListLoadTime,
      averagePaymentTime: this.metrics.paymentProcessingTime,
      averageQueryTime: this.metrics.databaseQueryTime,
      performance: this.getTicketingPerformanceGrade(),
    };
  }

  getOrganizerPerformanceSummary() {
    return {
      averageLoadTime: this.metrics.organizerLoadTime,
      averageEventsLoadTime: this.metrics.organizerEventsLoadTime,
      averageFollowersLoadTime: this.metrics.organizerFollowersLoadTime,
      averageEventOrganizerLoadTime: this.metrics.eventOrganizerLoadTime,
      averageSearchTime: this.metrics.organizerSearchTime,
      performance: this.getOrganizerPerformanceGrade(),
    };
  }

  private getTicketingPerformanceGrade(): string {
    const purchaseTime = this.metrics.ticketPurchaseTime;
    const qrTime = this.metrics.qrValidationTime;
    const listTime = this.metrics.ticketListLoadTime;
    const paymentTime = this.metrics.paymentProcessingTime;

    let score = 0;

    if (purchaseTime < 2000) score += 25;
    else if (purchaseTime < 3000) score += 20;
    else if (purchaseTime < 5000) score += 15;
    else score += 10;

    if (qrTime < 500) score += 25;
    else if (qrTime < 1000) score += 20;
    else if (qrTime < 2000) score += 15;
    else score += 10;

    if (listTime < 500) score += 25;
    else if (listTime < 1000) score += 20;
    else if (listTime < 2000) score += 15;
    else score += 10;

    if (paymentTime < 3000) score += 25;
    else if (paymentTime < 5000) score += 20;
    else if (paymentTime < 8000) score += 15;
    else score += 10;

    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    return 'D';
  }

  private getOrganizerPerformanceGrade(): string {
    const loadTime = this.metrics.organizerLoadTime;
    const eventsTime = this.metrics.organizerEventsLoadTime;
    const followersTime = this.metrics.organizerFollowersLoadTime;
    const eventOrgTime = this.metrics.eventOrganizerLoadTime;
    const searchTime = this.metrics.organizerSearchTime;

    let score = 0;

    if (loadTime < 500) score += 20;
    else if (loadTime < 1000) score += 16;
    else if (loadTime < 2000) score += 12;
    else score += 8;

    if (eventsTime < 500) score += 20;
    else if (eventsTime < 1000) score += 16;
    else if (eventsTime < 2000) score += 12;
    else score += 8;

    if (followersTime < 500) score += 20;
    else if (followersTime < 1000) score += 16;
    else if (followersTime < 2000) score += 12;
    else score += 8;

    if (eventOrgTime < 500) score += 20;
    else if (eventOrgTime < 1000) score += 16;
    else if (eventOrgTime < 2000) score += 12;
    else score += 8;

    if (searchTime < 300) score += 20;
    else if (searchTime < 500) score += 16;
    else if (searchTime < 1000) score += 12;
    else score += 8;

    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C+';
    if (score >= 40) return 'C';
    return 'D';
  }

  // ✅ NEW: Log search performance summary
  logSearchPerformanceSummary() {
    if (!this.config.logToConsole) return;

    const summary = this.getSearchPerformanceSummary();
    console.log('🔍 SEARCH PERFORMANCE SUMMARY');
    console.log('================================');
    console.log(`Query Time: ${summary.averageQueryTime}ms`);
    console.log(`Results Count: ${summary.averageResultsCount}`);
    console.log(`Relevance Score: ${summary.averageRelevanceScore.toFixed(2)}`);
    console.log(`Suggestion Time: ${summary.averageSuggestionTime}ms`);
    console.log(`Click-Through Rate: ${summary.clickThroughRate.toFixed(2)}%`);
    console.log(`Zero Result Rate: ${summary.zeroResultRate.toFixed(2)}%`);
    console.log(`Analytics Time: ${summary.analyticsTime}ms`);
    console.log(`Performance Grade: ${summary.performance}`);
    console.log('================================');
  }

  // Existing logging methods
  logTicketingPerformanceSummary() {
    if (!this.config.logToConsole) return;

    const summary = this.getTicketingPerformanceSummary();
    console.log('🎫 TICKETING PERFORMANCE SUMMARY');
    console.log('================================');
    console.log(`Purchase Time: ${summary.averagePurchaseTime}ms`);
    console.log(`QR Validation: ${summary.averageQRValidationTime}ms`);
    console.log(`List Load: ${summary.averageListLoadTime}ms`);
    console.log(`Payment Processing: ${summary.averagePaymentTime}ms`);
    console.log(`Database Query: ${summary.averageQueryTime}ms`);
    console.log(`Performance Grade: ${summary.performance}`);
    console.log('================================');
  }

  logOrganizerPerformanceSummary() {
    if (!this.config.logToConsole) return;

    const summary = this.getOrganizerPerformanceSummary();
    console.log('🏢 ORGANIZER PERFORMANCE SUMMARY');
    console.log('================================');
    console.log(`Load Time: ${summary.averageLoadTime}ms`);
    console.log(`Events Load: ${summary.averageEventsLoadTime}ms`);
    console.log(`Followers Load: ${summary.averageFollowersLoadTime}ms`);
    console.log(`Event Organizer Load: ${summary.averageEventOrganizerLoadTime}ms`);
    console.log(`Search Time: ${summary.averageSearchTime}ms`);
    console.log(`Performance Grade: ${summary.performance}`);
    console.log('================================');
  }

  getAlerts(): string[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  resetMetrics(): void {
    this.metrics = this.initializeMetrics();
  }
}

// ✅ OPTIMIZED: Export configured instance with search tracking
export const performanceMonitor = new PerformanceMonitor({
  enabled: __DEV__,
  trackTicketing: true,
  trackPayments: true,
  trackQRValidation: true,
  trackOrganizers: true,
  trackSearch: true, // ✅ NEW: Enable search tracking
  alertThreshold: 1000,
  logToConsole: __DEV__,
});
