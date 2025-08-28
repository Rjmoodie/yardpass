import { useNavigation as useRNNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { RootNavigationProp } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';

export const useNavigation = () => {
  const navigation = useRNNavigation<RootNavigationProp>();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Navigation methods with authentication checks
  const navigateToEvent = (eventId: string) => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'view_event',
          title: 'Sign in to View Event',
          message: 'Create an account to view event details and purchase tickets',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('EventDetails', { eventId }),
        },
      });
    } else {
      navigation.navigate('EventDetails', { eventId });
    }
  };

  const navigateToUserProfile = (userId: string) => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'view_profile',
          title: 'Sign in to View Profile',
          message: 'Create an account to view user profiles and connect with others',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('UserProfile', { userId }),
        },
      });
    } else {
      navigation.navigate('UserProfile', { userId });
    }
  };

  const navigateToPostDetails = (postId: string) => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'view_post',
          title: 'Sign in to View Post',
          message: 'Create an account to view post details and interact with content',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('PostDetails', { postId }),
        },
      });
    } else {
      navigation.navigate('PostDetails', { postId });
    }
  };

  const navigateToComments = (postId: string) => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'comment',
          title: 'Sign in to Comment',
          message: 'Create an account to comment on posts and engage with the community',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('Comments', { postId }),
        },
      });
    } else {
      navigation.navigate('Comments', { postId });
    }
  };

  const navigateToCreatePost = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'create_post',
          title: 'Sign in to Create Post',
          message: 'Create an account to share your experiences and connect with others',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('CreatePost'),
        },
      });
    } else {
      navigation.navigate('CreatePost');
    }
  };

  const navigateToEventCreation = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'create_event',
          title: 'Sign in to Create Event',
          message: 'Create an account to organize and host events',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('EventCreation'),
        },
      });
    } else {
      navigation.navigate('EventCreation');
    }
  };

  const navigateToCamera = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'use_camera',
          title: 'Sign in to Use Camera',
          message: 'Create an account to capture and share moments',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('Camera'),
        },
      });
    } else {
      navigation.navigate('Camera');
    }
  };

  const navigateToSettings = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'access_settings',
          title: 'Sign in to Access Settings',
          message: 'Create an account to customize your experience',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('Settings'),
        },
      });
    } else {
      navigation.navigate('Settings');
    }
  };

  const navigateToNotifications = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'view_notifications',
          title: 'Sign in to View Notifications',
          message: 'Create an account to stay updated with your activity',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('Notifications'),
        },
      });
    } else {
      navigation.navigate('Notifications');
    }
  };

  const navigateToMessages = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'access_messages',
          title: 'Sign in to Access Messages',
          message: 'Create an account to chat with other users',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('Messages'),
        },
      });
    } else {
      navigation.navigate('Messages');
    }
  };

  const navigateToSearch = () => {
    navigation.navigate('Search');
  };

  const navigateToFollowersFollowing = (userId: string, type: 'followers' | 'following') => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'view_followers',
          title: 'Sign in to View Followers',
          message: 'Create an account to see who follows you and who you follow',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('FollowersFollowing', { userId, type }),
        },
      });
    } else {
      navigation.navigate('FollowersFollowing', { userId, type });
    }
  };

  const navigateToEditProfile = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'edit_profile',
          title: 'Sign in to Edit Profile',
          message: 'Create an account to customize your profile',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('EditProfile'),
        },
      });
    } else {
      navigation.navigate('EditProfile');
    }
  };

  // Tab navigation methods
  const navigateToHome = () => {
    navigation.navigate('Main', { screen: 'Home' });
  };

  const navigateToDiscover = () => {
    navigation.navigate('Main', { screen: 'Discover' });
  };

  const navigateToCreate = () => {
    navigation.navigate('Main', { screen: 'Create' });
  };

  const navigateToWallet = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'access_wallet',
          title: 'Sign in to Access Wallet',
          message: 'Create an account to view your tickets and purchase history',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('Main', { screen: 'Wallet' }),
        },
      });
    } else {
      navigation.navigate('Main', { screen: 'Wallet' });
    }
  };

  const navigateToProfile = () => {
    if (!isAuthenticated) {
      navigation.navigate('Auth', {
        screen: 'AuthPrompt',
        params: {
          action: 'view_profile',
          title: 'Sign in to View Profile',
          message: 'Create an account to view and manage your profile',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
          onSuccess: () => navigation.navigate('Main', { screen: 'Profile' }),
        },
      });
    } else {
      navigation.navigate('Main', { screen: 'Profile' });
    }
  };

  return {
    // Base navigation
    navigation,
    
    // Authentication state
    isAuthenticated,
    user,
    
    // Protected navigation methods
    navigateToEvent,
    navigateToUserProfile,
    navigateToPostDetails,
    navigateToComments,
    navigateToCreatePost,
    navigateToEventCreation,
    navigateToCamera,
    navigateToSettings,
    navigateToNotifications,
    navigateToMessages,
    navigateToSearch,
    navigateToFollowersFollowing,
    navigateToEditProfile,
    
    // Tab navigation methods
    navigateToHome,
    navigateToDiscover,
    navigateToCreate,
    navigateToWallet,
    navigateToProfile,
  };
};
