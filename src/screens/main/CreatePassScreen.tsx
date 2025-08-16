import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { lightTheme, typography } from '@/constants/theme';

export const CreatePassScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Pass</Text>
      <Text style={styles.subtitle}>This screen will contain the pass creation form</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: lightTheme.colors.background,
    padding: lightTheme.spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: typography.h2.fontSize,
    fontWeight: '600' as const,
    color: lightTheme.colors.text,
    marginBottom: lightTheme.spacing.md,
  },
  subtitle: {
    fontSize: typography.body.fontSize,
    color: lightTheme.colors.textSecondary,
    textAlign: 'center',
  },
});
