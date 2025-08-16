import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
  Alert,
  BackHandler,
  StatusBar,
  Platform,
  AccessibilityInfo
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { fetchFeed, clearFeed, setFilters } from '@/store/slices/postsSlice';
import { FeedItemComponent, FeedItemHandles } from '@/components/feed/FeedItemComponent';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';
import { FeedItem, FeedFilter } from '@/types';
import { theme } from '@/constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const HomeScreen: React.FC = () => {
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  
  // Redux state
  const { feed, isLoading, error, filters } = useSelector((state: RootState) => state.posts);
  const { user } = useSelector((state: RootState) => state.auth);
  
  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [currentFilter, setCurrentFilter] = useState<FeedFilter['type']>('for_you');
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  // Refs
  const flatListRef = useRef<FlatList>(null);
  const videoRefs = useRef<Map<number, FeedItemHandles>>(new Map());
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
    minimumViewTime: 100,
  }).current;

  // Memoized values
  const feedItemHeight = useMemo(() => {
    return screenHeight - insets.top - insets.bottom;
  }, [insets.top, insets.bottom]);

  const currentFilterConfig = useMemo((): FeedFilter => {
    return {
      type: currentFilter,
      ...filters
    };
  }, [currentFilter, filters]);

  // Effects
  useEffect(() => {
    loadFeed();
  }, [currentFilterConfig]);

  useEffect(() => {
    if (error) {
      setHasError(true);
      Alert.alert('Error', error, [
        { text: 'Retry', onPress: () => handleRetry() },
        { text: 'OK', style: 'cancel' }
      ]);
    } else {
      setHasError(false);
    }
  }, [error]);

  // Focus effect for video management
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (activeIndex > 0) {
          setActiveIndex(activeIndex - 1);
          return true;
        }
        return false;
      };

      BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
    }, [activeIndex])
  );

  // Callbacks
  const loadFeed = useCallback(async () => {
    try {
      setHasError(false);
      await dispatch(fetchFeed(currentFilterConfig)).unwrap();
    } catch (error) {
      console.error('Error loading feed:', error);
      setHasError(true);
    }
  }, [dispatch, currentFilterConfig]);

  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
    loadFeed();
  }, [loadFeed]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(clearFeed());
      await loadFeed();
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, loadFeed]);

  const handleFilterChange = useCallback((filter: FeedFilter['type']) => {
    setCurrentFilter(filter);
    setActiveIndex(0);
    // Reset video refs when filter changes
    videoRefs.current.clear();
  }, []);

  const handleViewableItemsChanged = useCallback(({ viewableItems }: any) => {
    const newVisibleItems = new Set(viewableItems.map((item: any) => item.index));
    setVisibleItems(newVisibleItems);
    
    // Find the most visible item (closest to center)
    if (viewableItems.length > 0) {
      const centerIndex = Math.floor(screenHeight / 2);
      let closestIndex = viewableItems[0].index;
      let minDistance = Math.abs(viewableItems[0].layout.y - centerIndex);
      
      viewableItems.forEach((item: any) => {
        const distance = Math.abs(item.layout.y - centerIndex);
        if (distance < minDistance) {
          minDistance = distance;
          closestIndex = item.index;
        }
      });
      
      setActiveIndex(closestIndex);
    }
  }, []);

  const handlePostPress = useCallback((postId: string) => {
    // Navigate to post details
    console.log('Navigate to post:', postId);
  }, []);

  const handleEventPress = useCallback((eventId: string) => {
    // Navigate to event hub
    console.log('Navigate to event:', eventId);
  }, []);

  const handleAuthorPress = useCallback((userId: string) => {
    // Navigate to user profile
    console.log('Navigate to user:', userId);
  }, []);

  const handleLikePress = useCallback((postId: string) => {
    // Handle like press
    console.log('Like post:', postId);
  }, []);

  const handleSharePress = useCallback((postId: string) => {
    // Handle share press
    console.log('Share post:', postId);
  }, []);

  const handleCommentPress = useCallback((postId: string) => {
    // Navigate to comments
    console.log('Navigate to comments:', postId);
  }, []);

  const handleSavePress = useCallback((postId: string) => {
    // Handle save press
    console.log('Save post:', postId);
  }, []);

  const handleReportPress = useCallback((postId: string) => {
    // Show report modal
    console.log('Report post:', postId);
  }, []);

  const handleUnlockPress = useCallback((postId: string) => {
    // Navigate to ticket purchase
    console.log('Unlock post:', postId);
  }, []);

  const setVideoRef = useCallback((index: number, ref: FeedItemHandles | null) => {
    if (ref) {
      videoRefs.current.set(index, ref);
    } else {
      videoRefs.current.delete(index);
    }
  }, []);

  // Render functions
  const renderFeedItem = useCallback(({ item, index }: { item: FeedItem; index: number }) => {
    const isVisible = visibleItems.has(index);
    const isActive = index === activeIndex;

    return (
      <View style={{ height: feedItemHeight }}>
        <FeedItemComponent
          ref={(ref) => setVideoRef(index, ref)}
          feedItem={item}
          index={index}
          onPostPress={handlePostPress}
          onEventPress={handleEventPress}
          onAuthorPress={handleAuthorPress}
          onLikePress={handleLikePress}
          onSharePress={handleSharePress}
          onCommentPress={handleCommentPress}
          onSavePress={handleSavePress}
          onReportPress={handleReportPress}
          onUnlockPress={handleUnlockPress}
          isVisible={isVisible}
          isActive={isActive}
        />
      </View>
    );
  }, [
    feedItemHeight,
    visibleItems,
    activeIndex,
    handlePostPress,
    handleEventPress,
    handleAuthorPress,
    handleLikePress,
    handleSharePress,
    handleCommentPress,
    handleSavePress,
    handleReportPress,
    handleUnlockPress,
    setVideoRef
  ]);

  const renderEmptyState = useCallback(() => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>
          {hasError ? 'Something went wrong' : 'No posts yet'}
        </Text>
        <Text style={styles.emptyDescription}>
          {hasError 
            ? 'We couldn\'t load your feed. Please try again.'
            : 'Follow some organizers to see their posts here.'
          }
        </Text>
        {hasError && (
          <Text style={styles.retryText} onPress={handleRetry}>
            Tap to retry
          </Text>
        )}
      </View>
    );
  }, [isLoading, hasError, handleRetry]);

  const renderHeader = useCallback(() => {
    return (
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <Text style={styles.headerTitle}>YardPass</Text>
        <FeedFilterTabs
          currentFilter={currentFilter}
          onFilterChange={handleFilterChange}
        />
      </View>
    );
  }, [insets.top, currentFilter, handleFilterChange]);

  const renderFooter = useCallback(() => {
    if (!isLoading || feed.length === 0) return null;

    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading more posts...</Text>
      </View>
    );
  }, [isLoading, feed.length]);

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: feedItemHeight,
    offset: feedItemHeight * index,
    index,
  }), [feedItemHeight]);

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="transparent" 
        translucent 
      />
      
      {renderHeader()}
      
      <FlatList
        ref={flatListRef}
        data={feed}
        renderItem={renderFeedItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={feedItemHeight}
        snapToAlignment="start"
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={handleViewableItemsChanged}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={renderFooter}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={1}
        updateCellsBatchingPeriod={50}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          // Load more posts when reaching end
          if (!isLoading && feed.length > 0) {
            loadFeed();
          }
        }}
        style={styles.flatList}
        contentContainerStyle={styles.contentContainer}
        accessibilityLabel="Feed of event posts"
        accessibilityHint="Swipe up and down to browse posts"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  flatList: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: screenHeight * 0.3,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryText: {
    fontSize: 16,
    color: theme.colors.primary,
    marginTop: theme.spacing.lg,
    textDecorationLine: 'underline',
  },
  footer: {
    paddingVertical: theme.spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});

export default HomeScreen;
