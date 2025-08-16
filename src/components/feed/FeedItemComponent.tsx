import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  StyleSheet,
  Animated,
  Alert,
  AccessibilityInfo,
  Vibration
} from 'react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { 
  likePost, 
  sharePost, 
  incrementViewCount, 
  updateWatchTime,
  updateLikeStatus,
  updateShareCount 
} from '@/store/slices/postsSlice';
import { FeedItem, Post, User, Event, AccessLevel } from '@/types';
import { theme } from '@/constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface FeedItemHandles {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  stop: () => Promise<void>;
  unload: () => Promise<void>;
  getStatus: () => Promise<AVPlaybackStatus | null>;
}

interface FeedItemComponentProps {
  feedItem: FeedItem;
  index: number;
  onPostPress: (postId: string) => void;
  onEventPress: (eventId: string) => void;
  onAuthorPress: (userId: string) => void;
  onLikePress: (postId: string) => void;
  onSharePress: (postId: string) => void;
  onCommentPress: (postId: string) => void;
  onSavePress: (postId: string) => void;
  onReportPress: (postId: string) => void;
  onUnlockPress: (postId: string) => void;
  isVisible: boolean;
  isActive: boolean;
}

const FeedItemComponent = forwardRef<FeedItemHandles, FeedItemComponentProps>(
  ({ 
    feedItem, 
    index, 
    onPostPress, 
    onEventPress, 
    onAuthorPress, 
    onLikePress, 
    onSharePress, 
    onCommentPress, 
    onSavePress, 
    onReportPress, 
    onUnlockPress,
    isVisible,
    isActive 
  }, ref) => {
    const dispatch = useDispatch();
    const { user } = useSelector((state: RootState) => state.auth);
    const { currentPost } = useSelector((state: RootState) => state.posts);

    // Refs
    const videoRef = useRef<Video>(null);
    const likeAnimationRef = useRef(new Animated.Value(1)).current;
    const shareAnimationRef = useRef(new Animated.Value(1)).current;
    const fadeAnimRef = useRef(new Animated.Value(0)).current;

    // State
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLiked, setIsLiked] = useState(feedItem.post.isLiked);
    const [isSaved, setIsSaved] = useState(feedItem.post.isSaved);
    const [isShared, setIsShared] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const [watchTime, setWatchTime] = useState(0);
    const [showGatedOverlay, setShowGatedOverlay] = useState(feedItem.isGated && !feedItem.hasAccess);
    const [showControls, setShowControls] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Memoized values
    const canAccessContent = useMemo(() => {
      return feedItem.hasAccess || !feedItem.isGated;
    }, [feedItem.hasAccess, feedItem.isGated]);

    const shouldAutoPlay = useMemo(() => {
      return isVisible && isActive && canAccessContent && !showGatedOverlay;
    }, [isVisible, isActive, canAccessContent, showGatedOverlay]);

    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      play: async () => {
        try {
          if (videoRef.current && canAccessContent && !showGatedOverlay) {
            await videoRef.current.playAsync();
            setIsPlaying(true);
          }
        } catch (error) {
          console.error('Error playing video:', error);
          setHasError(true);
        }
      },
      pause: async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.pauseAsync();
            setIsPlaying(false);
          }
        } catch (error) {
          console.error('Error pausing video:', error);
        }
      },
      stop: async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.stopAsync();
            setIsPlaying(false);
          }
        } catch (error) {
          console.error('Error stopping video:', error);
        }
      },
      unload: async () => {
        try {
          if (videoRef.current) {
            await videoRef.current.unloadAsync();
            setIsPlaying(false);
          }
        } catch (error) {
          console.error('Error unloading video:', error);
        }
      },
      getStatus: async () => {
        try {
          if (videoRef.current) {
            return await videoRef.current.getStatusAsync();
          }
          return null;
        } catch (error) {
          console.error('Error getting video status:', error);
          return null;
        }
      }
    }));

    // Effects
    useEffect(() => {
      if (shouldAutoPlay) {
        playVideo();
      } else {
        pauseVideo();
      }
    }, [shouldAutoPlay]);

    useEffect(() => {
      // Fade in animation
      Animated.timing(fadeAnimRef, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, []);

    useEffect(() => {
      // Track view when post becomes visible
      if (isVisible && !hasError) {
        dispatch(incrementViewCount(feedItem.post.id));
      }
    }, [isVisible, hasError]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        if (videoRef.current) {
          videoRef.current.unloadAsync().catch(console.error);
        }
      };
    }, []);

    // Callbacks
    const playVideo = useCallback(async () => {
      try {
        if (videoRef.current && canAccessContent && !showGatedOverlay) {
          await videoRef.current.playAsync();
          setIsPlaying(true);
        }
      } catch (error) {
        console.error('Error playing video:', error);
        setHasError(true);
      }
    }, [canAccessContent, showGatedOverlay]);

    const pauseVideo = useCallback(async () => {
      try {
        if (videoRef.current) {
          await videoRef.current.pauseAsync();
          setIsPlaying(false);
        }
      } catch (error) {
        console.error('Error pausing video:', error);
      }
    }, []);

    const handleVideoLoad = useCallback(() => {
      setIsLoading(false);
      setHasError(false);
    }, []);

    const handleVideoError = useCallback((error: any) => {
      console.error('Video error:', error);
      setHasError(true);
      setIsLoading(false);
    }, []);

    const handleVideoProgress = useCallback((status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        setWatchTime(status.positionMillis);
        
        // Update watch time in backend every 5 seconds
        if (status.positionMillis % 5000 < 100) {
          dispatch(updateWatchTime({ 
            postId: feedItem.post.id, 
            watchTime: status.positionMillis 
          }));
        }
      }
    }, [feedItem.post.id]);

    const handleLikePress = useCallback(async () => {
      if (!user) {
        Alert.alert('Sign In Required', 'Please sign in to like posts');
        return;
      }

      try {
        // Optimistic update
        const newLikedState = !isLiked;
        setIsLiked(newLikedState);
        dispatch(updateLikeStatus({ postId: feedItem.post.id, liked: newLikedState }));

        // Animate like button
        Animated.sequence([
          Animated.timing(likeAnimationRef, {
            toValue: 1.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(likeAnimationRef, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        // Haptic feedback
        Vibration.vibrate(50);

        // Dispatch to backend
        dispatch(likePost(feedItem.post.id));
      } catch (error) {
        console.error('Error liking post:', error);
        // Revert optimistic update
        setIsLiked(!isLiked);
        dispatch(updateLikeStatus({ postId: feedItem.post.id, liked: !isLiked }));
      }
    }, [isLiked, user, feedItem.post.id]);

    const handleSharePress = useCallback(async () => {
      if (!user) {
        Alert.alert('Sign In Required', 'Please sign in to share posts');
        return;
      }

      try {
        // Optimistic update
        setIsShared(true);
        dispatch(updateShareCount({ postId: feedItem.post.id }));

        // Animate share button
        Animated.sequence([
          Animated.timing(shareAnimationRef, {
            toValue: 1.3,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(shareAnimationRef, {
            toValue: 1,
            duration: 100,
            useNativeDriver: true,
          }),
        ]).start();

        // Haptic feedback
        Vibration.vibrate(50);

        // Dispatch to backend
        dispatch(sharePost(feedItem.post.id));
        
        // Call parent handler
        onSharePress(feedItem.post.id);
      } catch (error) {
        console.error('Error sharing post:', error);
        setIsShared(false);
      }
    }, [user, feedItem.post.id, onSharePress]);

    const handleUnlockPress = useCallback(() => {
      onUnlockPress(feedItem.post.id);
    }, [feedItem.post.id, onUnlockPress]);

    const handleLongPress = useCallback(() => {
      setShowControls(true);
      setTimeout(() => setShowControls(false), 3000);
    }, []);

    const handleDoubleTap = useCallback(() => {
      if (!isLiked) {
        handleLikePress();
      }
    }, [isLiked, handleLikePress]);

    const formatNumber = useCallback((num: number): string => {
      if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
      } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
      }
      return num.toString();
    }, []);

    const formatDistance = useCallback((distance?: number): string => {
      if (!distance) return '';
      if (distance < 1) {
        return `${Math.round(distance * 1000)}m away`;
      }
      return `${distance.toFixed(1)}km away`;
    }, []);

    // Render functions
    const renderGatedOverlay = () => {
      if (!showGatedOverlay) return null;

      return (
        <View style={styles.gatedOverlay}>
          <View style={styles.gatedContent}>
            <Ionicons name="lock-closed" size={48} color={theme.colors.gated} />
            <Text style={styles.gatedTitle}>
              {feedItem.post.accessLevel === AccessLevel.VIP ? 'VIP Only' : 'Unlock Access'}
            </Text>
            <Text style={styles.gatedDescription}>
              {feedItem.post.accessLevel === AccessLevel.VIP 
                ? 'Upgrade to VIP to watch exclusive content'
                : 'Get a ticket to unlock this content'
              }
            </Text>
            <TouchableOpacity 
              style={styles.unlockButton}
              onPress={handleUnlockPress}
              activeOpacity={0.8}
            >
              <Text style={styles.unlockButtonText}>
                {feedItem.post.accessLevel === AccessLevel.VIP ? 'Upgrade to VIP' : 'Get Tickets'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    };

    const renderEventChip = () => (
      <TouchableOpacity 
        style={styles.eventChip}
        onPress={() => onEventPress(feedItem.event.id)}
        activeOpacity={0.8}
      >
        <View style={styles.eventChipContent}>
          <View style={[styles.eventCategoryDot, { backgroundColor: theme.eventColors[feedItem.event.category] }]} />
          <Text style={styles.eventTitle} numberOfLines={1}>
            {feedItem.event.title}
          </Text>
          <Text style={styles.eventDate}>
            {new Date(feedItem.event.startDate).toLocaleDateString()}
          </Text>
          {feedItem.event.location?.city && (
            <Text style={styles.eventLocation}>
              {feedItem.event.location.city}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );

    const renderAuthorInfo = () => (
      <View style={styles.authorContainer}>
        <TouchableOpacity 
          style={styles.authorAvatar}
          onPress={() => onAuthorPress(feedItem.author.id)}
          activeOpacity={0.8}
        >
          <Image 
            source={{ uri: feedItem.author.avatarUrl || 'https://via.placeholder.com/40' }}
            style={styles.avatarImage}
          />
          {feedItem.author.isVerified && (
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={12} color={theme.colors.primary} />
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.authorInfo}>
          <Text style={styles.authorName} numberOfLines={1}>
            {feedItem.author.displayName}
          </Text>
          <Text style={styles.postTime}>
            {new Date(feedItem.post.createdAt).toLocaleDateString()}
          </Text>
        </View>
        <TouchableOpacity style={styles.followButton}>
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>
      </View>
    );

    const renderInteractionButtons = () => (
      <View style={styles.interactionButtons}>
        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={handleLikePress}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: likeAnimationRef }] }}>
            <Ionicons 
              name={isLiked ? "heart" : "heart-outline"} 
              size={28} 
              color={isLiked ? theme.colors.error : theme.colors.text} 
            />
          </Animated.View>
          <Text style={styles.interactionCount}>
            {formatNumber(feedItem.post.likes)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={() => onCommentPress(feedItem.post.id)}
          activeOpacity={0.8}
        >
          <Ionicons name="chatbubble-outline" size={28} color={theme.colors.text} />
          <Text style={styles.interactionCount}>
            {formatNumber(feedItem.post.comments)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={handleSharePress}
          activeOpacity={0.8}
        >
          <Animated.View style={{ transform: [{ scale: shareAnimationRef }] }}>
            <Ionicons 
              name={isShared ? "share-social" : "share-outline"} 
              size={28} 
              color={isShared ? theme.colors.primary : theme.colors.text} 
            />
          </Animated.View>
          <Text style={styles.interactionCount}>
            {formatNumber(feedItem.post.shares)}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.interactionButton}
          onPress={() => onSavePress(feedItem.post.id)}
          activeOpacity={0.8}
        >
          <Ionicons 
            name={isSaved ? "bookmark" : "bookmark-outline"} 
            size={28} 
            color={isSaved ? theme.colors.primary : theme.colors.text} 
          />
        </TouchableOpacity>
      </View>
    );

    const renderCaption = () => (
      <View style={styles.captionContainer}>
        <Text style={styles.captionText} numberOfLines={3}>
          <Text style={styles.authorName}>{feedItem.author.displayName}</Text>
          {' '}{feedItem.post.caption}
        </Text>
        {feedItem.post.hashtags.length > 0 && (
          <Text style={styles.hashtags}>
            {feedItem.post.hashtags.map(tag => `#${tag}`).join(' ')}
          </Text>
        )}
      </View>
    );

    const renderSponsoredBadge = () => {
      if (!feedItem.isSponsored) return null;
      
      return (
        <View style={styles.sponsoredBadge}>
          <Text style={styles.sponsoredText}>Sponsored</Text>
        </View>
      );
    };

    const renderPinnedBadge = () => {
      if (!feedItem.post.isPinned) return null;
      
      return (
        <View style={styles.pinnedBadge}>
          <Ionicons name="pin" size={12} color={theme.colors.text} />
          <Text style={styles.pinnedText}>Pinned</Text>
        </View>
      );
    };

    const renderLoadingOverlay = () => {
      if (!isLoading) return null;
      
      return (
        <View style={styles.loadingOverlay}>
          <Ionicons name="reload" size={24} color={theme.colors.text} />
        </View>
      );
    };

    const renderErrorOverlay = () => {
      if (!hasError) return null;
      
      return (
        <View style={styles.errorOverlay}>
          <Ionicons name="alert-circle" size={24} color={theme.colors.error} />
          <Text style={styles.errorText}>Failed to load video</Text>
          <TouchableOpacity style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    };

    return (
      <Animated.View 
        style={[
          styles.container,
          { opacity: fadeAnimRef }
        ]}
        accessible={true}
        accessibilityLabel={`Post by ${feedItem.author.displayName}: ${feedItem.post.caption}`}
        accessibilityHint="Double tap to like, long press for more options"
      >
        {/* Video/Image Content */}
        <View style={styles.mediaContainer}>
          {feedItem.post.type === 'video' ? (
            <Video
              ref={videoRef}
              source={{ uri: feedItem.post.mediaUrl }}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              shouldPlay={shouldAutoPlay}
              isLooping={true}
              isMuted={isMuted}
              usePoster={true}
              posterSource={{ uri: feedItem.post.thumbnailUrl }}
              posterStyle={styles.poster}
              onLoad={handleVideoLoad}
              onError={handleVideoError}
              onPlaybackStatusUpdate={handleVideoProgress}
              // onLongPress={handleLongPress} // Not supported by expo-av Video component
              onDoubleTap={handleDoubleTap}
            />
          ) : (
            <Image
              source={{ uri: feedItem.post.mediaUrl }}
              style={styles.image}
              resizeMode="cover"
              onLoad={handleVideoLoad}
              onError={handleVideoError}
            />
          )}

          {/* Overlays */}
          {renderLoadingOverlay()}
          {renderErrorOverlay()}
          {renderGatedOverlay()}
          {renderSponsoredBadge()}
          {renderPinnedBadge()}

          {/* Event Chip */}
          <View style={styles.eventChipContainer}>
            {renderEventChip()}
          </View>

          {/* Author Info */}
          <View style={styles.authorContainer}>
            {renderAuthorInfo()}
          </View>

          {/* Interaction Buttons */}
          <View style={styles.interactionContainer}>
            {renderInteractionButtons()}
          </View>

          {/* Caption */}
          <View style={styles.captionContainer}>
            {renderCaption()}
          </View>

          {/* Distance Info */}
          {feedItem.distance && (
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceText}>
                {formatDistance(feedItem.distance)}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: theme.colors.background,
  },
  mediaContainer: {
    flex: 1,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  gatedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gatedContent: {
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  gatedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  gatedDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
    marginBottom: theme.spacing.lg,
  },
  unlockButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.lg,
  },
  unlockButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventChipContainer: {
    position: 'absolute',
    top: theme.spacing.xl,
    left: theme.spacing.md,
    right: theme.spacing.md,
  },
  eventChip: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  eventChipContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventCategoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: theme.spacing.sm,
  },
  eventTitle: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
    flex: 1,
  },
  eventDate: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: theme.spacing.sm,
  },
  eventLocation: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    marginLeft: theme.spacing.sm,
  },
  authorContainer: {
    position: 'absolute',
    bottom: 120,
    left: theme.spacing.md,
    right: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  authorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.md,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  postTime: {
    color: theme.colors.textSecondary,
    fontSize: 12,
  },
  followButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.borderRadius.md,
  },
  followButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  interactionContainer: {
    position: 'absolute',
    bottom: 80,
    right: theme.spacing.md,
  },
  interactionButtons: {
    alignItems: 'center',
  },
  interactionButton: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  interactionCount: {
    color: theme.colors.text,
    fontSize: 12,
    marginTop: theme.spacing.xs,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 20,
    left: theme.spacing.md,
    right: 80,
  },
  captionText: {
    color: theme.colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  hashtags: {
    color: theme.colors.primary,
    fontSize: 14,
    marginTop: theme.spacing.xs,
  },
  distanceContainer: {
    position: 'absolute',
    top: theme.spacing.xl,
    right: theme.spacing.md,
  },
  distanceText: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  sponsoredBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
  },
  sponsoredText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  pinnedBadge: {
    position: 'absolute',
    top: theme.spacing.md,
    left: theme.spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pinnedText: {
    color: theme.colors.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: theme.spacing.xs,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  errorText: {
    color: theme.colors.text,
    fontSize: 16,
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginTop: theme.spacing.lg,
  },
  retryButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FeedItemComponent;
