import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
// import { FeedFilter } from '@yardpass/types';

// Temporary type until packages are built
interface FeedFilter {
  type: 'all' | 'following' | 'trending' | 'nearby';
  cursor?: string;
}

interface FeedFilterTabsProps {
  currentFilter: FeedFilter['type'];
  onFilterChange: (filter: FeedFilter['type']) => void;
}

const filters: { key: FeedFilter['type']; label: string }[] = [
  { key: 'for_you', label: 'For You' },
  { key: 'following', label: 'Following' },
  { key: 'near_me', label: 'Near Me' },
  { key: 'trending', label: 'Trending' },
];

export const FeedFilterTabs: React.FC<FeedFilterTabsProps> = ({
  currentFilter,
  onFilterChange,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.key}
          style={[
            styles.tab,
            currentFilter === filter.key && {
              borderBottomColor: theme.colors.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => onFilterChange(filter.key)}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  currentFilter === filter.key
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
              },
            ]}
          >
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

