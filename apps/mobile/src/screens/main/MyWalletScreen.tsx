import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const MyWalletScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'transactions'>('tickets');

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity style={styles.backButton}>
            <Ionicons name="chevron-down" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Wallet</Text>
          <View style={styles.headerSpacer} />
        </View>
        
        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <View style={styles.tabs}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
              onPress={() => setActiveTab('tickets')}
            >
              <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>
                Tickets
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'transactions' && styles.activeTab]}
              onPress={() => setActiveTab('transactions')}
            >
              <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
                Transactions
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {activeTab === 'tickets' ? (
          <View style={styles.emptyState}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAQCNniJkbYwYIZcV2FYd7I2PMjudyV9ts4u8COZCY_xH7lMASXs2_Og6epcbTaNweVzZ962jZbzeQvi5cYjn-DzNNLSeT3JCIxe9fzB3nHKJOABVHRzXmGdOqlEOvG22nBcL875UDeloD8Kf_pGh0CQYdyn1ROOWBQmLq1HTFMseN5o4azqtXauaW0J1TXy6L0w9AYEQF6ybEe481ThuchLw92efBRk9Cpmk7yFaFB6ltZ9jTlwu3RBW5wmgdGdwH3ksNhSwZVv7D1',
              }}
              style={styles.emptyStateImage}
              resizeMode="cover"
            />
            
            <View style={styles.emptyStateContent}>
              <Text style={styles.emptyStateTitle}>No Tickets Yet</Text>
              <Text style={styles.emptyStateDescription}>
                Your wallet is empty. Browse events to find your next experience and add tickets to your wallet.
              </Text>
            </View>
            
            <TouchableOpacity style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse Events</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=300&fit=crop',
              }}
              style={styles.emptyStateImage}
              resizeMode="cover"
            />
            
            <View style={styles.emptyStateContent}>
              <Text style={styles.emptyStateTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyStateDescription}>
                Your transaction history will appear here once you purchase tickets or make payments.
              </Text>
            </View>
            
            <TouchableOpacity style={styles.browseButton}>
              <Text style={styles.browseButtonText}>Browse Events</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={28} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search" size={28} color="#9ca3af" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={36} color="#1a1a1a" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="wallet" size={28} color="#00ff88" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={28} color="#9ca3af" />
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
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    backdropFilter: 'blur(10px)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 24,
  },
  tabsContainer: {
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
    fontSize: 16,
    fontWeight: '600',
    color: '#9ca3af',
  },
  activeTabText: {
    color: '#00ff88',
  },
  mainContent: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    maxWidth: 300,
    alignSelf: 'center',
    gap: 32,
  },
  emptyStateImage: {
    width: '100%',
    aspectRatio: 4/3,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateContent: {
    alignItems: 'center',
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  emptyStateDescription: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 24,
  },
  browseButton: {
    width: '100%',
    backgroundColor: '#00ff88',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  bottomNavigation: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  navItem: {
    padding: 8,
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -32,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default MyWalletScreen;
