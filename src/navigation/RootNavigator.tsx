import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';

// Public Navigator (No Auth Required)
import PublicNavigator from './PublicNavigator';

// Authenticated Navigator (After Login)
import AuthenticatedNavigator from './AuthenticatedNavigator';

// Loading Screen
import LoadingScreen from '@/screens/common/LoadingScreen';

const Stack = createStackNavigator();

const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);

  // Show loading screen while checking authentication
  if (isLoading) {
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
          // Authenticated User Flow
          <Stack.Screen 
            name="Authenticated" 
            component={AuthenticatedNavigator}
            options={{ headerShown: false }}
          />
        ) : (
          // Public User Flow (Default)
          <Stack.Screen 
            name="Public" 
            component={PublicNavigator}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
