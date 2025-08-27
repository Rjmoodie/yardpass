import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { apiGateway } from '@yardpass/api';
import {
  EnhancedAnalyticsData,
  AnalyticsInsights,
  AnalyticsPredictions,
  AnalyticsComparisons,
  AnalyticsMeta,
} from '@yardpass/types';

const { width: screenWidth } = Dimensions.get('window');

interface AnalyticsTab {
  id: string;
  title: string;
  icon: string;
  analyticsType: 'event' | 'enterprise' | 'performance' | 'comprehensive';
}

const ANALYTICS_TABS: AnalyticsTab[] = [
  { id: 'overview', title: 'Overview', icon: 'analytics', analyticsType: 'comprehensive' },
  { id: 'revenue', title: 'Revenue', icon: 'cash', analyticsType: 'event' },
  { id: 'attendance', title: 'Attendance', icon: 'people', analyticsType: 'event' },
  { id: 'engagement', title: 'Engagement', icon: 'trending-up', analyticsType: 'event' },
  { id: 'performance', title: 'Performance', icon: 'speedometer', analyticsType: 'performance' },
  { id: 'enterprise', title: 'Enterprise', icon: 'business', analyticsType: 'enterprise' },
];

const TIME_PERIODS = [
  { label: 'Last 24 Hours', value: 'day' },
  { label: 'Last 7 Days', value: 'week' },
  { label: 'Last 30 Days', value: 'month' },
  { label: 'Last Quarter', value: 'quarter' },
  { label: 'Last Year', value: 'year' },
];

interface EnhancedAnalyticsScreenProps {
  route: {
    params: {
      eventId?: string;
      organizationId?: string;
    };
  };
}

const EnhancedAnalyticsScreen: React.FC<EnhancedAnalyticsScreenProps> = ({ route }) => {
  const { eventId, organizationId } = route.params || {};
  
  // State management
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('month');
  const [analyticsData, setAnalyticsData] = useState<EnhancedAnalyticsData | null>(null);
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [predictions, setPredictions] = useState<AnalyticsPredictions | null>(null);
  const [comparisons, setComparisons] = useState<AnalyticsComparisons | null>(null);
  const [meta, setMeta] = useState<AnalyticsMeta | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get current tab configuration
  const currentTab = useMemo(() => 
    ANALYTICS_TABS.find(tab => tab.id === activeTab) || ANALYTICS_TABS[0], 
    [activeTab]
  );

  // Load analytics data
  const loadAnalytics = async (forceRefresh = false) => {
    try {
      setError(null);
      const startTime = Date.now();

      const params = {
        analytics_type: currentTab.analyticsType,
        period: selectedPeriod as any,
        include_insights: true,
        include_predictions: activeTab === 'overview',
        include_comparisons: activeTab === 'overview',
        force_refresh: forceRefresh,
      };

      // Add entity-specific parameters
      if (eventId) {
        params.event_id = eventId;
      }
      if (organizationId) {
        params.organization_id = organizationId;
      }

      const response = await apiGateway.getEnhancedAnalytics(params);

      if (response.error) {
        throw new Error(response.error.message || 'Failed to load analytics');
      }

      const { data, insights: responseInsights, predictions: responsePredictions, comparisons: responseComparisons, meta: responseMeta } = response.data;

      setAnalyticsData(data);
      setInsights(responseInsights);
      setPredictions(responsePredictions);
      setComparisons(responseComparisons);
      setMeta(responseMeta);

      console.log(`Analytics loaded in ${Date.now() - startTime}ms`);
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadAnalytics();
  }, [activeTab, selectedPeriod, eventId, organizationId]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadAnalytics(true);
  };

  // Handle tab change
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setLoading(true);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  // Format number
  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Get chart data for revenue
  const getRevenueChartData = () => {
    if (!analyticsData?.revenue?.daily_breakdown) return null;

    return {
      labels: analyticsData.revenue.daily_breakdown.slice(-7).map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        data: analyticsData.revenue.daily_breakdown.slice(-7).map(item => item.revenue || 0),
      }],
    };
  };

  // Get chart data for attendance
  const getAttendanceChartData = () => {
    if (!analyticsData?.attendance?.daily_breakdown) return null;

    return {
      labels: analyticsData.attendance.daily_breakdown.slice(-7).map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        data: analyticsData.attendance.daily_breakdown.slice(-7).map(item => item.tickets_sold || 0),
      }],
    };
  };

  // Get chart data for engagement
  const getEngagementChartData = () => {
    if (!analyticsData?.engagement?.daily_breakdown) return null;

    return {
      labels: analyticsData.engagement.daily_breakdown.slice(-7).map(item => 
        new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [{
        data: analyticsData.engagement.daily_breakdown.slice(-7).map(item => item.views || 0),
      }],
    };
  };

  // Render metric card
  const renderMetricCard = (title: string, value: string | number, subtitle?: string, trend?: { value: number; direction: 'up' | 'down' }) => (
    <View style={styles.metricCard}>
      <Text style={styles.metricTitle}>{title}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {subtitle && <Text style={styles.metricSubtitle}>{subtitle}</Text>}
      {trend && (
        <View style={styles.trendContainer}>
          <Ionicons 
            name={trend.direction === 'up' ? 'trending-up' : 'trending-down'} 
            size={16} 
            color={trend.direction === 'up' ? theme.colors.success : theme.colors.error} 
          />
          <Text style={[styles.trendText, { color: trend.direction === 'up' ? theme.colors.success : theme.colors.error }]}>
            {trend.value > 0 ? '+' : ''}{formatPercentage(trend.value)}
          </Text>
        </View>
      )}
    </View>
  );

  // Render insights section
  const renderInsights = () => {
    if (!insights) return null;

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.sectionTitle}>Insights & Recommendations</Text>
        
        {insights.engagement_opportunities?.map((opportunity, index) => (
          <View key={index} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <Ionicons 
                name="bulb" 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text style={styles.insightTitle}>{opportunity.insight}</Text>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(opportunity.priority) }]}>
                <Text style={styles.priorityText}>{opportunity.priority}</Text>
              </View>
            </View>
            <Text style={styles.insightAction}>{opportunity.action}</Text>
          </View>
        ))}

        {insights.top_performing_days && (
          <View style={styles.insightCard}>
            <Text style={styles.insightSubtitle}>Top Performing Days</Text>
            {insights.top_performing_days.slice(0, 3).map((day, index) => (
              <View key={index} style={styles.performingDay}>
                <Text style={styles.dayDate}>{new Date(day.date).toLocaleDateString()}</Text>
                <Text style={styles.dayScore}>Score: {day.performance_score}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Render predictions section
  const renderPredictions = () => {
    if (!predictions) return null;

    return (
      <View style={styles.predictionsContainer}>
        <Text style={styles.sectionTitle}>Predictions & Forecasts</Text>
        
        <View style={styles.predictionGrid}>
          {predictions.projected_revenue && (
            <View style={styles.predictionCard}>
              <Text style={styles.predictionLabel}>Projected Revenue</Text>
              <Text style={styles.predictionValue}>{formatCurrency(predictions.projected_revenue)}</Text>
              <Text style={styles.predictionConfidence}>
                Confidence: {predictions.confidence_level}
              </Text>
            </View>
          )}
          
          {predictions.projected_attendance && (
            <View style={styles.predictionCard}>
              <Text style={styles.predictionLabel}>Projected Attendance</Text>
              <Text style={styles.predictionValue}>{formatNumber(predictions.projected_attendance)}</Text>
              <Text style={styles.predictionConfidence}>
                Confidence: {predictions.confidence_level}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return theme.colors.error;
      case 'medium': return theme.colors.warning;
      case 'low': return theme.colors.success;
      default: return theme.colors.primary;
    }
  };

  // Render loading state
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  // Render error state
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorTitle}>Error Loading Analytics</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => loadAnalytics(true)}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Analytics Dashboard</Text>
        <View style={styles.headerControls}>
          <Picker
            selectedValue={selectedPeriod}
            style={styles.periodPicker}
            onValueChange={setSelectedPeriod}
          >
            {TIME_PERIODS.map(period => (
              <Picker.Item key={period.value} label={period.label} value={period.value} />
            ))}
          </Picker>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Ionicons name="refresh" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Navigation */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false} 
        style={styles.tabContainer}
      >
        {ANALYTICS_TABS.map(tab => (
          <TouchableOpacity
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.activeTab]}
            onPress={() => handleTabChange(tab.id)}
          >
            <Ionicons 
              name={tab.icon as any} 
              size={20} 
              color={activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary} 
            />
            <Text style={[styles.tabText, activeTab === tab.id && styles.activeTabText]}>
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Meta Information */}
        {meta && (
          <View style={styles.metaContainer}>
            <Text style={styles.metaText}>
              Generated {new Date(meta.generated_at).toLocaleString()} • 
              {meta.source === 'cache' ? ' Cached' : ' Live'} • 
              {meta.processing_time_ms}ms • 
              {meta.data_points} data points
            </Text>
          </View>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && analyticsData && (
          <View>
            {/* Summary Metrics */}
            <View style={styles.metricsGrid}>
              {analyticsData.revenue?.summary && (
                <>
                  {renderMetricCard(
                    'Total Revenue',
                    formatCurrency(analyticsData.revenue.summary.total_revenue || 0),
                    `${analyticsData.revenue.summary.transaction_count || 0} transactions`
                  )}
                  {renderMetricCard(
                    'Net Revenue',
                    formatCurrency(analyticsData.revenue.summary.net_revenue || 0),
                    'After platform fees'
                  )}
                </>
              )}
              
              {analyticsData.attendance?.summary && (
                <>
                  {renderMetricCard(
                    'Total Tickets',
                    formatNumber(analyticsData.attendance.summary.total_tickets || 0),
                    `${analyticsData.attendance.summary.used_tickets || 0} used`
                  )}
                  {renderMetricCard(
                    'Attendance Rate',
                    formatPercentage(analyticsData.attendance.summary.attendance_rate || 0),
                    'Tickets used vs sold'
                  )}
                </>
              )}
              
              {analyticsData.engagement?.summary && (
                <>
                  {renderMetricCard(
                    'Total Views',
                    formatNumber(analyticsData.engagement.summary.total_views || 0),
                    `${analyticsData.engagement.summary.unique_viewers || 0} unique viewers`
                  )}
                  {renderMetricCard(
                    'Engagement Rate',
                    formatPercentage(analyticsData.engagement.summary.engagement_rate || 0),
                    'Posts per view'
                  )}
                </>
              )}
            </View>

            {/* Charts */}
            <View style={styles.chartsContainer}>
              {getRevenueChartData() && (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Revenue Trend</Text>
                  <LineChart
                    data={getRevenueChartData()!}
                    width={screenWidth - 32}
                    height={220}
                    chartConfig={{
                      backgroundColor: theme.colors.surface,
                      backgroundGradientFrom: theme.colors.surface,
                      backgroundGradientTo: theme.colors.surface,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                    }}
                    bezier
                    style={styles.chart}
                  />
                </View>
              )}

              {getAttendanceChartData() && (
                <View style={styles.chartCard}>
                  <Text style={styles.chartTitle}>Attendance Trend</Text>
                  <BarChart
                    data={getAttendanceChartData()!}
                    width={screenWidth - 32}
                    height={220}
                    chartConfig={{
                      backgroundColor: theme.colors.surface,
                      backgroundGradientFrom: theme.colors.surface,
                      backgroundGradientTo: theme.colors.surface,
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                      labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                      style: {
                        borderRadius: 16,
                      },
                    }}
                    style={styles.chart}
                  />
                </View>
              )}
            </View>

            {/* Insights */}
            {renderInsights()}

            {/* Predictions */}
            {renderPredictions()}
          </View>
        )}

        {/* Revenue Tab */}
        {activeTab === 'revenue' && analyticsData?.revenue && (
          <View>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'Total Revenue',
                formatCurrency(analyticsData.revenue.summary.total_revenue || 0)
              )}
              {renderMetricCard(
                'Net Revenue',
                formatCurrency(analyticsData.revenue.summary.net_revenue || 0)
              )}
              {renderMetricCard(
                'Platform Fees',
                formatCurrency(analyticsData.revenue.summary.platform_fees || 0)
              )}
              {renderMetricCard(
                'Transactions',
                formatNumber(analyticsData.revenue.summary.transaction_count || 0)
              )}
            </View>

            {getRevenueChartData() && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Revenue Trend</Text>
                <LineChart
                  data={getRevenueChartData()!}
                  width={screenWidth - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.colors.surface,
                    backgroundGradientFrom: theme.colors.surface,
                    backgroundGradientTo: theme.colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}
          </View>
        )}

        {/* Attendance Tab */}
        {activeTab === 'attendance' && analyticsData?.attendance && (
          <View>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'Total Tickets',
                formatNumber(analyticsData.attendance.summary.total_tickets || 0)
              )}
              {renderMetricCard(
                'Used Tickets',
                formatNumber(analyticsData.attendance.summary.used_tickets || 0)
              )}
              {renderMetricCard(
                'Attendance Rate',
                formatPercentage(analyticsData.attendance.summary.attendance_rate || 0)
              )}
            </View>

            {getAttendanceChartData() && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Ticket Sales Trend</Text>
                <BarChart
                  data={getAttendanceChartData()!}
                  width={screenWidth - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.colors.surface,
                    backgroundGradientFrom: theme.colors.surface,
                    backgroundGradientTo: theme.colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(34, 197, 94, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                  }}
                  style={styles.chart}
                />
              </View>
            )}
          </View>
        )}

        {/* Engagement Tab */}
        {activeTab === 'engagement' && analyticsData?.engagement && (
          <View>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'Total Views',
                formatNumber(analyticsData.engagement.summary.total_views || 0)
              )}
              {renderMetricCard(
                'Unique Viewers',
                formatNumber(analyticsData.engagement.summary.unique_viewers || 0)
              )}
              {renderMetricCard(
                'Total Posts',
                formatNumber(analyticsData.engagement.summary.total_posts || 0)
              )}
              {renderMetricCard(
                'Engagement Rate',
                formatPercentage(analyticsData.engagement.summary.engagement_rate || 0)
              )}
            </View>

            {getEngagementChartData() && (
              <View style={styles.chartCard}>
                <Text style={styles.chartTitle}>Engagement Trend</Text>
                <LineChart
                  data={getEngagementChartData()!}
                  width={screenWidth - 32}
                  height={220}
                  chartConfig={{
                    backgroundColor: theme.colors.surface,
                    backgroundGradientFrom: theme.colors.surface,
                    backgroundGradientTo: theme.colors.surface,
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(168, 85, 247, ${opacity})`,
                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    style: {
                      borderRadius: 16,
                    },
                  }}
                  bezier
                  style={styles.chart}
                />
              </View>
            )}
          </View>
        )}

        {/* Performance Tab */}
        {activeTab === 'performance' && analyticsData?.performance && (
          <View>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'Total Metrics',
                formatNumber(analyticsData.performance.summary.total_metrics || 0)
              )}
              {renderMetricCard(
                'Average Performance',
                formatNumber(analyticsData.performance.summary.average_performance || 0)
              )}
            </View>

            {renderInsights()}
          </View>
        )}

        {/* Enterprise Tab */}
        {activeTab === 'enterprise' && analyticsData?.enterprise && (
          <View>
            <View style={styles.metricsGrid}>
              {renderMetricCard(
                'Total Events',
                formatNumber(analyticsData.enterprise.summary.total_events || 0)
              )}
              {renderMetricCard(
                'Total Revenue',
                formatCurrency(analyticsData.enterprise.summary.total_revenue || 0)
              )}
              {renderMetricCard(
                'Conversion Rate',
                formatPercentage(analyticsData.enterprise.summary.conversion_rate || 0)
              )}
              {renderMetricCard(
                'Avg Revenue/Event',
                formatCurrency(analyticsData.enterprise.summary.average_revenue_per_event || 0)
              )}
            </View>

            {renderInsights()}
            {renderPredictions()}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: theme.spacing.md,
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: theme.spacing.lg,
  },
  errorTitle: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  errorMessage: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
  },
  retryButtonText: {
    color: theme.colors.white,
    fontSize: theme.typography.button.fontSize,
    fontWeight: theme.typography.button.fontWeight as any,
  },
  header: {
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  periodPicker: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  refreshButton: {
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
    backgroundColor: theme.colors.background,
  },
  tabContainer: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    marginHorizontal: theme.spacing.xs,
  },
  activeTab: {
    backgroundColor: theme.colors.primary + '20',
    borderRadius: theme.borderRadius.sm,
  },
  tabText: {
    marginLeft: theme.spacing.xs,
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
    fontWeight: theme.typography.caption.fontWeight as any,
  },
  content: {
    flex: 1,
  },
  metaContainer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  metaText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricTitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  metricValue: {
    fontSize: theme.typography.h2.fontSize,
    fontWeight: theme.typography.h2.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  metricSubtitle: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: theme.spacing.xs,
  },
  trendText: {
    fontSize: theme.typography.caption.fontSize,
    marginLeft: theme.spacing.xs,
  },
  chartsContainer: {
    padding: theme.spacing.md,
  },
  chartCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chartTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  chart: {
    marginVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  insightsContainer: {
    padding: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  insightCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  insightTitle: {
    flex: 1,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight as any,
    color: theme.colors.text,
    marginLeft: theme.spacing.sm,
  },
  priorityBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  priorityText: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.white,
    textTransform: 'uppercase',
  },
  insightAction: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  insightSubtitle: {
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.body.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  performingDay: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  dayDate: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.text,
  },
  dayScore: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
  },
  predictionsContainer: {
    padding: theme.spacing.md,
  },
  predictionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  predictionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  predictionLabel: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
  predictionValue: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  predictionConfidence: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
  },
});

export default EnhancedAnalyticsScreen;
