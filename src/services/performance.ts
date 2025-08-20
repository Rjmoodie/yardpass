import { PerformanceObserver, PerformanceEntry, PerformanceMark, PerformanceMeasure } from 'react-native';
import { Platform } from 'react-native';

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  errors: number;
  fps: number;
  batteryLevel: number;
  networkType: string;
  deviceInfo: DeviceInfo;
  timestamp: number;
  // ✅ ADDED: Ticketing-specific metrics
  ticketPurchaseTime: number;
  qrValidationTime: number;
  ticketListLoadTime: number;
  paymentProcessingTime: number;
  databaseQueryTime: number;
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  memory: number;
  cpu: string;
}

export interface PerformanceConfig {
  enabled: boolean;
  sampleRate: number;
  maxMetrics: number;
  uploadInterval: number;
  enableRealTime: boolean;
  trackMemory: boolean;
  trackBattery: boolean;
  trackNetwork: boolean;
  // ✅ ADDED: Ticketing-specific config
  trackTicketing: boolean;
  trackPayments: boolean;
  trackQRValidation: boolean;
}

class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetrics[] = [];
  private marks: Map<string, number> = new Map();
  private measures: Map<string, number> = new Map();
  private observers: PerformanceObserver[] = [];
  private uploadTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enabled: true,
      sampleRate: 0.1, // 10% of sessions
      maxMetrics: 1000,
      uploadInterval: 60000, // 1 minute
      enableRealTime: false,
      trackMemory: true,
      trackBattery: true,
      trackNetwork: true,
      trackTicketing: true, // ✅ ADDED: Track ticketing performance
      trackPayments: true,
      trackQRValidation: true,
      ...config
    };
  }

  /**
   * Initialize the performance monitor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.config.enabled) {
      // Start periodic metric collection
      this.startPeriodicCollection();
      
      // Initialize observers if supported
      if (Platform.OS === 'web' && typeof PerformanceObserver !== 'undefined') {
        this.initializeObservers();
      }
    }

    this.isInitialized = true;
  }

  /**
   * Mark a performance point
   */
  mark(name: string): void {
    if (!this.config.enabled) return;

    const timestamp = Date.now();
    this.marks.set(name, timestamp);
    
    if (Platform.OS === 'web') {
      performance.mark(name);
    }
  }

  /**
   * Measure performance between two marks
   */
  measure(name: string, startMark: string, endMark: string): number {
    if (!this.config.enabled) return 0;

    const startTime = this.marks.get(startMark);
    const endTime = this.marks.get(endMark);

    if (!startTime || !endTime) {
      console.warn(`Performance marks not found: ${startMark} or ${endMark}`);
      return 0;
    }

    const duration = endTime - startTime;
    this.measures.set(name, duration);

    if (Platform.OS === 'web') {
      performance.measure(name, startMark, endMark);
    }

    return duration;
  }

  // ✅ ADDED: Ticketing-specific performance tracking
  /**
   * Track ticket purchase performance
   */
  trackTicketPurchase(startTime: number, endTime: number): void {
    if (!this.config.trackTicketing) return;

    const duration = endTime - startTime;
    this.measures.set('ticket_purchase_time', duration);
    
    console.log(`🎫 Ticket Purchase Performance: ${duration}ms`);
    
    // Alert if performance is poor
    if (duration > 5000) {
      console.warn(`⚠️ Slow ticket purchase detected: ${duration}ms`);
    }
  }

  /**
   * Track QR validation performance
   */
  trackQRValidation(startTime: number, endTime: number): void {
    if (!this.config.trackQRValidation) return;

    const duration = endTime - startTime;
    this.measures.set('qr_validation_time', duration);
    
    console.log(`📱 QR Validation Performance: ${duration}ms`);
    
    // Alert if performance is poor
    if (duration > 1000) {
      console.warn(`⚠️ Slow QR validation detected: ${duration}ms`);
    }
  }

  /**
   * Track payment processing performance
   */
  trackPaymentProcessing(startTime: number, endTime: number): void {
    if (!this.config.trackPayments) return;

    const duration = endTime - startTime;
    this.measures.set('payment_processing_time', duration);
    
    console.log(`💳 Payment Processing Performance: ${duration}ms`);
    
    // Alert if performance is poor
    if (duration > 3000) {
      console.warn(`⚠️ Slow payment processing detected: ${duration}ms`);
    }
  }

  /**
   * Track database query performance
   */
  trackDatabaseQuery(queryName: string, startTime: number, endTime: number): void {
    if (!this.config.trackTicketing) return;

    const duration = endTime - startTime;
    this.measures.set(`db_query_${queryName}`, duration);
    
    console.log(`🗄️ Database Query Performance (${queryName}): ${duration}ms`);
    
    // Alert if performance is poor
    if (duration > 2000) {
      console.warn(`⚠️ Slow database query detected (${queryName}): ${duration}ms`);
    }
  }

  /**
   * Collect current performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      loadTime: this.getLoadTime(),
      renderTime: this.getRenderTime(),
      memoryUsage: await this.getMemoryUsage(),
      networkRequests: this.getNetworkRequests(),
      errors: this.getErrorCount(),
      fps: this.getFPS(),
      batteryLevel: await this.getBatteryLevel(),
      networkType: await this.getNetworkType(),
      deviceInfo: await this.getDeviceInfo(),
      timestamp: Date.now(),
      // ✅ ADDED: Ticketing metrics
      ticketPurchaseTime: this.measures.get('ticket_purchase_time') || 0,
      qrValidationTime: this.measures.get('qr_validation_time') || 0,
      ticketListLoadTime: this.measures.get('ticket_list_load_time') || 0,
      paymentProcessingTime: this.measures.get('payment_processing_time') || 0,
      databaseQueryTime: this.measures.get('db_query_total') || 0,
    };

    this.metrics.push(metrics);

    // Keep only the latest metrics
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    return metrics;
  }

  /**
   * Get performance summary for ticketing operations
   */
  getTicketingPerformanceSummary(): {
    averagePurchaseTime: number;
    averageQRValidationTime: number;
    averagePaymentTime: number;
    averageQueryTime: number;
    totalOperations: number;
  } {
    const ticketingMetrics = this.metrics.filter(m => 
      m.ticketPurchaseTime > 0 || 
      m.qrValidationTime > 0 || 
      m.paymentProcessingTime > 0
    );

    if (ticketingMetrics.length === 0) {
      return {
        averagePurchaseTime: 0,
        averageQRValidationTime: 0,
        averagePaymentTime: 0,
        averageQueryTime: 0,
        totalOperations: 0,
      };
    }

    const totalPurchaseTime = ticketingMetrics.reduce((sum, m) => sum + m.ticketPurchaseTime, 0);
    const totalQRTime = ticketingMetrics.reduce((sum, m) => sum + m.qrValidationTime, 0);
    const totalPaymentTime = ticketingMetrics.reduce((sum, m) => sum + m.paymentProcessingTime, 0);
    const totalQueryTime = ticketingMetrics.reduce((sum, m) => sum + m.databaseQueryTime, 0);

    return {
      averagePurchaseTime: totalPurchaseTime / ticketingMetrics.length,
      averageQRValidationTime: totalQRTime / ticketingMetrics.length,
      averagePaymentTime: totalPaymentTime / ticketingMetrics.length,
      averageQueryTime: totalQueryTime / ticketingMetrics.length,
      totalOperations: ticketingMetrics.length,
    };
  }

  /**
   * Log performance summary
   */
  logPerformanceSummary(): void {
    const summary = this.getTicketingPerformanceSummary();
    
    console.log('📊 Ticketing Performance Summary:');
    console.log(`  🎫 Average Purchase Time: ${summary.averagePurchaseTime.toFixed(2)}ms`);
    console.log(`  📱 Average QR Validation: ${summary.averageQRValidationTime.toFixed(2)}ms`);
    console.log(`  💳 Average Payment Time: ${summary.averagePaymentTime.toFixed(2)}ms`);
    console.log(`  🗄️ Average Query Time: ${summary.averageQueryTime.toFixed(2)}ms`);
    console.log(`  📈 Total Operations: ${summary.totalOperations}`);
  }

  /**
   * Get load time metrics
   */
  private getLoadTime(): number {
    return this.measures.get('app_load_time') || 0;
  }

  /**
   * Get render time metrics
   */
  private getRenderTime(): number {
    return this.measures.get('render_time') || 0;
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    if (!this.config.trackMemory) return 0;
    
    // Mock memory usage for now
    return Math.random() * 100;
  }

  /**
   * Get network request count
   */
  private getNetworkRequests(): number {
    return this.measures.get('network_requests') || 0;
  }

  /**
   * Get error count
   */
  private getErrorCount(): number {
    return this.measures.get('error_count') || 0;
  }

  /**
   * Get FPS
   */
  private getFPS(): number {
    return this.measures.get('fps') || 60;
  }

  /**
   * Get battery level
   */
  private async getBatteryLevel(): Promise<number> {
    if (!this.config.trackBattery) return 0;
    
    // Mock battery level for now
    return Math.random() * 100;
  }

  /**
   * Get network type
   */
  private async getNetworkType(): Promise<string> {
    if (!this.config.trackNetwork) return 'unknown';
    
    // Mock network type for now
    return 'wifi';
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: 'Unknown',
      memory: 0,
      cpu: 'Unknown',
    };
  }

  /**
   * Observe navigation performance
   */
  private observeNavigation(): void {
    // This would observe navigation state changes
    // and measure navigation performance
  }

  /**
   * Observe render performance
   */
  private observeRenders(): void {
    // This would observe component render times
    // and measure render performance
  }

  /**
   * Observe network performance
   */
  private observeNetwork(): void {
    // This would observe network requests
    // and measure network performance
  }

  /**
   * Observe memory usage
   */
  private observeMemory(): void {
    // This would observe memory usage changes
    // and measure memory performance
  }

  /**
   * Upload metrics to analytics service
   */
  private async uploadMetrics(): Promise<void> {
    if (!this.config.enabled || this.metrics.length === 0) return;

    try {
      const metricsToUpload = [...this.metrics];
      this.metrics = []; // Clear uploaded metrics

      // Upload to analytics service
      await this.sendToAnalytics(metricsToUpload);
      
      console.log(`Uploaded ${metricsToUpload.length} performance metrics`);
    } catch (error) {
      console.error('Failed to upload performance metrics:', error);
      
      // Restore metrics for retry
      this.metrics.unshift(...this.metrics);
    }
  }

  /**
   * Send metrics to analytics service
   */
  private async sendToAnalytics(metrics: PerformanceMetrics[]): Promise<void> {
    // Implement analytics service integration here
    // Example with Firebase Analytics:
    // await analytics.logEvent('performance_metrics', {
    //   metrics: JSON.stringify(metrics)
    // });
    
    console.log('Performance metrics would be sent to analytics:', metrics.length);
  }

  /**
   * Get performance report
   */
  getReport(): {
    metrics: PerformanceMetrics[];
    summary: {
      averageLoadTime: number;
      averageRenderTime: number;
      averageMemoryUsage: number;
      totalErrors: number;
      averageFPS: number;
    };
  } {
    if (this.metrics.length === 0) {
      return {
        metrics: [],
        summary: {
          averageLoadTime: 0,
          averageRenderTime: 0,
          averageMemoryUsage: 0,
          totalErrors: 0,
          averageFPS: 0
        }
      };
    }

    const summary = {
      averageLoadTime: this.average(this.metrics.map(m => m.loadTime)),
      averageRenderTime: this.average(this.metrics.map(m => m.renderTime)),
      averageMemoryUsage: this.average(this.metrics.map(m => m.memoryUsage)),
      totalErrors: this.metrics.reduce((sum, m) => sum + m.errors, 0),
      averageFPS: this.average(this.metrics.map(m => m.fps))
    };

    return {
      metrics: [...this.metrics],
      summary
    };
  }

  /**
   * Calculate average of numbers
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Start periodic collection of performance metrics
   */
  private startPeriodicCollection(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
    }

    this.uploadTimer = setInterval(async () => {
      if (Math.random() < this.config.sampleRate) {
        await this.collectMetrics();
      }
    }, this.config.uploadInterval);
  }

  private initializeObservers(): void {
    // Initialize performance observers for web
    if (Platform.OS === 'web') {
      // Add web-specific observers here
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
    this.marks.clear();
    this.measures.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Enable/disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    
    if (!enabled) {
      this.destroy();
    } else if (!this.isInitialized) {
      this.initialize();
    }
  }
}

// ✅ ADDED: Singleton instance for easy access
export const performanceMonitor = new PerformanceMonitor({
  enabled: __DEV__, // Only enable in development
  trackTicketing: true,
  trackPayments: true,
  trackQRValidation: true,
});

export default PerformanceMonitor;
