import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

// Public Screens (No Auth Required)
import WelcomeScreen from '@/screens/public/WelcomeScreen';
import PublicEventsScreen from '@/screens/public/PublicEventsScreen';
import PublicEventDetailsScreen from '@/screens/public/PublicEventDetailsScreen';
import PublicOrganizerScreen from '@/screens/public/PublicOrganizerScreen';
import PublicFeedScreen from '@/screens/public/PublicFeedScreen';

// Auth Screens (For Sign Up/Sign In)
import SignInScreen from '@/screens/auth/SignInScreen';
import SignUpScreen from '@/screens/auth/SignUpScreen';

// Auth Prompt Screen
import AuthPromptScreen from '@/screens/auth/AuthPromptScreen';

// Types
import { PublicStackParamList } from '@/types';

const Stack = createStackNavigator<PublicStackParamList>();

const PublicNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#FFFFFF',
          borderBottomColor: '#E2E8F0',
          borderBottomWidth: 1,
        },
        headerTintColor: '#1F2937',
        headerTitleStyle: {
          fontWeight: '600',
          fontSize: 18,
        },
        cardStyle: {
          backgroundColor: '#F9FAFB',
        },
      }}
    >
      {/* Welcome Screen - Entry Point */}
      <Stack.Screen 
        name="Welcome" 
        component={WelcomeScreen}
        options={{ 
          headerShown: false,
        }}
      />

      {/* Public Events Browse */}
      <Stack.Screen 
        name="PublicEvents" 
        component={PublicEventsScreen}
        options={{
          title: 'Discover Events',
          headerRight: () => (
            <Ionicons name="search" size={24} color="#1F2937" />
          ),
        }}
      />

      {/* Public Event Details */}
      <Stack.Screen 
        name="PublicEventDetails" 
        component={PublicEventDetailsScreen}
        options={{
          title: 'Event Details',
          headerBackTitle: 'Back',
        }}
      />

      {/* Public Organizer Profile */}
      <Stack.Screen 
        name="PublicOrganizer" 
        component={PublicOrganizerScreen}
        options={{
          title: 'Organizer',
          headerBackTitle: 'Back',
        }}
      />

      {/* Public Feed (Limited) */}
      <Stack.Screen 
        name="PublicFeed" 
        component={PublicFeedScreen}
        options={{
          title: 'Community Feed',
          headerBackTitle: 'Back',
        }}
      />

      {/* Authentication Screens */}
      <Stack.Screen 
        name="SignIn" 
        component={SignInScreen}
        options={{
          title: 'Sign In',
          headerBackTitle: 'Back',
        }}
      />

      <Stack.Screen 
        name="SignUp" 
        component={SignUpScreen}
        options={{
          title: 'Create Account',
          headerBackTitle: 'Back',
        }}
      />

      {/* Auth Prompt Modal */}
      <Stack.Screen 
        name="AuthPrompt" 
        component={AuthPromptScreen}
        options={{
          title: 'Sign In Required',
          presentation: 'modal',
          headerBackTitle: 'Cancel',
        }}
      />
    </Stack.Navigator>
  );
};

export default PublicNavigator;
