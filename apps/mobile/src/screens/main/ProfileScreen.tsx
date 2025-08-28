import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../../hooks/useNavigation';
import { useAuth } from '../../contexts/AuthContext';

const { width } = Dimensions.get('window');

interface ProfileImage {
  id: string;
  imageUrl: string;
}

const profileImages: ProfileImage[] = [
  {
    id: '1',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDjiHQyHgKTeyxv6fX8wAhIjnfyB6zQo7xY0AdF9PS6AQMD7gnkPF0QmiJUSjEnECGZYOLq2JG7A-rSh1Tbg8Vfx8_zZIHn3zaHk1P0sebTzjDKgZNie35o08qJF0Me2ExWI1qXK7XGL-7JpxM6oKn3U7k8rMjJ27B3E2g-2z78-zL0BF8U4VvmLSRA1FpnlG8G_FBhH3oQO734Qip7zKr8rhuwYMN89DQre29O-LxFtYRaUnVdvUC58dCzht9zNhMGTOSvRJoyMjQJ',
  },
  {
    id: '2',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCdboM6zZ_yj8MzTcxNo9gwkRfGaa6YlXQXACpEv-4x5nviysoxN8z-wDTFt1xkvWDL57w799ynQC_U97vU9A7yg7uucvIKgXAkvSH4zTN1AUQ1AJ1VddytNCAolAlOZODlRUs_E-Hg5ZJYUG-JXjmyel7heUCqyo_NsFATHsqtrj2rqn0X_a74CIa7ugpFq88aGBlMZ3cFMYgVe7QAiMGwNT5mka2rHNVfl7zSnND3OtGTDi7oMD8cfGzPFyLKkN98cc8NWrJXMLrF',
  },
  {
    id: '3',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDHpv8rUntKwiP2_ke6HKXnriddaN7es4IRCR5iPQt9W-UZv-HTonK-5Gw5NZoxC0ghExGljd9M7LQiu14IApMv7S7laSug7DzFQ30nVn7tg7Ms6h6iAdF4UEif7PQ6s5ljTmDZLwScDs8bjg-quT7JXm3s13hstDe9SuZ8oxYFAyFYnAwaZkDii4GPctVkwOP7mgthDr2MW2P1G2KgfLGuP02Cp8pw9sRXm4HV00_N6y2Co9R4RK89WDAQP-8iimfMKEV67VwonSVJ',
  },
  {
    id: '4',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuATZs0MfkQ3C4PzfzksYmj26MaLoZc11-YhzCa0R9h4eKWKwO5QYvnuwK8qbIg93TH-FZL9cqTIvtmpvwaGWc3gDNi_2eJ9V6vb02Zut7aVm9JocY-eemq29RhrtUsYPLnuXkl3KAl0feINCOvVXa_ZHWiPNvkr6kZh_LmSnOqI7Fh1MlMb2z5ng-9hNEBmedyKP0nDlEOxGtDbXfuxLwdm1IFvNpDEXm7Ri0_SftG65pJm5pV3bd-DfyICugvC3uLHBvxXqbTvyr-r',
  },
  {
    id: '5',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDScQN4DfCvCehoyuWoNqo5fKgdJmMrkTk771G-r50gkaOkbIiEftH2pxkZqTppg-wAte6hpKbeuRQquBWTLnmRGYhvzyvKjkmFJF9apE0Qq8cNhNcmEbgWiMZpuMDO5IYaPUZTBZT59TntRTNARYtZI1BSCac0GMfJICstn_WM_OLcUGM7HjW-WgfupNZSipRZe7ZNGGFSR84sum27yzWaBKgxz6-zroFfdwxMIzKrpTWWin7aP6w4mZw0BU3Bx0dkFYzouMIe95hD',
  },
  {
    id: '6',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCduY1w6KfBjdU1aHDuAqOzu89-dGEPBLtcscw6ZR0KsbWzEipxCI9rx35lLpJhlceLQYhLbRvuLUurcf8SayID370Ipm33su4C-BrZuOGyStvtB10M6eCVmxrqLWmcH_RenXOyLr7owotHKr2VlWsFKx0w7d06KM5dXGrkkiTmFSiiO5hOHlugAJJpJMmv1XQSvHWGaKSJRrN8y-wyv3AvDRM7_D5ijJKpmcfLv9au5DIyF57lmVIGyhcvGwXg-e5LSknwpI1S0D1q',
  },
];

const ProfileScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'content' | 'events'>('content');
  
  const {
    navigateToEditProfile,
    navigateToWallet,
    navigateToSettings,
    navigateToNotifications,
    navigateToFollowersFollowing,
  } = useNavigation();
  
  const { user } = useAuth();

  const StatItem = ({ value, label }: { value: string; label: string }) => (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const ProfileImage = ({ image }: { image: ProfileImage }) => (
    <TouchableOpacity style={styles.profileImage}>
      <Image source={{ uri: image.imageUrl }} style={styles.imageContent} />
    </TouchableOpacity>
  );

  const handleEditProfile = () => {
    navigateToEditProfile();
  };

  const handleMyTickets = () => {
    navigateToWallet();
  };

  const handleSettings = () => {
    navigateToSettings();
  };

  const handleFollowers = () => {
    navigateToFollowersFollowing('user123', 'followers');
  };

  const handleFollowing = () => {
    navigateToFollowersFollowing('user123', 'following');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>@liamcarter</Text>
        <TouchableOpacity style={styles.menuButton} onPress={handleSettings}>
          <Ionicons name="ellipsis-vertical" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileInfo}>
            {/* Profile Picture */}
            <View style={styles.profilePictureContainer}>
              <Image
                source={{
                  uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAC2ZW6k71QIA0yTlGGv0wnOVFoDWH73syhYGPyqBLT3fLDRpGydvzPfuM46Y2MhyXEr9SQQm6O3X_wG9s88Fpbpudgd8CDlHX5pvHn2w6HeqhEWDWyWwCs8K8MjG9pDcDqeRRQwcSpFJzpdcYHOIM1ur5Is13vD0Ph1EBhlTVmA7-Y2CTyTGS4evxCmq-frpgHOB4ZZkq5_cl5eJFD80HZoKVItHDk0QbdxolBm0Ry2EPl3HQrmTvHV99dXFIm0YZ-a8Wrh7kd5BK5',
                }}
                style={styles.profilePicture}
              />
              <TouchableOpacity style={styles.editButton} onPress={handleEditProfile}>
                <Ionicons name="create" size={16} color="#1a1a1a" />
              </TouchableOpacity>
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Liam Carter</Text>
              <Text style={styles.userTitle}>Event Organizer</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <StatItem value="156" label="Posts" />
            <TouchableOpacity onPress={handleFollowers}>
              <StatItem value="2.4K" label="Followers" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleFollowing}>
              <StatItem value="892" label="Following" />
            </TouchableOpacity>
          </View>

          {/* Bio */}
          <View style={styles.bioContainer}>
            <Text style={styles.bioText}>
              Event organizer and content creator. Sharing amazing experiences and creating unforgettable moments. 🎉
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.editProfileButton} onPress={handleEditProfile}>
              <Text style={styles.editProfileText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareProfileButton}>
              <Ionicons name="share-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'content' && styles.activeTab]}
              onPress={() => setActiveTab('content')}
            >
              <Ionicons 
                name="grid-outline" 
                size={24} 
                color={activeTab === 'content' ? '#00ff88' : '#666'} 
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'events' && styles.activeTab]}
              onPress={() => setActiveTab('events')}
            >
              <Ionicons 
                name="calendar-outline" 
                size={24} 
                color={activeTab === 'events' ? '#00ff88' : '#666'} 
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Content Grid */}
        <View style={styles.contentGrid}>
          {activeTab === 'content' ? (
            profileImages.map((image) => (
              <ProfileImage key={image.id} image={image} />
            ))
          ) : (
            <View style={styles.eventsContainer}>
              <Text style={styles.noEventsText}>No events yet</Text>
              <Text style={styles.noEventsSubtext}>Create your first event to get started</Text>
            </View>
          )}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerSpacer: {
    width: 24,
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profilePictureContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profilePicture: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userTitle: {
    color: '#999',
    fontSize: 14,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#999',
    fontSize: 12,
    marginTop: 2,
  },
  bioContainer: {
    marginBottom: 20,
  },
  bioText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  editProfileButton: {
    flex: 1,
    backgroundColor: '#333',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editProfileText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  shareProfileButton: {
    width: 48,
    height: 48,
    backgroundColor: '#333',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingTop: 16,
  },
  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00ff88',
  },
  contentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  profileImage: {
    width: (width - 60) / 3,
    height: (width - 60) / 3,
    marginBottom: 2,
    marginRight: 2,
  },
  imageContent: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  eventsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noEventsText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noEventsSubtext: {
    color: '#999',
    fontSize: 14,
    textAlign: 'center',
  },
});

export default ProfileScreen;
