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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerTitle}>@liamcarter</Text>
        <TouchableOpacity style={styles.menuButton}>
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
              <View style={styles.editButton}>
                <Ionicons name="create" size={16} color="#1a1a1a" />
              </View>
            </View>

            {/* User Info */}
            <View style={styles.userInfo}>
              <Text style={styles.userName}>Liam Carter</Text>
              <Text style={styles.userTitle}>Event Organizer</Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsContainer}>
            <StatItem value="1.2K" label="Followers" />
            <StatItem value="45" label="Following" />
            <StatItem value="23" label="Events" />
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.followButton}>
              <Text style={styles.followButtonText}>Follow</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.messageButton}>
              <Text style={styles.messageButtonText}>Message</Text>
            </TouchableOpacity>
          </View>

          {/* Bio */}
          <Text style={styles.bio}>
            Creating unforgettable experiences. Join me at my next event! ✨ #EventLife #Creator
          </Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'content' && styles.activeTab]}
              onPress={() => setActiveTab('content')}
            >
              <Text style={[styles.tabText, activeTab === 'content' && styles.activeTabText]}>
                Content
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'events' && styles.activeTab]}
              onPress={() => setActiveTab('events')}
            >
              <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>
                Events
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Grid */}
        <View style={styles.imageGrid}>
          {profileImages.map((image) => (
            <ProfileImage key={image.id} image={image} />
          ))}
        </View>
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="calendar" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#00ff88" />
        </TouchableOpacity>
      </View>
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
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(10px)',
  },
  headerSpacer: {
    width: 48,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    flex: 1,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 24,
    gap: 24,
  },
  profileInfo: {
    alignItems: 'center',
    gap: 16,
  },
  profilePictureContainer: {
    position: 'relative',
  },
  profilePicture: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 4,
    borderColor: '#262626',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  editButton: {
    position: 'absolute',
    bottom: -8,
    right: -8,
    backgroundColor: '#00ff88',
    borderRadius: 12,
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  userTitle: {
    fontSize: 14,
    color: '#a3a3a3',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statLabel: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    maxWidth: 300,
  },
  followButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#262626',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  messageButton: {
    flex: 1,
    height: 48,
    backgroundColor: '#00ff88',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  bio: {
    fontSize: 14,
    color: 'white',
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 20,
  },
  tabsContainer: {
    marginTop: 32,
    paddingHorizontal: 16,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#00ff88',
  },
  tabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#a3a3a3',
  },
  activeTabText: {
    color: '#00ff88',
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 1,
  },
  profileImage: {
    width: (width - 32 - 2) / 3,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContent: {
    width: '100%',
    height: '100%',
  },
  bottomNavigation: {
    backgroundColor: '#1a1a1a',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -16,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default ProfileScreen;
