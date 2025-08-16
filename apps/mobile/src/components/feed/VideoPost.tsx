import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
// import { FeedItem } from '@yardpass/types';

// Temporary type until packages are built
interface FeedItem {
  id: string;
  type: 'video' | 'image' | 'text';
  content: string;
  user: {
    id: string;
    name: string;
    avatar: string;
  };
  likes: number;
  comments: number;
  shares: number;
  timestamp: string;
}

interface VideoPostProps {
  feedItem: FeedItem;
  index: number;
  isVisible: boolean;
  isActive: boolean;
  onPress?: () => void;
  onEventPress?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export const VideoPost: React.FC<VideoPostProps> = ({
  feedItem,
  index,
  isVisible,
  isActive,
  onPress,
  onEventPress,
}) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
      <View style={[styles.videoContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.placeholderText, { color: theme.colors.textSecondary }]}>
          Video Content
        </Text>
        <Text style={[styles.subText, { color: theme.colors.textSecondary }]}>
          {feedItem.type}: {feedItem.id}
        </Text>
      </View>
      
      <View style={styles.overlay}>
        <View style={styles.sidebar}>
          <View style={styles.actionButton}>
            <Text style={[styles.actionIcon, { color: theme.colors.text }]}>❤️</Text>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>1.2K</Text>
          </View>
          <View style={styles.actionButton}>
            <Text style={[styles.actionIcon, { color: theme.colors.text }]}>💬</Text>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>234</Text>
          </View>
          <View style={styles.actionButton}>
            <Text style={[styles.actionIcon, { color: theme.colors.text }]}>📤</Text>
            <Text style={[styles.actionText, { color: theme.colors.text }]}>Share</Text>
          </View>
        </View>
        
        <View style={styles.bottomInfo}>
          <Text style={[styles.username, { color: theme.colors.text }]}>
            @username
          </Text>
          <Text style={[styles.caption, { color: theme.colors.text }]}>
            Amazing event content! 🎉
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  videoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subText: {
    fontSize: 14,
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  sidebar: {
    position: 'absolute',
    right: 20,
    bottom: 120,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bottomInfo: {
    marginBottom: 20,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  caption: {
    fontSize: 14,
    lineHeight: 20,
  },
});

