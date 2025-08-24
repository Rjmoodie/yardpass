import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { theme } from '@/constants/theme';
import { apiGateway } from '@yardpass/api';
import { EventAnalytics } from '@/types';

const AnalyticsScreen: React.FC = () => {
  const [analytics, setAnalytics] = useState<EventAnalytics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // This would typically get the event ID from route params
      const eventId = 'example-event-id';
      const response = await apiGateway.getEventAnalytics({ eventId });
      
      if (response.error) {
        console.error('Error loading analytics:', response.error.message);
        return;
      }
      
      setAnalytics(response.data);
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      <Text style={styles.subtitle}>View your event insights</Text>
      
      <View style={styles.statsContainer}>
        <Text style={styles.sectionTitle}>Event Metrics</Text>
        {analytics.length > 0 ? (
          analytics.map((metric) => (
            <View key={metric.id} style={styles.metricCard}>
              <Text style={styles.metricType}>{metric.metric_type}</Text>
              <Text style={styles.metricValue}>
                {metric.metric_value || 'N/A'}
              </Text>
              <Text style={styles.metricDate}>
                {new Date(metric.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No analytics data available</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
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
  title: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    fontSize: theme.typography.body.fontSize,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  statsContainer: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.h3.fontSize,
    fontWeight: theme.typography.h3.fontWeight as any,
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  metricCard: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  metricType: {
    fontSize: theme.typography.caption.fontSize,
    fontWeight: theme.typography.caption.fontWeight as any,
    color: theme.colors.textSecondary,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: theme.typography.h1.fontSize,
    fontWeight: theme.typography.h1.fontWeight as any,
    color: theme.colors.text,
    marginTop: theme.spacing.xs,
  },
  metricDate: {
    fontSize: theme.typography.caption.fontSize,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.xs,
  },
  noDataText: {
    textAlign: 'center',
    color: theme.colors.textSecondary,
    fontSize: theme.typography.body.fontSize,
    fontStyle: 'italic',
  },
});

export default AnalyticsScreen;
