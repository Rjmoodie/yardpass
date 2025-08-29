import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

export interface ProtectedAction {
  action: string;
  title: string;
  message: string;
  primaryAction: string;
  secondaryAction: string;
}

export const useProtectedAction = () => {
  const navigation = useNavigation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const requireAuth = (
    action: string,
    callback: () => void,
    customPrompt?: Partial<ProtectedAction>
  ) => {
    if (!isAuthenticated) {
      // Default prompts for common actions
      const defaultPrompts: Record<string, ProtectedAction> = {
        'buy_tickets': {
          action: 'buy_tickets',
          title: 'Sign in to Buy Tickets',
          message: 'Create an account to purchase tickets and access your wallet',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
        },
        'like_post': {
          action: 'like_post',
          title: 'Sign in to Like',
          message: 'Create an account to like posts and interact with the community',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
        },
        'comment': {
          action: 'comment',
          title: 'Sign in to Comment',
          message: 'Create an account to comment and join the conversation',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
        },
        'follow': {
          action: 'follow',
          title: 'Sign in to Follow',
          message: 'Create an account to follow organizers and stay updated',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
        },
        'create_event': {
          action: 'create_event',
          title: 'Sign in to Create Events',
          message: 'Create an account to organize events and manage your listings',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
        },
        'create_post': {
          action: 'create_post',
          title: 'Sign in to Create Posts',
          message: 'Create an account to share content with the community',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
        },
        'save_event': {
          action: 'save_event',
          title: 'Sign in to Save Events',
          message: 'Create an account to save events and access them later',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
        },
        'access_wallet': {
          action: 'access_wallet',
          title: 'Sign in to Access Wallet',
          message: 'Create an account to view your tickets and purchase history',
          primaryAction: 'Sign In',
          secondaryAction: 'Sign Up',
        },
      };

      const prompt = customPrompt || defaultPrompts[action] || {
        action,
        title: 'Sign in Required',
        message: 'Create an account to access this feature',
        primaryAction: 'Sign In',
        secondaryAction: 'Sign Up',
      };

      // Navigate to auth prompt with callback
      navigation.navigate('AuthPrompt' as never, {
        ...prompt,
        onSuccess: callback,
      } as never);
    } else {
      // User is authenticated, execute the action
      callback();
    }
  };

  const isActionProtected = (action: string): boolean => {
    const protectedActions = [
      'buy_tickets',
      'like_post',
      'comment',
      'follow',
      'create_event',
      'create_post',
      'save_event',
      'access_wallet',
      'chat',
      'notifications',
      'profile',
    ];
    
    return protectedActions.includes(action);
  };

  return {
    requireAuth,
    isActionProtected,
    isAuthenticated,
  };
};
