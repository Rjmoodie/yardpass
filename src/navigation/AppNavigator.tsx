import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import { RootStackParamList, MainTabParamList } from '@/types';
import { RootState } from '@/store';
import { getCurrentUser } from '@/store/slices/authSlice';

// Auth Screens
import SignInScreen from '@/screens/auth/SignInScreen';
import SignUpScreen from '@/screens/auth/SignUpScreen';

// Main Tab Screens
import HomeScreen from '@/screens/main/HomeScreen';
import DiscoverScreen from '@/screens/main/DiscoverScreen';
import CreateScreen from '@/screens/main/CreateScreen';
import WalletScreen from '@/screens/main/WalletScreen';
import ProfileScreen from '@/screens/main/ProfileScreen';

// Event Screens
import EventHubScreen from '@/screens/events/EventHubScreen';
import EventEditorScreen from '@/screens/events/EventEditorScreen';

// Post Screens
import CreatePostScreen from '@/screens/posts/CreatePostScreen';
import PostDetailsScreen from '@/screens/posts/PostDetailsScreen';

// Ticket Screens
import TicketPurchaseScreen from '@/screens/tickets/TicketPurchaseScreen';
import TicketDetailsScreen from '@/screens/tickets/TicketDetailsScreen';

// Organizer Screens
import OrganizerDashboardScreen from '@/screens/organizer/OrganizerDashboardScreen';
import MediaSchedulerScreen from '@/screens/organizer/MediaSchedulerScreen';
import AnalyticsScreen from '@/screens/organizer/EnhancedAnalyticsScreen';

// Other Screens
import ChatScreen from '@/screens/chat/ChatScreen';
import SettingsScreen from '@/screens/main/SettingsScreen';
import NotificationsScreen from '@/screens/main/NotificationsScreen';
import FollowersScreen from '@/screens/main/FollowersScreen';

const Stack = createStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Discover':
              iconName = focused ? 'search' : 'search-outline';
              break;
            case 'Create':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'Wallet':
              iconName = focused ? 'wallet' : 'wallet-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366F1',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E2E8F0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{
          title: 'Discover',
        }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateScreen}
        options={{
          title: 'Create',
        }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={WalletScreen}
        options={{
          title: 'Wallet',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          title: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    dispatch(getCurrentUser());
  }, [dispatch]);

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
      >
        {!isAuthenticated ? (
          // Auth Stack
          <Stack.Group>
            <Stack.Screen name="Auth" component={SignInScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
          </Stack.Group>
        ) : (
          // Main App Stack
          <Stack.Group>
            <Stack.Screen name="Main" component={MainTabs} />
            
            {/* Event Screens */}
            <Stack.Screen 
              name="EventHub" 
              component={EventHubScreen}
              options={{
                headerShown: true,
                title: 'Event',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="EventEditor" 
              component={EventEditorScreen}
              options={{
                headerShown: true,
                title: 'Edit Event',
                headerBackTitle: 'Back',
              }}
            />

            {/* Post Screens */}
            <Stack.Screen 
              name="CreatePost" 
              component={CreatePostScreen}
              options={{
                headerShown: true,
                title: 'Create Post',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="PostDetails" 
              component={PostDetailsScreen}
              options={{
                headerShown: true,
                title: 'Post',
                headerBackTitle: 'Back',
              }}
            />

            {/* Ticket Screens */}
            <Stack.Screen 
              name="TicketPurchase" 
              component={TicketPurchaseScreen}
              options={{
                headerShown: true,
                title: 'Buy Tickets',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="TicketDetails" 
              component={TicketDetailsScreen}
              options={{
                headerShown: true,
                title: 'Ticket Details',
                headerBackTitle: 'Back',
              }}
            />

            {/* Organizer Screens */}
            <Stack.Screen 
              name="OrganizerDashboard" 
              component={OrganizerDashboardScreen}
              options={{
                headerShown: true,
                title: 'Dashboard',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="MediaScheduler" 
              component={MediaSchedulerScreen}
              options={{
                headerShown: true,
                title: 'Media Scheduler',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Analytics" 
              component={AnalyticsScreen}
              options={{
                headerShown: true,
                title: 'Analytics',
                headerBackTitle: 'Back',
              }}
            />

            {/* Chat Screen */}
            <Stack.Screen 
              name="Chat" 
              component={ChatScreen}
              options={{
                headerShown: true,
                title: 'Event Chat',
                headerBackTitle: 'Back',
              }}
            />

            {/* Other Screens */}
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
              name="Followers" 
              component={FollowersScreen}
              options={{
                headerShown: true,
                title: 'Followers',
                headerBackTitle: 'Back',
              }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
