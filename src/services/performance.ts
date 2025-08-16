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
}

export interface DeviceInfo {
  platform: string;
  version: string;
  model: string;
  screenWidth: number;
  screenHeight: number;
  memory: number;
  cpuCores: number;
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
      ...config
    };
  }

  /**
   * Initialize the performance monitor
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set up performance observers
      this.setupObservers();
      
      // Start periodic metrics collection
      this.startPeriodicCollection();
      
      // Start upload timer
      this.startUploadTimer();
      
      this.isInitialized = true;
      console.log('Performance monitor initialized');
    } catch (error) {
      console.error('Failed to initialize performance monitor:', error);
    }
  }

  /**
   * Set up performance observers for automatic metrics collection
   */
  private setupObservers(): void {
    if (!this.config.enabled) return;

    // Observe navigation performance
    this.observeNavigation();
    
    // Observe render performance
    this.observeRenders();
    
    // Observe network performance
    this.observeNetwork();
    
    // Observe memory usage
    if (this.config.trackMemory) {
      this.observeMemory();
    }
  }

  /**
   * Start periodic collection of performance metrics
   */
  private startPeriodicCollection(): void {
    if (!this.config.enabled || !this.config.enableRealTime) return;

    setInterval(() => {
      this.collectMetrics();
    }, 5000); // Collect every 5 seconds
  }

  /**
   * Start timer for uploading metrics
   */
  private startUploadTimer(): void {
    if (!this.config.enabled) return;

    this.uploadTimer = setInterval(() => {
      this.uploadMetrics();
    }, this.config.uploadInterval);
  }

  /**
   * Mark a performance point
   */
  mark(name: string): void {
    if (!this.config.enabled) return;

    const timestamp = performance.now();
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

  /**
   * Collect current performance metrics
   */
  async collectMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {
      loadTime: this.getLoadTime(),
      renderTime: this.getRenderTime(),
      memoryUsage: await this.getMemoryUsage(),
      networkRequests: this.getNetworkRequestCount(),
      errors: this.getErrorCount(),
      fps: await this.getFPS(),
      batteryLevel: await this.getBatteryLevel(),
      networkType: await this.getNetworkType(),
      deviceInfo: await this.getDeviceInfo(),
      timestamp: Date.now()
    };

    this.metrics.push(metrics);

    // Keep only the latest metrics
    if (this.metrics.length > this.config.maxMetrics) {
      this.metrics = this.metrics.slice(-this.config.maxMetrics);
    }

    return metrics;
  }

  /**
   * Get load time metrics
   */
  private getLoadTime(): number {
    const appStartTime = this.marks.get('app_start');
    const appReadyTime = this.marks.get('app_ready');
    
    if (appStartTime && appReadyTime) {
      return appReadyTime - appStartTime;
    }
    
    return 0;
  }

  /**
   * Get render time metrics
   */
  private getRenderTime(): number {
    const renderStartTime = this.marks.get('render_start');
    const renderEndTime = this.marks.get('render_end');
    
    if (renderStartTime && renderEndTime) {
      return renderEndTime - renderStartTime;
    }
    
    return 0;
  }

  /**
   * Get memory usage
   */
  private async getMemoryUsage(): Promise<number> {
    if (!this.config.trackMemory) return 0;

    try {
      // This would need to be implemented with a native module
      // For now, return a placeholder
      return 0;
    } catch (error) {
      console.error('Failed to get memory usage:', error);
      return 0;
    }
  }

  /**
   * Get network request count
   */
  private getNetworkRequestCount(): number {
    // This would need to be tracked via network interceptor
    return 0;
  }

  /**
   * Get error count
   */
  private getErrorCount(): number {
    // This would need to be tracked via error boundary
    return 0;
  }

  /**
   * Get FPS
   */
  private async getFPS(): Promise<number> {
    try {
      // This would need to be implemented with a native module
      return 60; // Placeholder
    } catch (error) {
      console.error('Failed to get FPS:', error);
      return 0;
    }
  }

  /**
   * Get battery level
   */
  private async getBatteryLevel(): Promise<number> {
    if (!this.config.trackBattery) return 0;

    try {
      // This would need to be implemented with a native module
      return 0;
    } catch (error) {
      console.error('Failed to get battery level:', error);
      return 0;
    }
  }

  /**
   * Get network type
   */
  private async getNetworkType(): Promise<string> {
    if (!this.config.trackNetwork) return 'unknown';

    try {
      // This would need to be implemented with a native module
      return 'wifi'; // Placeholder
    } catch (error) {
      console.error('Failed to get network type:', error);
      return 'unknown';
    }
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(): Promise<DeviceInfo> {
    return {
      platform: Platform.OS,
      version: Platform.Version.toString(),
      model: 'Unknown', // Would need native module
      screenWidth: 0, // Would need Dimensions
      screenHeight: 0, // Would need Dimensions
      memory: 0, // Would need native module
      cpuCores: 0 // Would need native module
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
   * Clean up resources
   */
  destroy(): void {
    if (this.uploadTimer) {
      clearInterval(this.uploadTimer);
      this.uploadTimer = null;
    }

    this.observers.forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });

    this.observers = [];
    this.metrics = [];
    this.marks.clear();
    this.measures.clear();
    this.isInitialized = false;
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

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;
