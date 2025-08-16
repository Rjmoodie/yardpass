import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 YardPass is Running! 🎉</Text>
      <Text style={styles.subtitle}>The Ultimate Event Social Network</Text>
      <Text style={styles.description}>
        TikTok-style feed + Eventbrite functionality
      </Text>
      <Text style={styles.features}>
        ✅ Video Feed{'\n'}
        ✅ Event Discovery{'\n'}
        ✅ Ticket Purchases{'\n'}
        ✅ Social Features{'\n'}
        ✅ Real-time Updates
      </Text>
      <Text style={styles.status}>
        App Status: Working! 🚀
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#00ff88',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 30,
  },
  features: {
    fontSize: 14,
    color: '#ffffff',
    textAlign: 'left',
    lineHeight: 24,
    marginBottom: 30,
  },
  status: {
    fontSize: 16,
    color: '#00ff88',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});
