import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';
import { signOut } from '../store/slices/authSlice';
import { AppDispatch, RootState } from '../store';

const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { currentTheme } = useTheme();
  const user = useSelector((state: RootState) => state.auth.user);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);

  const menuItems = [
    {
      icon: 'person-outline',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => Alert.alert('Coming Soon', 'Edit profile functionality will be available soon'),
    },
    {
      icon: 'ticket-outline',
      title: 'My Tickets',
      subtitle: 'View and manage your tickets',
      onPress: () => navigation.navigate('Wallet' as never),
    },
    {
      icon: 'calendar-outline',
      title: 'My Events',
      subtitle: 'Events you\'ve attended or created',
      onPress: () => Alert.alert('Coming Soon', 'My events functionality will be available soon'),
    },
    {
      icon: 'heart-outline',
      title: 'Favorites',
      subtitle: 'Your saved events and posts',
      onPress: () => Alert.alert('Coming Soon', 'Favorites functionality will be available soon'),
    },
    {
      icon: 'settings-outline',
      title: 'Settings',
      subtitle: 'App preferences and account settings',
      onPress: () => Alert.alert('Coming Soon', 'Settings functionality will be available soon'),
    },
    {
      icon: 'help-circle-outline',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => Alert.alert('Coming Soon', 'Help & support functionality will be available soon'),
    },
  ];

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: () => dispatch(signOut()),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Profile</Text>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => Alert.alert('Coming Soon', 'Settings functionality will be available soon')}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            {user?.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.profileImage} />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.colors.primary }]}>
                <Ionicons name="person" size={40} color={theme.colors.white} />
              </View>
            )}
            <TouchableOpacity
              style={[styles.editImageButton, { backgroundColor: theme.colors.primary }]}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={16} color={theme.colors.white} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.displayName, { color: theme.colors.text }]}>
            {user?.display_name || 'User Name'}
          </Text>
          <Text style={[styles.handle, { color: theme.colors.textSecondary }]}>
            @{user?.handle || 'username'}
          </Text>

          {user?.bio && (
            <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
              {user.bio}
            </Text>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>12</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Events</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>48</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Following</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statNumber, { color: theme.colors.text }]}>156</Text>
              <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Followers</Text>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: theme.colors.primary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color={theme.colors.white} />
            <Text style={styles.quickActionText}>Create Event</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionButton, { backgroundColor: theme.colors.secondary }]}
            activeOpacity={0.8}
          >
            <Ionicons name="videocam" size={20} color={theme.colors.white} />
            <Text style={styles.quickActionText}>Record Video</Text>
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.menuItem, { borderBottomColor: theme.colors.border }]}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={styles.menuItemLeft}>
                <View style={[styles.menuIcon, { backgroundColor: theme.colors.primary + '20' }]}>
                  <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
                </View>
                <View style={styles.menuItemContent}>
                  <Text style={[styles.menuItemTitle, { color: theme.colors.text }]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.menuItemSubtitle, { color: theme.colors.textSecondary }]}>
                    {item.subtitle}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Toggle Settings */}
        <View style={styles.toggleSection}>
          <View style={[styles.toggleItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.toggleItemLeft}>
              <Ionicons name="notifications-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.toggleItemTitle, { color: theme.colors.text }]}>
                Push Notifications
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
              thumbColor={notificationsEnabled ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>

          <View style={[styles.toggleItem, { borderBottomColor: theme.colors.border }]}>
            <View style={styles.toggleItemLeft}>
              <Ionicons name="moon-outline" size={20} color={theme.colors.primary} />
              <Text style={[styles.toggleItemTitle, { color: theme.colors.text }]}>
                Dark Mode
              </Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={setDarkModeEnabled}
              trackColor={{ false: theme.colors.border, true: theme.colors.primary + '40' }}
              thumbColor={darkModeEnabled ? theme.colors.primary : theme.colors.textSecondary}
            />
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[styles.signOutButton, { borderColor: theme.colors.border }]}
          onPress={handleSignOut}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>
          YardPass v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.background,
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  handle: {
    fontSize: 16,
    marginBottom: 8,
  },
  bio: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: theme.colors.border,
  },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 32,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.white,
  },
  menuSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 14,
  },
  toggleSection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  toggleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 12,
    marginBottom: 20,
  },
});

export default ProfileScreen;
