import React, { useMemo, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Organizer } from '@/types';

interface OrganizerCardProps {
  organizer: Organizer;
  onPress: (organizerId: string) => void;
  onFollow?: (organizerId: string) => void;
  isFollowing?: boolean;
}

// ✅ OPTIMIZED: Memoized component with performance optimizations
const OrganizerCard = React.memo(({ 
  organizer, 
  onPress, 
  onFollow, 
  isFollowing = false 
}: OrganizerCardProps) => {
  // ✅ OPTIMIZED: Memoized calculations
  const formattedEventCount = useMemo(() => {
    return `${organizer.totalEvents || 0} events`;
  }, [organizer.totalEvents]);

  const formattedFollowersCount = useMemo(() => {
    const count = organizer.followersCount || 0;
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    } else if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  }, [organizer.followersCount]);

  // ✅ OPTIMIZED: Memoized event handlers
  const handlePress = useCallback(() => {
    onPress(organizer.id);
  }, [organizer.id, onPress]);

  const handleFollowPress = useCallback(() => {
    if (onFollow) {
      onFollow(organizer.id);
    }
  }, [organizer.id, onFollow]);

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <View style={styles.header}>
        <Image 
          source={{ uri: organizer.logo || organizer.user?.avatar_url }} 
          style={styles.logo} 
          resizeMode="cover"
        />
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {organizer.companyName}
            </Text>
            {organizer.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
            )}
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {organizer.description}
          </Text>
        </View>
        {onFollow && (
          <TouchableOpacity 
            style={[styles.followButton, isFollowing && styles.followingButton]} 
            onPress={handleFollowPress}
          >
            <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
              {isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formattedEventCount}</Text>
          <Text style={styles.statLabel}>Events</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{formattedFollowersCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </View>
        {organizer.totalRevenue && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              ${(organizer.totalRevenue / 1000).toFixed(1)}K
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#2a2a2a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginRight: 6,
  },
  description: {
    fontSize: 14,
    color: '#a3a3a3',
    lineHeight: 20,
  },
  followButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#00ff88',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  followingButtonText: {
    color: '#00ff88',
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#a3a3a3',
  },
});

export default OrganizerCard;
