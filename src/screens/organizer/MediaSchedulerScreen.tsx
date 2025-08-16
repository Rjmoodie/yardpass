import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

const MediaSchedulerScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Media Scheduler</Text>
      <Text style={styles.subtitle}>Schedule your content</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});

export default MediaSchedulerScreen;
