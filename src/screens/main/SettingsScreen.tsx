import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SettingItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: string;
  type: 'toggle' | 'navigation' | 'action';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

const SettingsScreen: React.FC = () => {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(false);
  const [locationEnabled, setLocationEnabled] = useState(true);

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => console.log('Logout pressed') },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Delete account pressed') },
      ]
    );
  };

  const profileSettings: SettingItem[] = [
    {
      id: '1',
      title: 'Edit Profile',
      subtitle: 'Change your profile information',
      icon: 'person',
      type: 'navigation',
      onPress: () => console.log('Edit Profile pressed'),
    },
    {
      id: '2',
      title: 'Change Password',
      subtitle: 'Update your account password',
      icon: 'lock-closed',
      type: 'navigation',
      onPress: () => console.log('Change Password pressed'),
    },
    {
      id: '3',
      title: 'Two-Factor Authentication',
      subtitle: 'Add an extra layer of security',
      icon: 'shield-checkmark',
      type: 'navigation',
      onPress: () => console.log('2FA pressed'),
    },
  ];

  const appSettings: SettingItem[] = [
    {
      id: '4',
      title: 'Notifications',
      subtitle: 'Manage your notification preferences',
      icon: 'notifications',
      type: 'toggle',
      value: notificationsEnabled,
      onToggle: setNotificationsEnabled,
    },
    {
      id: '5',
      title: 'Dark Mode',
      subtitle: 'Use dark theme',
      icon: 'moon',
      type: 'toggle',
      value: darkModeEnabled,
      onToggle: setDarkModeEnabled,
    },
    {
      id: '6',
      title: 'Auto-play Videos',
      subtitle: 'Automatically play videos in feed',
      icon: 'play-circle',
      type: 'toggle',
      value: autoPlayEnabled,
      onToggle: setAutoPlayEnabled,
    },
    {
      id: '7',
      title: 'Location Services',
      subtitle: 'Allow access to your location',
      icon: 'location',
      type: 'toggle',
      value: locationEnabled,
      onToggle: setLocationEnabled,
    },
  ];

  const privacySettings: SettingItem[] = [
    {
      id: '8',
      title: 'Privacy Settings',
      subtitle: 'Control who can see your content',
      icon: 'eye',
      type: 'navigation',
      onPress: () => console.log('Privacy Settings pressed'),
    },
    {
      id: '9',
      title: 'Blocked Users',
      subtitle: 'Manage blocked accounts',
      icon: 'ban',
      type: 'navigation',
      onPress: () => console.log('Blocked Users pressed'),
    },
    {
      id: '10',
      title: 'Data Usage',
      subtitle: 'Control your data consumption',
      icon: 'cellular',
      type: 'navigation',
      onPress: () => console.log('Data Usage pressed'),
    },
  ];

  const supportSettings: SettingItem[] = [
    {
      id: '11',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      icon: 'help-circle',
      type: 'navigation',
      onPress: () => console.log('Help & Support pressed'),
    },
    {
      id: '12',
      title: 'About YardPass',
      subtitle: 'App version and information',
      icon: 'information-circle',
      type: 'navigation',
      onPress: () => console.log('About pressed'),
    },
    {
      id: '13',
      title: 'Terms of Service',
      subtitle: 'Read our terms and conditions',
      icon: 'document-text',
      type: 'navigation',
      onPress: () => console.log('Terms pressed'),
    },
    {
      id: '14',
      title: 'Privacy Policy',
      subtitle: 'Read our privacy policy',
      icon: 'shield',
      type: 'navigation',
      onPress: () => console.log('Privacy Policy pressed'),
    },
  ];

  const accountSettings: SettingItem[] = [
    {
      id: '15',
      title: 'Logout',
      subtitle: 'Sign out of your account',
      icon: 'log-out',
      type: 'action',
      onPress: handleLogout,
    },
    {
      id: '16',
      title: 'Delete Account',
      subtitle: 'Permanently delete your account',
      icon: 'trash',
      type: 'action',
      onPress: handleDeleteAccount,
    },
  ];

  const renderSettingItem = (item: SettingItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingItem}
      onPress={item.onPress}
      disabled={item.type === 'toggle'}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon as any} size={20} color="#00ff88" />
        </View>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>{item.title}</Text>
          {item.subtitle && (
            <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
          )}
        </View>
      </View>
      
      <View style={styles.settingRight}>
        {item.type === 'toggle' ? (
          <Switch
            value={item.value}
            onValueChange={item.onToggle}
            trackColor={{ false: '#333333', true: '#00ff88' }}
            thumbColor={item.value ? '#1a1a1a' : '#a3a3a3'}
            ios_backgroundColor="#333333"
          />
        ) : (
          <Ionicons 
            name="chevron-forward" 
            size={20} 
            color="#a3a3a3" 
          />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSection = (title: string, items: SettingItem[]) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>
        {items.map(renderSettingItem)}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAC2ZW6k71QIA0yTlGGv0wnOVFoDWH73syhYGPyqBLT3fLDRpGydvzPfuM46Y2MhyXEr9SQQm6O3X_wG9s88Fpbpudgd8CDlHX5pvHn2w6HeqhEWDWyWwCs8K8MjG9pDcDqeRRQwcSpFJzpdcYHOIM1ur5Is13vD0Ph1EBhlTVmA7-Y2CTyTGS4evxCmq-frpgHOB4ZZkq5_cl5eJFD80HZoKVItHDk0QbdxolBm0Ry2EPl3HQrmTvHV99dXFIm0YZ-a8Wrh7kd5BK5',
              }}
              style={styles.profileAvatar}
            />
            <View style={styles.profileDetails}>
              <Text style={styles.profileName}>Liam Carter</Text>
              <Text style={styles.profileEmail}>liam.carter@email.com</Text>
              <Text style={styles.profileRole}>Event Organizer</Text>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        {renderSection('Profile', profileSettings)}
        {renderSection('App Settings', appSettings)}
        {renderSection('Privacy & Security', privacySettings)}
        {renderSection('Support', supportSettings)}
        {renderSection('Account', accountSettings)}

        {/* App Version */}
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
    backgroundColor: '#1a1a1a',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  profileDetails: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 2,
  },
  profileRole: {
    fontSize: 14,
    color: '#00ff88',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  sectionContent: {
    backgroundColor: '#262626',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#333333',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 255, 136, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingInfo: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  settingRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  versionSection: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  versionText: {
    fontSize: 14,
    color: '#666666',
  },
});

export default SettingsScreen;
