import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import WalletScreen from './snack-wallet-demo';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <WalletScreen />
    </SafeAreaProvider>
  );
}
