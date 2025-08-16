import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchResult {
  id: string;
  type: 'user' | 'event' | 'video' | 'topic';
  title: string;
  subtitle?: string;
  image?: string;
  avatar?: string;
  followers?: string;
  isVerified?: boolean;
  isFollowing?: boolean;
}

const mockTrendingTopics = [
  { id: '1', title: '#SummerFest2024', posts: '12.5K' },
  { id: '2', title: '#LiveMusic', posts: '8.2K' },
  { id: '3', title: '#FoodFestival', posts: '5.7K' },
  { id: '4', title: '#ArtExhibition', posts: '3.1K' },
  { id: '5', title: '#ComedyNight', posts: '2.8K' },
];

const mockRecentSearches = [
  { id: '1', query: 'Liam Carter', type: 'user' },
  { id: '2', query: 'Electric Echoes Festival', type: 'event' },
  { id: '3', query: 'Dance videos', type: 'video' },
  { id: '4', query: 'Live music', type: 'topic' },
];

const mockSuggestedUsers: SearchResult[] = [
  {
    id: '1',
    type: 'user',
    title: 'Liam Carter',
    subtitle: 'Event Organizer',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAC2ZW6k71QIA0yTlGGv0wnOVFoDWH73syhYGPyqBLT3fLDRpGydvzPfuM46Y2MhyXEr9SQQm6O3X_wG9s88Fpbpudgd8CDlHX5pvHn2w6HeqhEWDWyWwCs8K8MjG9pDcDqeRRQwcSpFJzpdcYHOIM1ur5Is13vD0Ph1EBhlTVmA7-Y2CTyTGS4evxCmq-frpgHOB4ZZkq5_cl5eJFD80HZoKVItHDk0QbdxolBm0Ry2EPl3HQrmTvHV99dXFIm0YZ-a8Wrh7kd5BK5',
    followers: '1.2K followers',
    isVerified: true,
    isFollowing: false,
  },
  {
    id: '2',
    type: 'user',
    title: 'Sarah Dancer',
    subtitle: 'Dance Creator',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLdaCsNlxnJ522FOH-AI2NH7OnNZsbiSX-ET1sOx-YyhtUosZc1akJZnKJZUtCe4oQ8YvI7vdEOwjFZS57MriYCxf6SibOeABnAzgWbi2xilS0YRpHX_3zaKj4vPzA7U0OXU_eRwZVQYPyc_XSQL50MqPNPvOitd_2mItb6MkmP4JS9HAlPePhKuq-2Xi-SkJ6Wkn3xqpFnQ66zRMqRRUCzKklHq-MswQxJj_w-FXkQP6BpMRJMyzHoqaGVTJjF7Qw0o67yehq5o_G',
    followers: '45.2K followers',
    isVerified: true,
    isFollowing: true,
  },
  {
    id: '3',
    type: 'user',
    title: 'Mike Wilson',
    subtitle: 'Music Producer',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1mJjW8eviQ4VlqSn9PZ5hlBmVOFqizoprZZ2Q5KlunLgnHfQP3a2VL915jr5Yt_5Ci1wJWd9nM4w3PrkD6eoJykyr1sNu4QgD2ufzZsMyL3Z-ecv15dh6G_-0RQeUQAYkbk3mwsbKPpL4jkTI76SLogSs-Be17GaGZR9QbOtkx1-wRWMZzQ_y0gAh3uBeb6ngPwVnDOx36GVHaKaX-ZMqSJm8JfUxgindWKfNPCh7w9JgAVhwv8aW4rgKtz5Dp1ixK96loM_pnApf',
    followers: '8.7K followers',
    isVerified: false,
    isFollowing: false,
  },
];

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'event',
    title: 'Electric Echoes Festival',
    subtitle: 'July 20, 2024 • Central Park, NY',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDp2NsJjGMq6FWUibZwSMoKMJ7xR1BPO1c_t3zszwtODB5h_VQodoTpnlNfFe0N6-ClWuJXYstSDhJ8Z6XfLysiK-sTFw2BXYP81qEaxKIKCcNeqxHN-h65R6EWZUR1w10DlcaMSS-rJr3X6l6YITsJTkGygAyCmw24gbtfTgRJAWSfewL4KBVXaPMciJpLuXM03NY3d6uKwlyPZngqTLhMTpz4n_8Dps2LQ42i8pzAMep0WbZWNhZJUAM0x57JxD8BuUzskOPeK2ah',
  },
  {
    id: '2',
    type: 'video',
    title: 'Amazing dance moves!',
    subtitle: 'Sarah Dancer • 2 hours ago',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxidXvEcjRXe9HJa3AtffOGz6zu1AMTcN99O_RZO_NeKopvpMrxhXME-eDbFBl6joXMnB3W5-EPUp2mNTfu5wmd1F5GZI0JfirtcIyNRlCiOQOzwFJIF1JHakj2N2LH57h3-Me-97I1b2a9gtHhO2XGYt5eNkiXEmMDKqgQcGXAOIfOKPTPAKc9AfvV33r6HD2OJMCkGkhfotPkv7kZkwQbsLl3lqRDEa7Zdul6FLh96-5xvpYlL3JOW5aub3MY4RTNQvP3o-dKL4W',
  },
  {
    id: '3',
    type: 'user',
    title: 'Liam Carter',
    subtitle: 'Event Organizer',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAC2ZW6k71QIA0yTlGGv0wnOVFoDWH73syhYGPyqBLT3fLDRpGydvzPfuM46Y2MhyXEr9SQQm6O3X_wG9s88Fpbpudgd8CDlHX5pvHn2w6HeqhEWDWyWwCs8K8MjG9pDcDqeRRQwcSpFJzpdcYHOIM1ur5Is13vD0Ph1EBhlTVmA7-Y2CTyTGS4evxCmq-frpgHOB4ZZkq5_cl5eJFD80HZoKVItHDk0QbdxolBm0Ry2EPl3HQrmTvHV99dXFIm0YZ-a8Wrh7kd5BK5',
    followers: '1.2K followers',
    isVerified: true,
    isFollowing: false,
  },
];

const SearchScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'users' | 'events' | 'videos'>('all');
  const [showResults, setShowResults] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setShowResults(query.length > 0);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setShowResults(false);
  };

  const renderTrendingTopic = ({ item }: { item: { id: string; title: string; posts: string } }) => (
    <TouchableOpacity style={styles.trendingTopic}>
      <Text style={styles.trendingTitle}>{item.title}</Text>
      <Text style={styles.trendingPosts}>{item.posts} posts</Text>
    </TouchableOpacity>
  );

  const renderRecentSearch = ({ item }: { item: { id: string; query: string; type: string } }) => (
    <TouchableOpacity style={styles.recentSearch}>
      <Ionicons 
        name={item.type === 'user' ? 'person' : item.type === 'event' ? 'calendar' : 'search'} 
        size={20} 
        color="#a3a3a3" 
      />
      <Text style={styles.recentSearchText}>{item.query}</Text>
      <TouchableOpacity style={styles.removeButton}>
        <Ionicons name="close" size={16} color="#a3a3a3" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity style={styles.searchResult}>
      {item.type === 'user' ? (
        <View style={styles.userResult}>
          <Image source={{ uri: item.avatar! }} style={styles.userAvatar} />
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName}>{item.title}</Text>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
              )}
            </View>
            <Text style={styles.userSubtitle}>{item.subtitle}</Text>
            <Text style={styles.userFollowers}>{item.followers}</Text>
          </View>
          <TouchableOpacity style={[styles.followButton, item.isFollowing && styles.followingButton]}>
            <Text style={[styles.followButtonText, item.isFollowing && styles.followingButtonText]}>
              {item.isFollowing ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.contentResult}>
          <Image source={{ uri: item.image! }} style={styles.contentImage} />
          <View style={styles.contentInfo}>
            <Text style={styles.contentTitle}>{item.title}</Text>
            <Text style={styles.contentSubtitle}>{item.subtitle}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Search</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#a3a3a3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users, events, videos..."
            placeholderTextColor="#a3a3a3"
            value={searchQuery}
            onChangeText={handleSearch}
            autoFocus
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#a3a3a3" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showResults ? (
        <>
          {/* Search Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'all' && styles.activeTab]}
              onPress={() => setActiveTab('all')}
            >
              <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'users' && styles.activeTab]}
              onPress={() => setActiveTab('users')}
            >
              <Text style={[styles.tabText, activeTab === 'users' && styles.activeTabText]}>Users</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'events' && styles.activeTab]}
              onPress={() => setActiveTab('events')}
            >
              <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'videos' && styles.activeTab]}
              onPress={() => setActiveTab('videos')}
            >
              <Text style={[styles.tabText, activeTab === 'videos' && styles.activeTabText]}>Videos</Text>
            </TouchableOpacity>
          </View>

          {/* Search Results */}
          <FlatList
            data={mockSearchResults}
            renderItem={renderSearchResult}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        <ScrollView style={styles.exploreContent} showsVerticalScrollIndicator={false}>
          {/* Recent Searches */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Searches</Text>
              <TouchableOpacity>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={mockRecentSearches}
              renderItem={renderRecentSearch}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>

          {/* Trending Topics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trending Topics</Text>
            <FlatList
              data={mockTrendingTopics}
              renderItem={renderTrendingTopic}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>

          {/* Suggested Users */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Suggested for You</Text>
            <FlatList
              data={mockSuggestedUsers}
              renderItem={renderSearchResult}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
            />
          </View>
        </ScrollView>
      )}

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search" size={24} color="#00ff88" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="calendar" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#a3a3a3" />
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    paddingVertical: 8,
  },
  clearButton: {
    padding: 4,
  },
  tabsContainer: {
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
    fontWeight: '600',
    color: '#a3a3a3',
  },
  activeTabText: {
    color: '#00ff88',
  },
  resultsList: {
    flex: 1,
  },
  exploreContent: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  clearAllText: {
    fontSize: 14,
    color: '#00ff88',
  },
  trendingTopic: {
    paddingVertical: 8,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  trendingPosts: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  recentSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  recentSearchText: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    marginLeft: 12,
  },
  removeButton: {
    padding: 4,
  },
  searchResult: {
    paddingVertical: 8,
  },
  userResult: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  userSubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  userFollowers: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 2,
  },
  followButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  followingButton: {
    backgroundColor: '#262626',
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  followingButtonText: {
    color: 'white',
  },
  contentResult: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  contentSubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  bottomNavigation: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
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
    marginTop: -24,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default SearchScreen;
