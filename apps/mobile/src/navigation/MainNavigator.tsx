import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import DiscoverScreen from '../screens/DiscoverScreen';
import CreateScreen from '../screens/CreateScreen';
import MyWalletScreen from '../screens/main/MyWalletScreen';
import ProfileScreen from '../screens/main/ProfileScreen';

const Tab = createBottomTabNavigator();

export const MainNavigator: React.FC = () => {
  const { theme } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Discover') {
            iconName = focused ? 'search' : 'search-outline';
          } else if (route.name === 'Create') {
            iconName = focused ? 'add-circle' : 'add-circle-outline';
          } else if (route.name === 'Wallet') {
            iconName = focused ? 'wallet' : 'wallet-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 88,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.border,
          borderBottomWidth: 1,
        },
        headerTintColor: theme.colors.text,
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      })}
    >
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Tab.Screen 
        name="Discover" 
        component={DiscoverScreen}
        options={{ title: 'Discover Events' }}
      />
      <Tab.Screen 
        name="Create" 
        component={CreateScreen}
        options={{ title: 'Create Content' }}
      />
      <Tab.Screen 
        name="Wallet" 
        component={MyWalletScreen}
        options={{ title: 'My Tickets' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};


