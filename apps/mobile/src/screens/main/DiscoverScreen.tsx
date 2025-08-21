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
import { LinearGradient } from 'expo-linear-gradient';
import SmartSearchBar from '@/components/smart/SmartSearchBar';

const { width } = Dimensions.get('window');

interface EventCategory {
  id: string;
  title: string;
  imageUrl: string;
}

const eventCategories: EventCategory[] = [
  {
    id: '1',
    title: 'Live Music',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDp2NsJjGMq6FWUibZwSMoKMJ7xR1BPO1c_t3zszwtODB5h_VQodoTpnlNfFe0N6-ClWuJXYstSDhJ8Z6XfLysiK-sTFw2BXYP81qEaxKIKCcNeqxHN-h65R6EWZUR1w10DlcaMSS-rJr3X6l6YITsJTkGygAyCmw24gbtfTgRJAWSfewL4KBVXaPMciJpLuXM03NY3d6uKwlyPZngqTLhMTpz4n_8Dps2LQ42i8pzAMep0WbZWNhZJUAM0x57JxD8BuUzskOPeK2ah',
  },
  {
    id: '2',
    title: 'Outdoor Festivals',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCi4uOHGW2VIVVlQXM5NZeOiPcZvkVM2uJvNy4JGpVYQOUvHA-l8Bzc8VDKzGqiMxkcfCeOi4r1KILxAqJY6oZkE3Yhr1hJQqsNr8hnRWqigtzxFuEqzOHoahs2yCvm45smIfMykb54pwxyPeUIbE6nZR_xF0bKK8ZKbHwT7IqRg_P4nbCO2HhVIGOOrczZtUH4NefAFYKYOwZz_5FZS7uNO17Z0SYVbJkjPbLCdVhUYAlcNbAtbIu_fk_r46XeGTxaTOqFyc5-vtI-',
  },
  {
    id: '3',
    title: 'Nightlife',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxidXvEcjRXe9HJa3AtffOGz6zu1AMTcN99O_RZO_NeKopvpMrxhXME-eDbFBl6joXMnB3W5-EPUp2mNTfu5wmd1F5GZI0JfirtcIyNRlCiOQOzwFJIF1JHakj2N2LH57h3-Me-97I1b2a9gtHhO2XGYt5eNkiXEmMDKqgQcGXAOIfOKPTPAKc9AfvV33r6HD2OJMCkGkhfotPkv7kZkwQbsLl3lqRDEa7Zdul6FLh96-5xvpYlL3JOW5aub3MY4RTNQvP3o-dKL4W',
  },
  {
    id: '4',
    title: 'Art & Culture',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBY28sPdqS1jrDlP0eQvH6_4mPJD_b6yppFf_8TfYY0MviaRHuf3T9vRYGyMqlvEGhtbuQSmQA32LBAX5dkPtqs6gTRkwIkgMohEq6-WJ2MqIZQuAL6bsanMUWzcjFUlx2VQkLAkqaoY7mSz33mXJmzl23RBCtRd3O_FivAx8zWHIAEvUaMsSJ2zz7oRz-Sd6K68fkhFTAWftqx8H3MdHViCqWDM4ID54jEY5asnjM6fFGE_ob4AcbgYEIa7FsphRWgxXZ5ADdRem5t',
  },
  {
    id: '5',
    title: 'Comedy',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA1RSpSvqSvoyolWbpCUBoDj2kKP28vYCzY8RvQFtP9GnRJ9rZ6T03Y9k0GL-hYN3j9GdflG4xl9KohDdnATgAZ-kqsAeP-hd-_1enIQWtUdpDdAekqw6DUW9NzAPYaIcHrJsY48e6FVnfYiNsXcR1aNbXhiXKkh2NtFg3B6Zh7QRkikvngA-1vt51zdM_v7mHyAv_PnTFOyEsHkpNHvLGYFwUPp848EdQWXEBUDVaIsbTbeIOknZqWOssTzSZoxxlKk5-nbDMeLhYy',
  },
  {
    id: '6',
    title: 'Food & Drink',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBP5eIKhfmR7zCmSp7rLX-DDUPlf5dG76I-FWYt7miQbL4vBkH_PgkisBfQ0OkgeOgz6ynoP2CcfnBlXH2oWQTE9XcF1pGIKrvw5qhj6wzJPUxI-cBqWN0Zq8sL5gwv4AyDJ4lCLOaKtrZmz1kvyySJyNDCIe_eyVzwpHElFP5aw5EIP1KHGZPBgk9yJj6ABIZhxQ5kZvg5Y1WleUmJoTZiEhsDv_vNKn2eBVkg7L73l7mQHbq2QbACmkTHQiA3TG7HJXDTNmjU0VTK',
  },
];

const DiscoverScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'foryou' | 'nearby' | 'following'>('nearby');
  const [viewMode, setViewMode] = useState<'grid' | 'heatmap'>('grid');
  const [showSearch, setShowSearch] = useState(false);

  const EventCard = ({ event }: { event: EventCategory }) => (
    <TouchableOpacity style={styles.eventCard}>
      <Image source={{ uri: event.imageUrl }} style={styles.eventImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.7)']}
        style={styles.eventGradient}
      />
      <View style={styles.eventTitleContainer}>
        <Text style={styles.eventTitle}>{event.title}</Text>
      </View>
    </TouchableOpacity>
  );

  const HeatmapSpot = ({ size, top, left }: { size: number; top: string; left: string }) => (
    <View
      style={[
        styles.heatmapSpot,
        {
          width: size,
          height: size,
          top: top,
          left: left,
        },
      ]}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerTitle}>Discover</Text>
          <TouchableOpacity 
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
          >
            <Ionicons name="search" size={24} color="white" />
          </TouchableOpacity>
        </View>
        
        {/* Navigation Tabs */}
        <View style={styles.navTabs}>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'foryou' && styles.activeNavTab]}
            onPress={() => setActiveTab('foryou')}
          >
            <Text style={[styles.navTabText, activeTab === 'foryou' && styles.activeNavTabText]}>
              For You
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'nearby' && styles.activeNavTab]}
            onPress={() => setActiveTab('nearby')}
          >
            <Text style={[styles.navTabText, activeTab === 'nearby' && styles.activeNavTabText]}>
              Nearby
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.navTab, activeTab === 'following' && styles.activeNavTab]}
            onPress={() => setActiveTab('following')}
          >
            <Text style={[styles.navTabText, activeTab === 'following' && styles.activeNavTabText]}>
              Following
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Smart Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <SmartSearchBar 
            placeholder="Search events, people, places..."
            onSearch={(query) => {
              console.log('Search query:', query);
              // You can add navigation to search results here
            }}
            onSuggestionPress={(suggestion) => {
              console.log('Suggestion pressed:', suggestion);
              // You can add navigation to search results here
            }}
          />
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* View Toggle */}
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'grid' && styles.activeToggleButton,
            ]}
            onPress={() => setViewMode('grid')}
          >
            <Ionicons
              name="grid"
              size={20}
              color={viewMode === 'grid' ? '#1a1a1a' : '#a3a3a3'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              viewMode === 'heatmap' && styles.activeToggleButton,
            ]}
            onPress={() => setViewMode('heatmap')}
          >
            <Ionicons
              name="map"
              size={20}
              color={viewMode === 'heatmap' ? '#1a1a1a' : '#a3a3a3'}
            />
          </TouchableOpacity>
        </View>

        {/* Event Grid */}
        <View style={[styles.eventGrid, viewMode === 'heatmap' && styles.heatmapActive]}>
          {eventCategories.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>

        {/* Heatmap Overlay */}
        {viewMode === 'heatmap' && (
          <View style={styles.heatmapOverlay}>
            <HeatmapSpot size={300} top="10%" left="5%" />
            <HeatmapSpot size={250} top="40%" left="50%" />
            <HeatmapSpot size={200} top="65%" left="15%" />
            <HeatmapSpot size={150} top="5%" left="70%" />
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#a3a3a3" />
          <Text style={styles.navLabel}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search" size={24} color="#00ff88" />
          <Text style={[styles.navLabel, styles.activeNavLabel]}>Discover</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="calendar" size={24} color="#a3a3a3" />
          <Text style={styles.navLabel}>Tickets</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#a3a3a3" />
          <Text style={styles.navLabel}>Profile</Text>
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
    backgroundColor: 'rgba(26,26,26,0.8)',
    backdropFilter: 'blur(10px)',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  searchButton: {
    padding: 8,
  },
  navTabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  navTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activeNavTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#00ff88',
  },
  navTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  activeNavTabText: {
    color: '#00ff88',
    fontWeight: 'bold',
  },
  mainContent: {
    flex: 1,
    padding: 16,
    position: 'relative',
  },
  viewToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    padding: 4,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 16,
  },
  activeToggleButton: {
    backgroundColor: '#00ff88',
  },
  eventGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  heatmapActive: {
    opacity: 0.1,
  },
  eventCard: {
    width: (width - 48) / 2,
    aspectRatio: 3/4,
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  eventImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  eventGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  eventTitleContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: 16,
  },
  eventTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    lineHeight: 22,
  },
  heatmapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  heatmapSpot: {
    position: 'absolute',
    borderRadius: 150,
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: 'rgba(0, 255, 136, 0.4)',
  },
  bottomNavigation: {
    backgroundColor: 'rgba(26,26,26,0.8)',
    backdropFilter: 'blur(10px)',
    borderTopWidth: 1,
    borderTopColor: '#3a3a3a',
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
    color: '#a3a3a3',
    fontSize: 12,
  },
  activeNavLabel: {
    color: '#00ff88',
  },
  createButton: {
    backgroundColor: '#00ff88',
    borderRadius: 8,
    padding: 8,
    marginTop: -16,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a3a',
  },
});

export default DiscoverScreen;
