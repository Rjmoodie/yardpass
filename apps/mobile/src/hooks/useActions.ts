import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from './useNavigation';
import { Alert } from 'react-native';

// Import Redux actions (these will be created)
// import { likePost, unlikePost, commentOnPost, sharePost, savePost, followUser, unfollowUser } from '../store/slices/postsSlice';
// import { attendEvent, unattendEvent, saveEvent } from '../store/slices/eventsSlice';

export const useActions = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useAuth();
  const { navigateToComments, navigateToUserProfile } = useNavigation();

  // Post Actions
  const handleLikePost = async (postId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to like posts',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigateToComments(postId) }
        ]
      );
      return;
    }

    try {
      // Optimistic update
      // dispatch(likePost({ postId, userId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Liking post:', postId);
      
      // Show success feedback
      // You could add a toast notification here
    } catch (error) {
      console.error('Error liking post:', error);
      Alert.alert('Error', 'Failed to like post. Please try again.');
    }
  };

  const handleUnlikePost = async (postId: string) => {
    if (!isAuthenticated) return;

    try {
      // Optimistic update
      // dispatch(unlikePost({ postId, userId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Unliking post:', postId);
    } catch (error) {
      console.error('Error unliking post:', error);
      Alert.alert('Error', 'Failed to unlike post. Please try again.');
    }
  };

  const handleCommentPost = async (postId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to comment on posts',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigateToComments(postId) }
        ]
      );
      return;
    }

    navigateToComments(postId);
  };

  const handleSharePost = async (postId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to share posts',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigateToComments(postId) }
        ]
      );
      return;
    }

    try {
      // Optimistic update
      // dispatch(sharePost({ postId, userId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Sharing post:', postId);
      
      // Show share options
      Alert.alert(
        'Share Post',
        'Choose how you want to share this post',
        [
          { text: 'Copy Link', onPress: () => console.log('Copy link') },
          { text: 'Share to Social Media', onPress: () => console.log('Share to social') },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error sharing post:', error);
      Alert.alert('Error', 'Failed to share post. Please try again.');
    }
  };

  const handleSavePost = async (postId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save posts',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigateToComments(postId) }
        ]
      );
      return;
    }

    try {
      // Optimistic update
      // dispatch(savePost({ postId, userId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Saving post:', postId);
      
      // Show success feedback
      Alert.alert('Success', 'Post saved to your collection!');
    } catch (error) {
      console.error('Error saving post:', error);
      Alert.alert('Error', 'Failed to save post. Please try again.');
    }
  };

  const handleReportPost = async (postId: string) => {
    if (!isAuthenticated) {
      Alert.alert('Sign In Required', 'Please sign in to report posts');
      return;
    }

    Alert.alert(
      'Report Post',
      'Why are you reporting this post?',
      [
        { text: 'Inappropriate Content', onPress: () => console.log('Report inappropriate') },
        { text: 'Spam', onPress: () => console.log('Report spam') },
        { text: 'Harassment', onPress: () => console.log('Report harassment') },
        { text: 'Other', onPress: () => console.log('Report other') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // User Actions
  const handleFollowUser = async (userId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to follow users',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => navigateToUserProfile(userId) }
        ]
      );
      return;
    }

    try {
      // Optimistic update
      // dispatch(followUser({ userId, followerId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Following user:', userId);
      
      // Show success feedback
      Alert.alert('Success', 'You are now following this user!');
    } catch (error) {
      console.error('Error following user:', error);
      Alert.alert('Error', 'Failed to follow user. Please try again.');
    }
  };

  const handleUnfollowUser = async (userId: string) => {
    if (!isAuthenticated) return;

    try {
      // Optimistic update
      // dispatch(unfollowUser({ userId, followerId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Unfollowing user:', userId);
    } catch (error) {
      console.error('Error unfollowing user:', error);
      Alert.alert('Error', 'Failed to unfollow user. Please try again.');
    }
  };

  // Event Actions
  const handleAttendEvent = async (eventId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to attend events',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => console.log('Navigate to sign in') }
        ]
      );
      return;
    }

    try {
      // Optimistic update
      // dispatch(attendEvent({ eventId, userId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Attending event:', eventId);
      
      // Show success feedback
      Alert.alert('Success', 'You are now attending this event!');
    } catch (error) {
      console.error('Error attending event:', error);
      Alert.alert('Error', 'Failed to attend event. Please try again.');
    }
  };

  const handleUnattendEvent = async (eventId: string) => {
    if (!isAuthenticated) return;

    try {
      // Optimistic update
      // dispatch(unattendEvent({ eventId, userId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Unattending event:', eventId);
    } catch (error) {
      console.error('Error unattending event:', error);
      Alert.alert('Error', 'Failed to unattend event. Please try again.');
    }
  };

  const handleSaveEvent = async (eventId: string) => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to save events',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => console.log('Navigate to sign in') }
        ]
      );
      return;
    }

    try {
      // Optimistic update
      // dispatch(saveEvent({ eventId, userId: user.id }));
      
      // TODO: Integrate with backend API
      console.log('Saving event:', eventId);
      
      // Show success feedback
      Alert.alert('Success', 'Event saved to your collection!');
    } catch (error) {
      console.error('Error saving event:', error);
      Alert.alert('Error', 'Failed to save event. Please try again.');
    }
  };

  // Content Creation Actions
  const handleCreatePost = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to create posts',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => console.log('Navigate to sign in') }
        ]
      );
      return;
    }

    // Navigate to create post screen
    console.log('Navigate to create post');
  };

  const handleCreateEvent = () => {
    if (!isAuthenticated) {
      Alert.alert(
        'Sign In Required',
        'Please sign in to create events',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Sign In', onPress: () => console.log('Navigate to sign in') }
        ]
      );
      return;
    }

    // Navigate to create event screen
    console.log('Navigate to create event');
  };

  return {
    // Post actions
    handleLikePost,
    handleUnlikePost,
    handleCommentPost,
    handleSharePost,
    handleSavePost,
    handleReportPost,
    
    // User actions
    handleFollowUser,
    handleUnfollowUser,
    
    // Event actions
    handleAttendEvent,
    handleUnattendEvent,
    handleSaveEvent,
    
    // Content creation actions
    handleCreatePost,
    handleCreateEvent,
  };
};
