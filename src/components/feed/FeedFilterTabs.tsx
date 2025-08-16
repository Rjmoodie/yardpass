import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';
import { FeedFilter } from '@/types';

interface FeedFilterTabsProps {
  currentFilter: FeedFilter['type'];
  onFilterChange: (filter: FeedFilter['type']) => void;
}

const FeedFilterTabs: React.FC<FeedFilterTabsProps> = ({ 
  currentFilter, 
  onFilterChange 
}) => {
  const filters: { type: FeedFilter['type']; label: string; icon: string }[] = [
    { type: 'for_you', label: 'For You', icon: '🔥' },
    { type: 'following', label: 'Following', icon: '👥' },
    { type: 'near_me', label: 'Near Me', icon: '📍' },
    { type: 'trending', label: 'Trending', icon: '📈' },
  ];

  return (
    <View style={styles.container}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.type}
          style={[
            styles.tab,
            currentFilter === filter.type && styles.activeTab
          ]}
          onPress={() => onFilterChange(filter.type)}
          activeOpacity={0.8}
        >
          <Text style={styles.icon}>{filter.icon}</Text>
          <Text style={[
            styles.label,
            currentFilter === filter.type && styles.activeLabel
          ]}>
            {filter.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  activeTab: {
    backgroundColor: theme.colors.primary,
  },
  icon: {
    fontSize: 16,
    marginRight: theme.spacing.xs,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeLabel: {
    color: theme.colors.text,
  },
});

export default FeedFilterTabs;
