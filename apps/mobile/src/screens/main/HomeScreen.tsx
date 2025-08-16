import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

interface VideoPost {
  id: string;
  username: string;
  description: string;
  likes: string;
  comments: string;
  videoUrl: string;
  userAvatar: string;
}

const mockVideoData: VideoPost[] = [
  {
    id: '1',
    username: '@username',
    description: 'This is the description of the video. #hashtag #anothertag',
    likes: '2.5K',
    comments: '1.2K',
    videoUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB-e55RjGcBeQATlgffxlzElg5_kTlk9MeK1IQ-jRQag6LZPOlRkXiwniCNcA_ePUN6LqP-Ca8zApPZD8CBdUgfnAFS9LqRMAkxFgTZLiPvwXZa1-JGqIMVwVWX65Zgr7zT8VW7Css4riLTcF0hM4bkinuEBWodu0ln2ecR_bXwiV-KB3EgZfWNUTjESKZUe_KoV8Sh4ZZmWSZdNMivbXKntn7cfMuNtibRKJuKYqAeP_Eca5IiKN0eGiDZZVvP_UFHZG-5JxPE8hup',
    userAvatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAOud3-0ag7-uv70UrChHnSvUP3YTAuZkz_TmCC99mafx_Sk0MXnFB0k1l_zz8ab3MMrEU2Yp4Fh89XC_E1ciKk783d_n_7U6lzqQsWRWX1s-O3R3sMxpiCwZNxasxUv7QN4l1R3TWqC6GjvABEp57PZrI12RUSkIH_Ya7ueW16lU3A4Q3XPuwrDacDF4FMPUzk7GyWt98j8dCdgTr0ftQtMDl_dDjyqMNg28O5XMXTQ93Wfdn3jxSr3XwgDp5-87w96BFP7i-ybxYa',
  },
];

const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'following' | 'foryou'>('foryou');

  const ActionButton = ({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={styles.actionIconContainer}>
        <Ionicons name={icon as any} size={28} color="white" />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const VideoPost = ({ post }: { post: VideoPost }) => (
    <View style={styles.videoContainer}>
      {/* Background Video/Image */}
      <Image source={{ uri: post.videoUrl }} style={styles.backgroundVideo} />
      <View style={styles.overlay} />
      
      {/* Content */}
      <View style={styles.contentContainer}>
        {/* Top Navigation */}
        <View style={styles.topNavigation}>
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'following' && styles.activeTab]}
              onPress={() => setActiveTab('following')}
            >
              <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
                Following
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, activeTab === 'foryou' && styles.activeTab]}
              onPress={() => setActiveTab('foryou')}
            >
              <Text style={[styles.tabText, activeTab === 'foryou' && styles.activeTabText]}>
                For You
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Content */}
        <View style={styles.bottomContent}>
          <View style={styles.leftContent}>
            <Text style={styles.username}>{post.username}</Text>
            <Text style={styles.description}>{post.description}</Text>
            <View style={styles.musicInfo}>
              <Ionicons name="musical-notes" size={16} color="white" />
              <Text style={styles.musicText}>Original Sound - Artist Name</Text>
            </View>
          </View>

          <View style={styles.rightActions}>
            <ActionButton icon="heart" label={post.likes} onPress={() => {}} />
            <ActionButton icon="chatbubble" label={post.comments} onPress={() => {}} />
            <ActionButton icon="bookmark" label="Save" onPress={() => {}} />
            <ActionButton icon="share" label="Share" onPress={() => {}} />
            
            {/* User Avatar */}
            <TouchableOpacity style={styles.userAvatarContainer}>
              <Image source={{ uri: post.userAvatar }} style={styles.userAvatar} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        pagingEnabled 
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}
      >
        {mockVideoData.map((post) => (
          <VideoPost key={post.id} post={post} />
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="white" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={[styles.navLabel, styles.inactiveNavLabel]}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={20} color="black" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="calendar" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={[styles.navLabel, styles.inactiveNavLabel]}>Events</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={[styles.navLabel, styles.inactiveNavLabel]}>Profile</Text>
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
  scrollView: {
    flex: 1,
  },
  videoContainer: {
    height: height,
    width: width,
    position: 'relative',
  },
  backgroundVideo: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  topNavigation: {
    paddingTop: 60,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 4,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 16,
  },
  activeTab: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  tabText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    fontWeight: '600',
  },
  activeTabText: {
    color: 'white',
    fontWeight: 'bold',
  },
  bottomContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingBottom: 100,
  },
  leftContent: {
    flex: 1,
    marginRight: 16,
  },
  username: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: 'white',
    fontSize: 14,
    marginBottom: 8,
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  musicText: {
    color: 'white',
    fontSize: 14,
  },
  rightActions: {
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  actionLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  userAvatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    overflow: 'hidden',
  },
  userAvatar: {
    width: '100%',
    height: '100%',
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    backdropFilter: 'blur(10px)',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 20,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  navLabel: {
    color: 'white',
    fontSize: 12,
  },
  inactiveNavLabel: {
    color: 'rgba(255,255,255,0.7)',
  },
  createButton: {
    width: 48,
    height: 28,
    backgroundColor: '#00ff88',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen;
