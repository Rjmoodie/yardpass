import React, { useCallback, useMemo } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { Organizer } from '@/types';
import OrganizerCard from './OrganizerCard';

interface OrganizerListProps {
  organizers: Organizer[];
  isLoading?: boolean;
  onOrganizerPress: (organizerId: string) => void;
  onFollowOrganizer?: (organizerId: string) => void;
  followedOrganizers?: string[];
  onEndReached?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement;
}

// ✅ OPTIMIZED: Memoized component with FlatList virtualization
const OrganizerList = React.memo(({
  organizers,
  isLoading = false,
  onOrganizerPress,
  onFollowOrganizer,
  followedOrganizers = [],
  onEndReached,
  onRefresh,
  refreshing = false,
  ListEmptyComponent,
}: OrganizerListProps) => {
  // ✅ OPTIMIZED: Memoized render functions
  const renderOrganizer = useCallback(({ item }: { item: Organizer }) => (
    <OrganizerCard
      organizer={item}
      onPress={onOrganizerPress}
      onFollow={onFollowOrganizer}
      isFollowing={followedOrganizers.includes(item.id)}
    />
  ), [onOrganizerPress, onFollowOrganizer, followedOrganizers]);

  const keyExtractor = useCallback((item: Organizer) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 140, // Approximate height of organizer card
    offset: 140 * index,
    index,
  }), []);

  // ✅ OPTIMIZED: Memoized empty state
  const renderEmptyState = useMemo(() => {
    if (ListEmptyComponent) {
      return ListEmptyComponent;
    }
    
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#00ff88" />
          <Text style={styles.emptyText}>Loading organizers...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No organizers found</Text>
        <Text style={styles.emptySubtext}>Try adjusting your search criteria</Text>
      </View>
    );
  }, [ListEmptyComponent, isLoading]);

  // ✅ OPTIMIZED: Memoized footer
  const renderFooter = useCallback(() => {
    if (!isLoading) return null;
    
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#00ff88" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  }, [isLoading]);

  return (
    <FlatList
      data={organizers}
      renderItem={renderOrganizer}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ListEmptyComponent={renderEmptyState}
      ListFooterComponent={renderFooter}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.1}
      onRefresh={onRefresh}
      refreshing={refreshing}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.container}
      removeClippedSubviews={true}
      maxToRenderPerBatch={5}
      windowSize={10}
      initialNumToRender={3}
      updateCellsBatchingPeriod={50}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  footerText: {
    fontSize: 14,
    color: '#a3a3a3',
    marginLeft: 8,
  },
});

export default OrganizerList;
