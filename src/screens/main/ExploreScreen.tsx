import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TextInput,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrendingTopic {
  id: string;
  title: string;
  posts: number;
  isTrending: boolean;
  category: string;
}

interface FeaturedContent {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
  views: number;
  likes: number;
  user: {
    name: string;
    avatar: string;
    isVerified: boolean;
  };
}

interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  posts: number;
}

const { width } = Dimensions.get('window');

const ExploreScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'trending' | 'featured' | 'categories'>('trending');

  const mockTrendingTopics: TrendingTopic[] = [
    {
      id: '1',
      title: '#SummerVibes',
      posts: 15420,
      isTrending: true,
      category: 'Lifestyle',
    },
    {
      id: '2',
      title: '#TechNews',
      posts: 8920,
      isTrending: true,
      category: 'Technology',
    },
    {
      id: '3',
      title: '#FoodieLife',
      posts: 12340,
      isTrending: false,
      category: 'Food',
    },
    {
      id: '4',
      title: '#FitnessGoals',
      posts: 6780,
      isTrending: true,
      category: 'Fitness',
    },
    {
      id: '5',
      title: '#TravelDiaries',
      posts: 9450,
      isTrending: false,
      category: 'Travel',
    },
  ];

  const mockFeaturedContent: FeaturedContent[] = [
    {
      id: '1',
      title: 'Amazing Sunset at Bali Beach',
      description: 'Captured this incredible moment during my trip to Bali. The colors were absolutely breathtaking!',
      image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
      category: 'Travel',
      views: 15420,
      likes: 2340,
      user: {
        name: 'Sarah Dancer',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
        isVerified: true,
      },
    },
    {
      id: '2',
      title: 'Homemade Pizza Recipe',
      description: 'Perfect crispy crust and gooey cheese! Here\'s my secret recipe that everyone loves.',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800',
      category: 'Food',
      views: 8920,
      likes: 1560,
      user: {
        name: 'Chef Mike',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        isVerified: true,
      },
    },
    {
      id: '3',
      title: 'Morning Workout Routine',
      description: 'Start your day right with this 20-minute full-body workout. Perfect for busy schedules!',
      image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800',
      category: 'Fitness',
      views: 12340,
      likes: 2890,
      user: {
        name: 'Fitness Pro',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
        isVerified: true,
      },
    },
    {
      id: '4',
      title: 'Latest Tech Gadgets 2024',
      description: 'Exploring the most innovative gadgets that will change how we live and work.',
      image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800',
      category: 'Technology',
      views: 6780,
      likes: 890,
      user: {
        name: 'Tech Guru',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
        isVerified: false,
      },
    },
  ];

  const mockCategories: Category[] = [
    {
      id: '1',
      name: 'Travel',
      icon: 'airplane',
      color: '#00ff88',
      posts: 15420,
    },
    {
      id: '2',
      name: 'Food',
      icon: 'restaurant',
      color: '#ff6b35',
      posts: 8920,
    },
    {
      id: '3',
      name: 'Fitness',
      icon: 'fitness',
      color: '#1DA1F2',
      posts: 12340,
    },
    {
      id: '4',
      name: 'Technology',
      icon: 'laptop',
      color: '#E4405F',
      posts: 6780,
    },
    {
      id: '5',
      name: 'Fashion',
      icon: 'shirt',
      color: '#FFD700',
      posts: 9450,
    },
    {
      id: '6',
      name: 'Art',
      icon: 'brush',
      color: '#9B59B6',
      posts: 5670,
    },
    {
      id: '7',
      name: 'Music',
      icon: 'musical-notes',
      color: '#FF69B4',
      posts: 7890,
    },
    {
      id: '8',
      name: 'Gaming',
      icon: 'game-controller',
      color: '#FF4500',
      posts: 4560,
    },
  ];

  const handleTopicPress = (topic: TrendingTopic) => {
    console.log('Navigate to topic:', topic.title);
  };

  const handleContentPress = (content: FeaturedContent) => {
    console.log('Navigate to content:', content.title);
  };

  const handleCategoryPress = (category: Category) => {
    console.log('Navigate to category:', category.name);
  };

  const renderTrendingTopic = ({ item }: { item: TrendingTopic }) => (
    <TouchableOpacity 
      style={styles.trendingTopic}
      onPress={() => handleTopicPress(item)}
    >
      <View style={styles.topicHeader}>
        <Text style={styles.topicTitle}>{item.title}</Text>
        {item.isTrending && (
          <View style={styles.trendingBadge}>
            <Ionicons name="trending-up" size={12} color="white" />
            <Text style={styles.trendingText}>Trending</Text>
          </View>
        )}
      </View>
      <View style={styles.topicFooter}>
        <Text style={styles.topicCategory}>{item.category}</Text>
        <Text style={styles.topicPosts}>{item.posts.toLocaleString()} posts</Text>
      </View>
    </TouchableOpacity>
  );

  const renderFeaturedContent = ({ item }: { item: FeaturedContent }) => (
    <TouchableOpacity 
      style={styles.featuredContent}
      onPress={() => handleContentPress(item)}
    >
      <Image source={{ uri: item.image }} style={styles.contentImage} />
      <View style={styles.contentOverlay}>
        <View style={styles.contentHeader}>
          <View style={styles.userInfo}>
            <Image source={{ uri: item.user.avatar }} style={styles.userAvatar} />
            <View style={styles.userDetails}>
              <View style={styles.userNameRow}>
                <Text style={styles.userName}>{item.user.name}</Text>
                {item.user.isVerified && (
                  <Ionicons name="checkmark-circle" size={12} color="#00ff88" />
                )}
              </View>
              <Text style={styles.contentCategory}>{item.category}</Text>
            </View>
          </View>
          <View style={styles.contentStats}>
            <View style={styles.statItem}>
              <Ionicons name="eye" size={14} color="white" />
              <Text style={styles.statText}>{item.views.toLocaleString()}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart" size={14} color="white" />
              <Text style={styles.statText}>{item.likes.toLocaleString()}</Text>
            </View>
          </View>
        </View>
        <View style={styles.contentInfo}>
          <Text style={styles.contentTitle}>{item.title}</Text>
          <Text style={styles.contentDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderCategory = ({ item }: { item: Category }) => (
    <TouchableOpacity 
      style={styles.categoryItem}
      onPress={() => handleCategoryPress(item)}
    >
      <View style={[styles.categoryIcon, { backgroundColor: item.color }]}>
        <Ionicons name={item.icon as any} size={24} color="white" />
      </View>
      <Text style={styles.categoryName}>{item.name}</Text>
      <Text style={styles.categoryPosts}>{item.posts.toLocaleString()} posts</Text>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'trending':
        return (
          <FlatList
            data={mockTrendingTopics}
            renderItem={renderTrendingTopic}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.trendingList}
          />
        );
      case 'featured':
        return (
          <FlatList
            data={mockFeaturedContent}
            renderItem={renderFeaturedContent}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.featuredList}
          />
        );
      case 'categories':
        return (
          <FlatList
            data={mockCategories}
            renderItem={renderCategory}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.categoriesList}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>
        <TouchableOpacity style={styles.notificationsButton}>
          <Ionicons name="notifications-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#a3a3a3" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search topics, people, or content..."
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

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'trending' && styles.tabActive]}
          onPress={() => setActiveTab('trending')}
        >
          <Text style={[styles.tabText, activeTab === 'trending' && styles.tabTextActive]}>
            Trending
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'featured' && styles.tabActive]}
          onPress={() => setActiveTab('featured')}
        >
          <Text style={[styles.tabText, activeTab === 'featured' && styles.tabTextActive]}>
            Featured
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeTab === 'categories' && styles.tabActive]}
          onPress={() => setActiveTab('categories')}
        >
          <Text style={[styles.tabText, activeTab === 'categories' && styles.tabTextActive]}>
            Categories
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {renderTabContent()}
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
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  notificationsButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#00ff88',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  tabTextActive: {
    color: '#1a1a1a',
  },
  trendingList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  trendingTopic: {
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  topicHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  topicTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  trendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  trendingText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  topicFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topicCategory: {
    fontSize: 14,
    color: '#00ff88',
    fontWeight: '500',
  },
  topicPosts: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  featuredList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  featuredContent: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  contentImage: {
    width: '100%',
    height: 200,
  },
  contentOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 16,
    justifyContent: 'space-between',
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  contentCategory: {
    fontSize: 12,
    color: '#00ff88',
  },
  contentStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: 'white',
  },
  contentInfo: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  contentDescription: {
    fontSize: 14,
    color: '#e0e0e0',
    lineHeight: 20,
  },
  categoriesList: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  categoryItem: {
    flex: 1,
    backgroundColor: '#262626',
    borderRadius: 12,
    padding: 16,
    margin: 4,
    alignItems: 'center',
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  categoryPosts: {
    fontSize: 12,
    color: '#a3a3a3',
  },
});

export default ExploreScreen;
