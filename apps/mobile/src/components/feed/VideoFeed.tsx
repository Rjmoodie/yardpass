import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  ViewToken,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Platform,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
// import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { Video } from 'expo-av';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  runOnJS,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { VideoPost } from './VideoPost';
import { FeedFilterTabs } from './FeedFilterTabs';
import { LoadingSkeleton } from '../common/LoadingSkeleton';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useAuth } from '../../hooks/useAuth';
import { useFeed } from '../../hooks/useFeed';
import SmartSearchBar from '../smart/SmartSearchBar';
// import { FeedItem, FeedFilter } from '@yardpass/types';

// Temporary types until packages are built
interface FeedItem {
  id: string;
  type: 'video' | 'image' | 'text';
  content: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
}

interface FeedFilter {
  type: 'all' | 'following' | 'trending' | 'nearby';
  cursor?: string;
}
import { theme } from '../../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const ITEM_HEIGHT = SCREEN_HEIGHT;

interface VideoFeedProps {
  filter: FeedFilter;
  onFilterChange: (filter: FeedFilter['type']) => void;
  onPostPress?: (post: FeedItem) => void;
  onEventPress?: (eventId: string) => void;
}

export const VideoFeed: React.FC<VideoFeedProps> = ({
  filter,
  onFilterChange,
  onPostPress,
  onEventPress,
}) => {
  const { user } = useAuth();
  const flatListRef = useRef<FlatList>(null);
  const [visibleItems, setVisibleItems] = useState<Set<string>>(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollY = useSharedValue(0);
  const [showSearch, setShowSearch] = useState(false);

  // Infinite query for feed data
  // Temporarily commented out React Query usage
  // const {
  //   data,
  //   fetchNextPage,
  //   hasNextPage,
  //   isFetchingNextPage,
  //   isLoading,
  //   isError,
  //   error,
  //   refetch,
  // } = useInfiniteQuery({
  //   queryKey: ['feed', filter],
  //   queryFn: ({ pageParam }) => useFeed.fetchFeed({ ...filter, cursor: pageParam }),
  //   getNextPageParam: (lastPage) => lastPage.meta?.cursor,
  //   staleTime: 5 * 60 * 1000, // 5 minutes
  //   cacheTime: 10 * 60 * 1000, // 10 minutes
  //   refetchOnWindowFocus: false,
  //   refetchOnReconnect: true,
  // });

  // Mock data for now
  const data = { pages: [{ items: [], meta: { cursor: null } }] };
  const fetchNextPage = () => {};
  const hasNextPage = false;
  const isFetchingNextPage = false;
  const isLoading = false;
  const isError = false;
  const error = null;
  const refetch = () => {};

  // Flatten pages into single array
  const feedItems = useMemo(() => {
    return data?.pages.flatMap(page => page.items) || [];
  }, [data]);

  // Handle viewability changes for video playback
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const visibleIds = new Set(viewableItems.map(item => item.key));
      setVisibleItems(visibleIds);
      
      if (viewableItems.length > 0) {
        const currentItem = viewableItems[0];
        setCurrentIndex(currentItem.index || 0);
      }
    },
    []
  );

  // Optimized scroll handler
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
    onEndDrag: (event) => {
      // Snap to nearest item
      const targetIndex = Math.round(event.contentOffset.y / ITEM_HEIGHT);
      runOnJS(snapToIndex)(targetIndex);
    },
  });

  const snapToIndex = useCallback((index: number) => {
    if (flatListRef.current) {
      flatListRef.current.scrollToIndex({
        index: Math.max(0, Math.min(index, feedItems.length - 1)),
        animated: true,
      });
    }
  }, [feedItems.length]);

  // Prefetch next page when near end
  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Refresh control
  const refreshControl = (
    <RefreshControl
      refreshing={isLoading}
      onRefresh={refetch}
      tintColor={theme.colors.primary}
      colors={[theme.colors.primary]}
    />
  );

  // Render individual video post
  const renderVideoPost = useCallback(
    ({ item, index }: { item: FeedItem; index: number }) => {
      const isVisible = visibleItems.has(item.id);
      const isActive = index === currentIndex;

      return (
        <VideoPost
          key={item.id}
          feedItem={item}
          index={index}
          isVisible={isVisible}
          isActive={isActive}
          onPress={() => onPostPress?.(item)}
          onEventPress={() => item.post?.event_id && onEventPress?.(item.post.event_id)}
        />
      );
    },
    [visibleItems, currentIndex, onPostPress, onEventPress]
  );

  // Loading skeleton
  if (isLoading && feedItems.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <FeedFilterTabs
              currentFilter={filter.type}
              onFilterChange={onFilterChange}
            />
            <TouchableOpacity style={styles.searchButton}>
              <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <LoadingSkeleton type="video-feed" />
      </View>
    );
  }

  // Error state
  if (isError) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <FeedFilterTabs
              currentFilter={filter.type}
              onFilterChange={onFilterChange}
            />
            <TouchableOpacity style={styles.searchButton}>
              <Ionicons name="search" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <ErrorBoundary
          error={error}
          onRetry={refetch}
          fallback={
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                Failed to load feed. Pull to refresh.
              </Text>
            </View>
          }
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with Search */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <FeedFilterTabs
            currentFilter={filter.type}
            onFilterChange={onFilterChange}
          />
                       <TouchableOpacity 
               style={styles.searchButton}
               onPress={() => setShowSearch(!showSearch)}
             >
               <Ionicons name="search" size={24} color="white" />
             </TouchableOpacity>
        </View>
        
        {/* Smart Search Bar */}
        {showSearch && (
          <View style={styles.searchContainer}>
            <SmartSearchBar 
              placeholder="Search posts, people, events..."
              onSearch={(query) => {
                console.log('Feed search query:', query);
                // You can add navigation to search results here
              }}
              onSuggestionPress={(suggestion) => {
                console.log('Feed suggestion pressed:', suggestion);
                // You can add navigation to search results here
              }}
            />
          </View>
        )}
      </View>
      
      <Animated.FlatList
        ref={flatListRef}
        data={feedItems}
        renderItem={renderVideoPost}
        keyExtractor={(item) => item.id}
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{
          itemVisiblePercentThreshold: 50,
          minimumViewTime: 100,
        }}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={refreshControl}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={1}
        updateCellsBatchingPeriod={50}
        disableIntervalMomentum={true}
        style={styles.flatList}
        contentContainerStyle={styles.contentContainer}
      />

      {/* Loading indicator for next page */}
      {isFetchingNextPage && (
        <View style={styles.loadingIndicator}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  flatList: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  loadingIndicator: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: theme.colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
});

// Performance optimizations
export const MemoizedVideoFeed = React.memo(VideoFeed, (prevProps, nextProps) => {
  return (
    prevProps.filter.type === nextProps.filter.type &&
    prevProps.filter.cursor === nextProps.filter.cursor
  );
});

