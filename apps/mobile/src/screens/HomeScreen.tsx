import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { VideoFeed } from '../components/feed/VideoFeed';
import { FeedFilterTabs } from '../components/feed/FeedFilterTabs';
// import { FeedFilter } from '@yardpass/types';

// Temporary type until packages are built
interface FeedFilter {
  type: 'all' | 'following' | 'trending' | 'nearby';
  cursor?: string;
}

export const HomeScreen: React.FC = () => {
  const { theme } = useTheme();
  const [currentFilter, setCurrentFilter] = useState<FeedFilter['type']>('for_you');

  const handleFilterChange = (filter: FeedFilter['type']) => {
    setCurrentFilter(filter);
  };

  const handlePostPress = (post: any) => {
    // Handle post press - navigate to post detail or event
    console.log('Post pressed:', post);
  };

  const handleEventPress = (eventId: string) => {
    // Handle event press - navigate to event detail
    console.log('Event pressed:', eventId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <VideoFeed
        filter={{ type: currentFilter, limit: 20 }}
        onFilterChange={handleFilterChange}
        onPostPress={handlePostPress}
        onEventPress={handleEventPress}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

