import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import { ApiService } from '@/services/api';
import { theme } from '@/constants/theme';
import { useProtectedAction } from '@/hooks/useProtectedAction';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { requireAuth } = useProtectedAction();
  
  const { user } = useSelector((state: RootState) => state.auth);
  const [refreshing, setRefreshing] = useState(false);
  const [userStats, setUserStats] = useState({
    eventsAttended: 0,
    postsCreated: 0,
    followers: 0,
    following: 0,
  });
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const response = await ApiService.user.getUserProfile(user.id);
      
      if (response.success && response.data) {
        setUserProfile(response.data);
        setUserStats({
          eventsAttended: response.data.events_attended?.[0]?.count || 0,
          postsCreated: response.data.posts_created?.[0]?.count || 0,
          followers: response.data.followers?.[0]?.count || 0,
          following: response.data.following?.[0]?.count || 0,
        });
      } else {
        console.error('Failed to load user profile:', response.error);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUserProfile();
    setRefreshing(false);
  };

  const handleEditProfile = () => {
    requireAuth(() => {
      navigation.navigate('EditProfile' as never);
    }, 'Sign in to edit your profile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings' as never);
  };

  const handleFollowers = () => {
    navigation.navigate('Followers' as never);
  };

  const handleFollowing = () => {
    navigation.navigate('Following' as never);
  };

  const handleMyEvents = () => {
    requireAuth(() => {
      navigation.navigate('MyEvents' as never);
    }, 'Sign in to view your events');
  };

  const handleMyPosts = () => {
    requireAuth(() => {
      navigation.navigate('MyPosts' as never);
    }, 'Sign in to view your posts');
  };

  const handleWallet = () => {
    navigation.navigate('Wallet' as never);
  };

  const handleHelp = () => {
    Alert.alert('Help & Support', 'Contact us at support@yardpass.com');
  };

  const menuItems = [
    {
      id: 'events',
      title: 'My Events',
      subtitle: 'Events you\'ve attended or created',
      icon: 'calendar',
      color: theme.colors.primary,
      onPress: handleMyEvents,
    },
    {
      id: 'posts',
      title: 'My Posts',
      subtitle: 'Content you\'ve shared',
      icon: 'images',
      color: '#FF6B6B',
      onPress: handleMyPosts,
    },
    {
      id: 'wallet',
      title: 'Wallet',
      subtitle: 'Tickets and payment methods',
      icon: 'wallet',
      color: '#4ECDC4',
      onPress: handleWallet,
    },
    {
      id: 'settings',
      title: 'Settings',
      subtitle: 'App preferences and account',
      icon: 'settings',
      color: '#95A5A6',
      onPress: handleSettings,
    },
    {
      id: 'help',
      title: 'Help & Support',
      subtitle: 'Get help and contact us',
      icon: 'help-circle',
      color: '#F39C12',
      onPress: handleHelp,
    },
  ];

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Profile</Text>
          <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
            <Ionicons name="create" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image
              source={{
                uri: userProfile?.avatar_url || user?.avatar_url || 'https://via.placeholder.com/100',
              }}
              style={styles.avatar}
            />
            <TouchableOpacity style={styles.avatarEditButton}>
              <Ionicons name="camera" size={16} color="white" />
            </TouchableOpacity>
          </View>
          
          <Text style={styles.userName}>
            {userProfile?.display_name || user?.display_name || user?.email || 'User'}
          </Text>
          
          <Text style={styles.userHandle}>
            @{userProfile?.handle || user?.handle || 'user'}
          </Text>
          
          <Text style={styles.userBio}>
            {userProfile?.bio || 'No bio yet. Tap edit to add one!'}
          </Text>
        </View>

        {/* Stats Section */}
        <View style={styles.statsSection}>
          <TouchableOpacity style={styles.statItem} onPress={handleMyEvents}>
            <Text style={styles.statNumber}>{userStats.eventsAttended}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statItem} onPress={handleMyPosts}>
            <Text style={styles.statNumber}>{userStats.postsCreated}</Text>
            <Text style={styles.statLabel}>Posts</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statItem} onPress={handleFollowers}>
            <Text style={styles.statNumber}>{userStats.followers}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.statItem} onPress={handleFollowing}>
            <Text style={styles.statNumber}>{userStats.following}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={[styles.menuIcon, { backgroundColor: item.color }]}>
                <Ionicons name={item.icon as any} size={20} color="white" />
              </View>
              <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Version Info */}
        <View style={styles.versionSection}>
          <Text style={styles.versionText}>YardPass v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  editButton: {
    padding: 8,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarEditButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'white',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  userHandle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  userBio: {
    fontSize: 16,
    color: theme.colors.text,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  statsSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  menuSection: {
    paddingVertical: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 2,
  },
  menuSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});

export default ProfileScreen;
