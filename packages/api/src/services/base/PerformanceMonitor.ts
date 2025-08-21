import { BaseService } from './BaseService';

/**
 * ✅ OPTIMIZED: Comprehensive performance monitoring service
 * Provides detailed performance tracking, analytics, and alerting
 */
export class PerformanceMonitor extends BaseService {
  private static metrics = new Map<string, {
    count: number;
    totalTime: number;
    minTime: number;
    maxTime: number;
    errors: number;
    lastUpdated: number;
  }>();

  private static alerts = new Map<string, {
    threshold: number;
    count: number;
    lastAlert: number;
  }>();

  // Performance thresholds
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second
  private static readonly ERROR_RATE_THRESHOLD = 0.1; // 10%
  private static readonly ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes

  /**
   * ✅ OPTIMIZED: Record performance metric
   */
  static recordMetric(
    service: string,
    operation: string,
    duration: number,
    success: boolean
  ): void {
    try {
      const key = `${service}:${operation}`;
      const now = Date.now();

      if (!this.metrics.has(key)) {
        this.metrics.set(key, {
          count: 0,
          totalTime: 0,
          minTime: Infinity,
          maxTime: 0,
          errors: 0,
          lastUpdated: now
        });
      }

      const metric = this.metrics.get(key)!;
      metric.count++;
      metric.totalTime += duration;
      metric.minTime = Math.min(metric.minTime, duration);
      metric.maxTime = Math.max(metric.maxTime, duration);
      metric.lastUpdated = now;

      if (!success) {
        metric.errors++;
      }

      // Check for slow queries
      if (duration > this.SLOW_QUERY_THRESHOLD) {
        this.checkSlowQueryAlert(service, operation, duration);
      }

      // Check for high error rates
      if (metric.count > 10) {
        const errorRate = metric.errors / metric.count;
        if (errorRate > this.ERROR_RATE_THRESHOLD) {
          this.checkErrorRateAlert(service, operation, errorRate);
        }
      }

      // Clean up old metrics (older than 1 hour)
      this.cleanupOldMetrics();
    } catch (error) {
      console.warn('Failed to record performance metric:', error);
    }
  }

  /**
   * ✅ OPTIMIZED: Get performance statistics
   */
  static getPerformanceStats(service?: string): {
    [key: string]: {
      count: number;
      avgTime: number;
      minTime: number;
      maxTime: number;
      errorRate: number;
      lastUpdated: number;
    };
  } {
    const stats: { [key: string]: any } = {};

    for (const [key, metric] of this.metrics.entries()) {
      if (service && !key.startsWith(service)) {
        continue;
      }

      stats[key] = {
        count: metric.count,
        avgTime: metric.count > 0 ? metric.totalTime / metric.count : 0,
        minTime: metric.minTime === Infinity ? 0 : metric.minTime,
        maxTime: metric.maxTime,
        errorRate: metric.count > 0 ? metric.errors / metric.count : 0,
        lastUpdated: metric.lastUpdated
      };
    }

    return stats;
  }

  /**
   * ✅ OPTIMIZED: Get service health status
   */
  static getServiceHealth(service: string): {
    status: 'healthy' | 'warning' | 'critical';
    metrics: any;
    issues: string[];
  } {
    const stats = this.getPerformanceStats(service);
    const issues: string[] = [];
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';

    for (const [operation, metric] of Object.entries(stats)) {
      // Check for slow operations
      if (metric.avgTime > this.SLOW_QUERY_THRESHOLD) {
        issues.push(`Slow operation: ${operation} (${Math.round(metric.avgTime)}ms avg)`);
        status = status === 'healthy' ? 'warning' : 'critical';
      }

      // Check for high error rates
      if (metric.errorRate > this.ERROR_RATE_THRESHOLD) {
        issues.push(`High error rate: ${operation} (${(metric.errorRate * 100).toFixed(1)}%)`);
        status = 'critical';
      }

      // Check for no recent activity
      const timeSinceLastUpdate = Date.now() - metric.lastUpdated;
      if (timeSinceLastUpdate > 10 * 60 * 1000) { // 10 minutes
        issues.push(`No recent activity: ${operation}`);
        status = status === 'healthy' ? 'warning' : status;
      }
    }

    return {
      status,
      metrics: stats,
      issues
    };
  }

  /**
   * ✅ OPTIMIZED: Get system-wide health status
   */
  static getSystemHealth(): {
    status: 'healthy' | 'warning' | 'critical';
    services: { [key: string]: any };
    summary: {
      totalOperations: number;
      avgResponseTime: number;
      errorRate: number;
      slowOperations: number;
    };
  } {
    const allStats = this.getPerformanceStats();
    const services: { [key: string]: any } = {};
    let totalOperations = 0;
    let totalTime = 0;
    let totalErrors = 0;
    let slowOperations = 0;

    // Group by service
    for (const [key, metric] of Object.entries(allStats)) {
      const [service] = key.split(':');
      
      if (!services[service]) {
        services[service] = this.getServiceHealth(service);
      }

      totalOperations += metric.count;
      totalTime += metric.totalTime;
      totalErrors += metric.count * metric.errorRate;

      if (metric.avgTime > this.SLOW_QUERY_THRESHOLD) {
        slowOperations++;
      }
    }

    const avgResponseTime = totalOperations > 0 ? totalTime / totalOperations : 0;
    const errorRate = totalOperations > 0 ? totalErrors / totalOperations : 0;

    // Determine overall status
    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (errorRate > this.ERROR_RATE_THRESHOLD || slowOperations > 5) {
      status = 'critical';
    } else if (errorRate > this.ERROR_RATE_THRESHOLD / 2 || slowOperations > 2) {
      status = 'warning';
    }

    return {
      status,
      services,
      summary: {
        totalOperations,
        avgResponseTime,
        errorRate,
        slowOperations
      }
    };
  }

  /**
   * ✅ OPTIMIZED: Reset performance metrics
   */
  static resetMetrics(service?: string): void {
    if (service) {
      // Reset metrics for specific service
      for (const key of this.metrics.keys()) {
        if (key.startsWith(service)) {
          this.metrics.delete(key);
        }
      }
    } else {
      // Reset all metrics
      this.metrics.clear();
    }
  }

  /**
   * ✅ OPTIMIZED: Export performance data
   */
  static exportMetrics(): {
    metrics: any;
    timestamp: number;
    summary: any;
  } {
    return {
      metrics: Object.fromEntries(this.metrics),
      timestamp: Date.now(),
      summary: this.getSystemHealth().summary
    };
  }

  /**
   * ✅ OPTIMIZED: Check for slow query alerts
   */
  private static checkSlowQueryAlert(service: string, operation: string, duration: number): void {
    const key = `slow:${service}:${operation}`;
    const now = Date.now();

    if (!this.alerts.has(key)) {
      this.alerts.set(key, {
        threshold: this.SLOW_QUERY_THRESHOLD,
        count: 0,
        lastAlert: 0
      });
    }

    const alert = this.alerts.get(key)!;
    alert.count++;

    // Send alert if we haven't sent one recently
    if (now - alert.lastAlert > this.ALERT_COOLDOWN) {
      console.warn(`🚨 Slow Query Alert: ${service}.${operation} took ${Math.round(duration)}ms (${alert.count} occurrences)`);
      alert.lastAlert = now;
    }
  }

  /**
   * ✅ OPTIMIZED: Check for error rate alerts
   */
  private static checkErrorRateAlert(service: string, operation: string, errorRate: number): void {
    const key = `error:${service}:${operation}`;
    const now = Date.now();

    if (!this.alerts.has(key)) {
      this.alerts.set(key, {
        threshold: this.ERROR_RATE_THRESHOLD,
        count: 0,
        lastAlert: 0
      });
    }

    const alert = this.alerts.get(key)!;
    alert.count++;

    // Send alert if we haven't sent one recently
    if (now - alert.lastAlert > this.ALERT_COOLDOWN) {
      console.warn(`🚨 Error Rate Alert: ${service}.${operation} has ${(errorRate * 100).toFixed(1)}% error rate (${alert.count} occurrences)`);
      alert.lastAlert = now;
    }
  }

  /**
   * ✅ OPTIMIZED: Clean up old metrics
   */
  private static cleanupOldMetrics(): void {
    const cutoff = Date.now() - 60 * 60 * 1000; // 1 hour ago

    for (const [key, metric] of this.metrics.entries()) {
      if (metric.lastUpdated < cutoff) {
        this.metrics.delete(key);
      }
    }
  }

  /**
   * ✅ OPTIMIZED: Performance monitoring wrapper
   */
  static async monitor<T>(
    service: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = performance.now();
    let success = false;

    try {
      const result = await fn();
      success = true;
      return result;
    } finally {
      const duration = performance.now() - startTime;
      this.recordMetric(service, operation, duration, success);
    }
  }

  /**
   * ✅ OPTIMIZED: Get performance recommendations
   */
  static getRecommendations(): {
    critical: string[];
    warning: string[];
    info: string[];
  } {
    const recommendations = {
      critical: [] as string[],
      warning: [] as string[],
      info: [] as string[]
    };

    const stats = this.getPerformanceStats();

    for (const [operation, metric] of Object.entries(stats)) {
      const [service] = operation.split(':');

      // Critical recommendations
      if (metric.errorRate > this.ERROR_RATE_THRESHOLD) {
        recommendations.critical.push(
          `Fix high error rate in ${operation}: ${(metric.errorRate * 100).toFixed(1)}%`
        );
      }

      if (metric.avgTime > this.SLOW_QUERY_THRESHOLD * 2) {
        recommendations.critical.push(
          `Optimize slow operation ${operation}: ${Math.round(metric.avgTime)}ms avg`
        );
      }

      // Warning recommendations
      if (metric.avgTime > this.SLOW_QUERY_THRESHOLD) {
        recommendations.warning.push(
          `Consider optimizing ${operation}: ${Math.round(metric.avgTime)}ms avg`
        );
      }

      if (metric.errorRate > this.ERROR_RATE_THRESHOLD / 2) {
        recommendations.warning.push(
          `Monitor error rate in ${operation}: ${(metric.errorRate * 100).toFixed(1)}%`
        );
      }

      // Info recommendations
      if (metric.count > 1000) {
        recommendations.info.push(
          `High volume operation ${operation}: ${metric.count} calls`
        );
      }
    }

    return recommendations;
  }
}
