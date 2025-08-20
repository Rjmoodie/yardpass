import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useSmartFeed, useUserAnalytics } from '@/hooks/useSmartServices';
import RecommendationCard from './RecommendationCard';
import { theme } from '@/constants/theme';

interface SmartFeedSectionProps {
  onItemPress?: (item: any) => void;
  onSectionPress?: (section: any) => void;
  showInsights?: boolean;
  maxItemsPerSection?: number;
}

const SmartFeedSection: React.FC<SmartFeedSectionProps> = ({
  onItemPress,
  onSectionPress,
  showInsights = true,
  maxItemsPerSection = 5
}) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const { smartFeedItems, isLoading, hasRecommendations, hasNearbyEvents, hasTrending } = useSmartFeed();
  const { trackEvent } = useUserAnalytics();

  const handleSectionPress = (section: any) => {
    trackEvent('smart_feed_section_clicked', {
      section_type: section.type,
      section_title: section.title,
      item_count: section.items.length
    });
    onSectionPress?.(section);
  };

  const handleItemPress = (item: any, sectionType: string) => {
    trackEvent('smart_feed_item_clicked', {
      item_id: item.id,
      item_type: item.type,
      section_type: sectionType,
      relevance_score: item.relevanceScore
    });
    onItemPress?.(item);
  };

  const renderSectionHeader = (section: any) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Ionicons 
          name={getSectionIcon(section.type)} 
          size={20} 
          color={getSectionColor(section.type)} 
        />
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {section.title}
        </Text>
        {section.insights && showInsights && (
          <View style={styles.insightsContainer}>
            <Text style={[styles.insightsText, { color: theme.colors.textSecondary }]}>
              {section.insights.totalEvents} events
            </Text>
            {section.insights.averageDistance && (
              <Text style={[styles.insightsText, { color: theme.colors.textSecondary }]}>
                {Math.round(section.insights.averageDistance / 1000)}km avg
              </Text>
            )}
          </View>
        )}
      </View>
      
      <TouchableOpacity
        style={styles.seeAllButton}
        onPress={() => handleSectionPress(section)}
      >
        <Text style={[styles.seeAllText, { color: theme.colors.primary }]}>
          See All
        </Text>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderSectionItem = ({ item, index }: { item: any; index: number }) => (
    <RecommendationCard
      item={item}
      onPress={(item) => handleItemPress(item, 'recommendations')}
      showRelevance={true}
      style={styles.recommendationCard}
    />
  );

  const renderSection = ({ item: section }: { item: any }) => (
    <View style={styles.section}>
      {renderSectionHeader(section)}
      
      <FlatList
        data={section.items.slice(0, maxItemsPerSection)}
        renderItem={renderSectionItem}
        keyExtractor={(item) => `${section.type}-${item.id}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.sectionContent}
        ListEmptyComponent={
          <View style={styles.emptySection}>
            <Ionicons name="information-circle-outline" size={24} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No {section.type} available
            </Text>
          </View>
        }
      />
    </View>
  );

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'recommendations':
        return 'star-outline';
      case 'nearby':
        return 'location-outline';
      case 'trending':
        return 'trending-up-outline';
      default:
        return 'grid-outline';
    }
  };

  const getSectionColor = (type: string) => {
    switch (type) {
      case 'recommendations':
        return theme.colors.primary;
      case 'nearby':
        return theme.colors.success;
      case 'trending':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading personalized content...
        </Text>
      </View>
    );
  }

  if (smartFeedItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="heart-outline" size={48} color={theme.colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>
          No Personalized Content Yet
        </Text>
        <Text style={[styles.emptyDescription, { color: theme.colors.textSecondary }]}>
          Start searching and interacting with events to get personalized recommendations
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={smartFeedItems}
        renderItem={renderSection}
        keyExtractor={(item) => item.type}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>
              Personalized for You
            </Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textSecondary }]}>
              Based on your interests and location
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  insightsContainer: {
    flexDirection: 'row',
    marginLeft: 12,
  },
  insightsText: {
    fontSize: 12,
    marginRight: 8,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 2,
  },
  sectionContent: {
    paddingHorizontal: 8,
  },
  recommendationCard: {
    marginHorizontal: 4,
  },
  emptySection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});

export default SmartFeedSection;
