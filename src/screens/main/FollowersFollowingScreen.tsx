import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface User {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  isVerified: boolean;
  isFollowing: boolean;
  isFollowedBy: boolean;
  mutualFriends: number;
  followers: number;
  following: number;
  posts: number;
  lastActive: string;
}

const { width } = Dimensions.get('window');

const FollowersFollowingScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'followers' | 'following'>('followers');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'verified' | 'mutual'>('all');

  const mockFollowers: User[] = [
    {
      id: '1',
      name: 'Emma Davis',
      username: 'emmadavis',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
      bio: 'Digital artist and creative enthusiast 🎨',
      isVerified: true,
      isFollowing: false,
      isFollowedBy: true,
      mutualFriends: 12,
      followers: 15420,
      following: 892,
      posts: 234,
      lastActive: '2h ago',
    },
    {
      id: '2',
      name: 'Mike Wilson',
      username: 'mikewilson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      bio: 'Photography lover and travel enthusiast 📸✈️',
      isVerified: false,
      isFollowing: true,
      isFollowedBy: true,
      mutualFriends: 8,
      followers: 3240,
      following: 156,
      posts: 89,
      lastActive: '1h ago',
    },
    {
      id: '3',
      name: 'Sarah Johnson',
      username: 'sarahjohnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
      bio: 'Fitness coach and wellness advocate 💪',
      isVerified: true,
      isFollowing: false,
      isFollowedBy: true,
      mutualFriends: 5,
      followers: 8920,
      following: 234,
      posts: 156,
      lastActive: '30m ago',
    },
    {
      id: '4',
      name: 'Alex Chen',
      username: 'alexchen',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
      bio: 'Tech enthusiast and coffee addict ☕️',
      isVerified: false,
      isFollowing: true,
      isFollowedBy: true,
      mutualFriends: 15,
      followers: 5670,
      following: 445,
      posts: 123,
      lastActive: '5h ago',
    },
    {
      id: '5',
      name: 'Jessica Brown',
      username: 'jessicabrown',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
      bio: 'Fashion blogger and style consultant 👗',
      isVerified: true,
      isFollowing: false,
      isFollowedBy: true,
      mutualFriends: 3,
      followers: 23450,
      following: 567,
      posts: 445,
      lastActive: '1d ago',
    },
  ];

  const mockFollowing: User[] = [
    {
      id: '6',
      name: 'David Lee',
      username: 'davidlee',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100',
      bio: 'Music producer and DJ 🎵',
      isVerified: true,
      isFollowing: true,
      isFollowedBy: false,
      mutualFriends: 7,
      followers: 18920,
      following: 234,
      posts: 567,
      lastActive: '3h ago',
    },
    {
      id: '7',
      name: 'Lisa Wang',
      username: 'lisawang',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100',
      bio: 'Food blogger and recipe creator 🍳',
      isVerified: false,
      isFollowing: true,
      isFollowedBy: true,
      mutualFriends: 9,
      followers: 12340,
      following: 345,
      posts: 234,
      lastActive: '2h ago',
    },
    {
      id: '8',
      name: 'Tom Anderson',
      username: 'tomanderson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      bio: 'Adventure seeker and outdoor enthusiast 🏔️',
      isVerified: false,
      isFollowing: true,
      isFollowedBy: false,
      mutualFriends: 2,
      followers: 4560,
      following: 123,
      posts: 78,
      lastActive: '1d ago',
    },
    {
      id: '9',
      name: 'Maria Garcia',
      username: 'mariagarcia',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
      bio: 'Yoga instructor and mindfulness coach 🧘‍♀️',
      isVerified: true,
      isFollowing: true,
      isFollowedBy: true,
      mutualFriends: 11,
      followers: 9870,
      following: 234,
      posts: 189,
      lastActive: '4h ago',
    },
    {
      id: '10',
      name: 'Ryan Taylor',
      username: 'ryantaylor',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
      bio: 'Gaming streamer and content creator 🎮',
      isVerified: false,
      isFollowing: true,
      isFollowedBy: false,
      mutualFriends: 4,
      followers: 34560,
      following: 567,
      posts: 890,
      lastActive: '30m ago',
    },
  ];

  const handleFollowToggle = (userId: string, isCurrentlyFollowing: boolean) => {
    Alert.alert(
      isCurrentlyFollowing ? 'Unfollow User' : 'Follow User',
      isCurrentlyFollowing 
        ? 'Are you sure you want to unfollow this user?' 
        : 'Would you like to follow this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isCurrentlyFollowing ? 'Unfollow' : 'Follow',
          style: isCurrentlyFollowing ? 'destructive' : 'default',
          onPress: () => {
            console.log(`${isCurrentlyFollowing ? 'Unfollowed' : 'Followed'} user:`, userId);
          }
        },
      ]
    );
  };

  const handleUserPress = (user: User) => {
    console.log('Navigate to user profile:', user.username);
  };

  const handleMessagePress = (user: User) => {
    console.log('Open chat with:', user.username);
  };

  const getFilteredUsers = () => {
    const users = activeTab === 'followers' ? mockFollowers : mockFollowing;
    let filtered = users;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply type filter
    switch (filterType) {
      case 'verified':
        filtered = filtered.filter(user => user.isVerified);
        break;
      case 'mutual':
        filtered = filtered.filter(user => user.mutualFriends > 0);
        break;
      default:
        break;
    }

    return filtered;
  };

  const renderUserItem = ({ item }: { item: User }) => (
    <View style={styles.userItem}>
      <TouchableOpacity 
        style={styles.userInfo}
        onPress={() => handleUserPress(item)}
      >
        <Image source={{ uri: item.avatar }} style={styles.userAvatar} />
        <View style={styles.userDetails}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{item.name}</Text>
            {item.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
            )}
          </View>
          <Text style={styles.userUsername}>@{item.username}</Text>
          <Text style={styles.userBio} numberOfLines={1}>
            {item.bio}
          </Text>
          {item.mutualFriends > 0 && (
            <Text style={styles.mutualFriends}>
              {item.mutualFriends} mutual friend{item.mutualFriends !== 1 ? 's' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <View style={styles.userActions}>
        {activeTab === 'followers' && !item.isFollowing && (
          <TouchableOpacity 
            style={styles.followButton}
            onPress={() => handleFollowToggle(item.id, false)}
          >
            <Text style={styles.followButtonText}>Follow</Text>
          </TouchableOpacity>
        )}
        
        {activeTab === 'following' && (
          <TouchableOpacity 
            style={styles.unfollowButton}
            onPress={() => handleFollowToggle(item.id, true)}
          >
            <Text style={styles.unfollowButtonText}>Unfollow</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity 
          style={styles.messageButton}
          onPress={() => handleMessagePress(item)}
        >
          <Ionicons name="chatbubble-outline" size={20} color="#00ff88" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'all' && styles.filterChipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text style={[styles.filterChipText, filterType === 'all' && styles.filterChipTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'verified' && styles.filterChipActive]}
          onPress={() => setFilterType('verified')}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={16} 
            color={filterType === 'verified' ? '#1a1a1a' : '#00ff88'} 
          />
          <Text style={[styles.filterChipText, filterType === 'verified' && styles.filterChipTextActive]}>
            Verified
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterChip, filterType === 'mutual' && styles.filterChipActive]}
          onPress={() => setFilterType('mutual')}
        >
          <Ionicons 
            name="people" 
            size={16} 
            color={filterType === 'mutual' ? '#1a1a1a' : '#00ff88'} 
          />
          <Text style={[styles.filterChipText, filterType === 'mutual' && styles.filterChipTextActive]}>
            Mutual
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons 
        name={activeTab === 'followers' ? 'people-outline' : 'person-add-outline'} 
        size={64} 
        color="#a3a3a3" 
      />
      <Text style={styles.emptyStateTitle}>
        {activeTab === 'followers' ? 'No Followers Yet' : 'Not Following Anyone'}
      </Text>
      <Text style={styles.emptyStateText}>
        {activeTab === 'followers' 
          ? 'When people follow you, they\'ll appear here.'
          : 'Start following people to see their posts in your feed.'
        }
      </Text>
    </View>
  );

  const filteredUsers = getFilteredUsers();

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sarah Dancer</Text>
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilters(!showFilters)}>
          <Ionicons name="options" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'followers' && styles.tabActive]}
          onPress={() => setActiveTab('followers')}
        >
          <Text style={[styles.tabText, activeTab === 'followers' && styles.tabTextActive]}>
            {mockFollowers.length} Followers
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'following' && styles.tabActive]}
          onPress={() => setActiveTab('following')}
        >
          <Text style={[styles.tabText, activeTab === 'following' && styles.tabTextActive]}>
            {mockFollowing.length} Following
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#a3a3a3" />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${activeTab}...`}
            placeholderTextColor="#a3a3a3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#a3a3a3" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      {showFilters && renderFilterChips()}

      {/* User List */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  filterButton: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#00ff88',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  tabTextActive: {
    color: '#1a1a1a',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: '#00ff88',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a3a3a3',
  },
  filterChipTextActive: {
    color: '#1a1a1a',
  },
  listContainer: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  userUsername: {
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 4,
  },
  userBio: {
    fontSize: 14,
    color: 'white',
    marginBottom: 4,
  },
  mutualFriends: {
    fontSize: 12,
    color: '#00ff88',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  followButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  unfollowButton: {
    backgroundColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unfollowButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  messageButton: {
    padding: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#333333',
    marginHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#a3a3a3',
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FollowersFollowingScreen;
