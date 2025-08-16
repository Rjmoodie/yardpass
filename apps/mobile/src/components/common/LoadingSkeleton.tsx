import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface LoadingSkeletonProps {
  type: 'video-feed' | 'post' | 'event';
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ type }) => {
  const { theme } = useTheme();

  if (type === 'video-feed') {
    return (
      <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
        <View style={[styles.skeleton, { backgroundColor: theme.colors.surface }]}>
          <View style={[styles.shimmer, { backgroundColor: theme.colors.border }]} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.skeleton, { backgroundColor: theme.colors.surface }]}>
        <View style={[styles.shimmer, { backgroundColor: theme.colors.border }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skeleton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shimmer: {
    width: 200,
    height: 20,
    borderRadius: 10,
  },
});


