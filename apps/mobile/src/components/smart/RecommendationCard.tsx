import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useUserAnalytics } from '@/hooks/useSmartServices';
import { theme } from '@/constants/theme';

const { width: screenWidth } = Dimensions.get('window');

interface RecommendationCardProps {
  item: {
    id: string;
    type: 'event' | 'post' | 'user' | 'organization';
    title: string;
    description?: string;
    image?: string;
    relevanceScore?: number;
    metadata?: {
      category?: string;
      startDate?: string;
      location?: string;
      price?: number;
      attendees?: number;
    };
  };
  onPress?: (item: any) => void;
  showRelevance?: boolean;
  style?: any;
}

const RecommendationCard: React.FC<RecommendationCardProps> = ({
  item,
  onPress,
  showRelevance = true,
  style
}) => {
  const { currentTheme } = useTheme();
  const theme = currentTheme;
  const { trackEvent } = useUserAnalytics();

  const handlePress = () => {
    trackEvent('recommendation_clicked', {
      item_id: item.id,
      item_type: item.type,
      relevance_score: item.relevanceScore,
      position: 'card'
    });
    onPress?.(item);
  };

  const getTypeIcon = () => {
    switch (item.type) {
      case 'event':
        return 'calendar-outline';
      case 'post':
        return 'chatbubble-outline';
      case 'user':
        return 'person-outline';
      case 'organization':
        return 'business-outline';
      default:
        return 'star-outline';
    }
  };

  const getTypeColor = () => {
    switch (item.type) {
      case 'event':
        return theme.colors.primary;
      case 'post':
        return theme.colors.secondary;
      case 'user':
        return theme.colors.success;
      case 'organization':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'Free';
    return `$${price}`;
  };

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { 
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          ...theme.shadows?.md
        },
        style
      ]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      {/* Image */}
      {item.image && (
        <Image
          source={{ uri: item.image }}
          style={styles.image}
          resizeMode="cover"
        />
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Ionicons 
              name={getTypeIcon()} 
              size={16} 
              color={getTypeColor()} 
            />
            <Text style={[styles.typeText, { color: getTypeColor() }]}>
              {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
            </Text>
          </View>
          
          {showRelevance && item.relevanceScore && (
            <View style={styles.relevanceContainer}>
              <Ionicons 
                name="star" 
                size={12} 
                color={theme.colors.warning} 
              />
              <Text style={[styles.relevanceText, { color: theme.colors.warning }]}>
                {Math.round(item.relevanceScore * 100)}%
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>
          {item.title}
        </Text>

        {/* Description */}
        {item.description && (
          <Text style={[styles.description, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.description}
          </Text>
        )}

        {/* Metadata */}
        <View style={styles.metadata}>
          {item.metadata?.category && (
            <View style={styles.metaItem}>
              <Ionicons name="pricetag-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {item.metadata.category}
              </Text>
            </View>
          )}

          {item.metadata?.startDate && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {formatDate(item.metadata.startDate)}
              </Text>
            </View>
          )}

          {item.metadata?.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {item.metadata.location}
              </Text>
            </View>
          )}

          {item.metadata?.price !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="card-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {formatPrice(item.metadata.price)}
              </Text>
            </View>
          )}

          {item.metadata?.attendees && (
            <View style={styles.metaItem}>
              <Ionicons name="people-outline" size={12} color={theme.colors.textSecondary} />
              <Text style={[styles.metaText, { color: theme.colors.textSecondary }]}>
                {item.metadata.attendees} attending
              </Text>
            </View>
          )}
        </View>

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.colors.primary }]}
            onPress={handlePress}
          >
            <Text style={[styles.actionText, { color: '#FFFFFF' }]}>
              {item.type === 'event' ? 'View Event' : 
               item.type === 'post' ? 'Read More' :
               item.type === 'user' ? 'View Profile' :
               item.type === 'organization' ? 'View Org' : 'View'}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: screenWidth * 0.85,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  image: {
    width: '100%',
    height: 120,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
    textTransform: 'uppercase',
  },
  relevanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  relevanceText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    marginLeft: 4,
  },
  actionContainer: {
    alignItems: 'flex-end',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
});

export default RecommendationCard;
