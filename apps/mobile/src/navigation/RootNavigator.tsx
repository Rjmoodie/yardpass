import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { LoadingScreen } from '../screens/LoadingScreen';

// Import all modal screens
import EventDetailsScreen from '../screens/main/EventDetailsScreen';
import PostDetailsScreen from '../screens/main/PostDetailsScreen';
import UserProfileScreen from '../screens/main/UserProfileScreen';
import CreatePostScreen from '../screens/main/CreatePostScreen';
import EventCreationScreen from '../screens/main/EventCreationScreen';
import CameraScreen from '../screens/main/CameraScreen';
// import GalleryScreen from '../screens/main/GalleryScreen';
import SettingsScreen from '../screens/main/SettingsScreen';
import NotificationsScreen from '../screens/main/NotificationsScreen';
import MessagesScreen from '../screens/main/MessagesScreen';
import SearchScreen from '../screens/main/SearchScreen';
import CommentsScreen from '../screens/main/CommentsScreen';
import FollowersFollowingScreen from '../screens/main/FollowersFollowingScreen';
import ProfileEditScreen from '../screens/main/ProfileEditScreen';
// import HelpScreen from '../screens/main/HelpScreen';
// import PrivacyScreen from '../screens/main/PrivacyScreen';
// import TermsScreen from '../screens/main/TermsScreen';
// import AboutScreen from '../screens/main/AboutScreen';
// import TicketPurchaseScreen from '../screens/main/TicketPurchaseScreen';
// import TicketDetailsScreen from '../screens/main/TicketDetailsScreen';
// import OrganizerDashboardScreen from '../screens/main/OrganizerDashboardScreen';
// import EventEditorScreen from '../screens/main/EventEditorScreen';
// import MediaSchedulerScreen from '../screens/main/MediaSchedulerScreen';
// import AnalyticsScreen from '../screens/main/AnalyticsScreen';

import { RootStackParamList } from '../types/navigation';

const Stack = createStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {isAuthenticated ? (
          // Main app stack
          <>
            <Stack.Screen name="Main" component={MainNavigator} />
            
            {/* Modal screens */}
            <Stack.Screen 
              name="EventDetails" 
              component={EventDetailsScreen}
              options={{
                headerShown: true,
                title: 'Event Details',
                headerBackTitle: 'Back',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="PostDetails" 
              component={PostDetailsScreen}
              options={{
                headerShown: true,
                title: 'Post',
                headerBackTitle: 'Back',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="UserProfile" 
              component={UserProfileScreen}
              options={{
                headerShown: true,
                title: 'Profile',
                headerBackTitle: 'Back',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="CreatePost" 
              component={CreatePostScreen}
              options={{
                headerShown: true,
                title: 'Create Post',
                headerBackTitle: 'Cancel',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="EventCreation" 
              component={EventCreationScreen}
              options={{
                headerShown: true,
                title: 'Create Event',
                headerBackTitle: 'Cancel',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="Camera" 
              component={CameraScreen}
              options={{
                headerShown: false,
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                headerShown: true,
                title: 'Settings',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Notifications" 
              component={NotificationsScreen}
              options={{
                headerShown: true,
                title: 'Notifications',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Messages" 
              component={MessagesScreen}
              options={{
                headerShown: true,
                title: 'Messages',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Search" 
              component={SearchScreen}
              options={{
                headerShown: true,
                title: 'Search',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Comments" 
              component={CommentsScreen}
              options={{
                headerShown: true,
                title: 'Comments',
                headerBackTitle: 'Back',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="FollowersFollowing" 
              component={FollowersFollowingScreen}
              options={{
                headerShown: true,
                title: 'Followers',
                headerBackTitle: 'Back',
                presentation: 'modal',
              }}
            />
            <Stack.Screen 
              name="EditProfile" 
              component={ProfileEditScreen}
              options={{
                headerShown: true,
                title: 'Edit Profile',
                headerBackTitle: 'Cancel',
                presentation: 'modal',
              }}
            />
          </>
        ) : (
          // Auth stack
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};


