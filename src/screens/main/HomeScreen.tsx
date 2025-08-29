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
import { useNavigation } from '../../hooks/useNavigation';
import { useActions } from '../../hooks/useActions';

const { width, height } = Dimensions.get('window');

interface VideoPost {
  id: string;
  username: string;
  description: string;
  likes: string;
  comments: string;
  videoUrl: string;
  userAvatar: string;
  isLiked?: boolean;
  isSaved?: boolean;
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
    isLiked: false,
    isSaved: false,
  },
];

const HomeScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'following' | 'foryou'>('foryou');
  const [posts, setPosts] = useState<VideoPost[]>(mockVideoData);
  
  const {
    navigateToHome,
    navigateToDiscover,
    navigateToCreate,
    navigateToWallet,
    navigateToProfile,
    navigateToUserProfile,
    navigateToComments,
  } = useNavigation();
  
  const {
    handleLikePost,
    handleUnlikePost,
    handleCommentPost,
    handleSharePost,
    handleSavePost,
  } = useActions();

  const ActionButton = ({ 
    icon, 
    label, 
    onPress, 
    isActive = false 
  }: { 
    icon: string; 
    label: string; 
    onPress: () => void;
    isActive?: boolean;
  }) => (
    <TouchableOpacity style={styles.actionButton} onPress={onPress}>
      <View style={[styles.actionIconContainer, isActive && styles.actionIconContainerActive]}>
        <Ionicons 
          name={icon as any} 
          size={28} 
          color={isActive ? "#ff4757" : "white"} 
        />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </TouchableOpacity>
  );

  const handleLike = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post?.isLiked) {
      handleUnlikePost(postId);
    } else {
      handleLikePost(postId);
    }
    
    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, isLiked: !p.isLiked }
        : p
    ));
  };

  const handleSave = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (post?.isSaved) {
      // Handle unsave
      console.log('Unsaving post:', postId);
    } else {
      handleSavePost(postId);
    }
    
    // Optimistic update
    setPosts(prev => prev.map(p => 
      p.id === postId 
        ? { ...p, isSaved: !p.isSaved }
        : p
    ));
  };

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
            <TouchableOpacity onPress={() => navigateToUserProfile('user123')}>
              <Text style={styles.username}>{post.username}</Text>
            </TouchableOpacity>
            <Text style={styles.description}>{post.description}</Text>
            <View style={styles.musicInfo}>
              <Ionicons name="musical-notes" size={16} color="white" />
              <Text style={styles.musicText}>Original Sound - Artist Name</Text>
            </View>
          </View>

          <View style={styles.rightActions}>
            <ActionButton 
              icon={post.isLiked ? "heart" : "heart-outline"} 
              label={post.likes} 
              onPress={() => handleLike(post.id)}
              isActive={post.isLiked}
            />
            <ActionButton 
              icon="chatbubble-outline" 
              label={post.comments} 
              onPress={() => handleCommentPost(post.id)}
            />
            <ActionButton 
              icon={post.isSaved ? "bookmark" : "bookmark-outline"} 
              label="Save" 
              onPress={() => handleSave(post.id)}
              isActive={post.isSaved}
            />
            <ActionButton 
              icon="share-outline" 
              label="Share" 
              onPress={() => handleSharePost(post.id)}
            />
            
            {/* User Avatar */}
            <TouchableOpacity 
              style={styles.userAvatarContainer}
              onPress={() => navigateToUserProfile('user123')}
            >
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
        {posts.map((post) => (
          <VideoPost key={post.id} post={post} />
        ))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={navigateToHome}>
          <Ionicons name="home" size={24} color="white" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={navigateToDiscover}>
          <Ionicons name="search" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={[styles.navLabel, styles.inactiveNavLabel]}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton} onPress={navigateToCreate}>
          <Ionicons name="add" size={20} color="black" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={navigateToWallet}>
          <Ionicons name="calendar" size={24} color="rgba(255,255,255,0.7)" />
          <Text style={[styles.navLabel, styles.inactiveNavLabel]}>Events</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={navigateToProfile}>
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
    paddingBottom: 100,
  },
  leftContent: {
    flex: 1,
    marginRight: 20,
  },
  username: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    color: 'white',
    fontSize: 16,
    marginBottom: 12,
    lineHeight: 22,
  },
  musicInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  musicText: {
    color: 'white',
    fontSize: 14,
    marginLeft: 8,
  },
  rightActions: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  actionButton: {
    alignItems: 'center',
    marginBottom: 20,
  },
  actionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionIconContainerActive: {
    backgroundColor: 'rgba(255,71,87,0.2)',
  },
  actionLabel: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  userAvatarContainer: {
    marginTop: 20,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: 'white',
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  navItem: {
    alignItems: 'center',
    flex: 1,
  },
  navLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
  },
  inactiveNavLabel: {
    color: 'rgba(255,255,255,0.7)',
  },
  createButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
  },
});

export default HomeScreen;
