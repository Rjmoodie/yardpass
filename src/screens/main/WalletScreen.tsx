import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { ApiService } from '../../services/api';
import { theme } from '../../constants/theme';

interface Ticket {
  id: string;
  eventTitle: string;
  eventDate: string;
  ticketType: string;
  qrCode: string;
  status: 'active' | 'used' | 'expired';
  price: number;
  eventImage: string;
}

interface Transaction {
  id: string;
  type: 'purchase' | 'refund' | 'transfer';
  amount: number;
  description: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
}

const WalletScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'tickets' | 'payments'>('tickets');
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Load tickets
      const ticketsResponse = await ApiService.wallet.getUserTickets();
      if (ticketsResponse.success && ticketsResponse.data) {
        const formattedTickets: Ticket[] = ticketsResponse.data.map((item: any) => ({
          id: item.id,
          eventTitle: item.ticket?.event?.title || 'Unknown Event',
          eventDate: item.ticket?.event?.start_at || '',
          ticketType: item.ticket?.tier_name || 'General Admission',
          qrCode: item.qr_code || `QR_${item.id}`,
          status: item.status || 'active',
          price: item.ticket?.price || 0,
          eventImage: item.ticket?.event?.cover_image_url || 'https://via.placeholder.com/100',
        }));
        setTickets(formattedTickets);
      }

      // Load transactions
      const transactionsResponse = await ApiService.wallet.getTransactionHistory();
      if (transactionsResponse.success && transactionsResponse.data) {
        const formattedTransactions: Transaction[] = transactionsResponse.data.map((order: any) => ({
          id: order.id,
          type: 'purchase',
          amount: order.total_amount || 0,
          description: order.items?.[0]?.ticket?.event?.title || 'Ticket Purchase',
          date: order.created_at || '',
          status: order.status || 'completed',
        }));
        setTransactions(formattedTransactions);
      }
    } catch (error) {
      console.error('Error loading wallet data:', error);
      Alert.alert('Error', 'Failed to load wallet data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadWalletData();
    setRefreshing(false);
  };

  const handleAddPaymentMethod = () => {
    Alert.alert('Add Payment Method', 'Payment method functionality coming soon!');
  };

  const handleViewTicket = (ticket: Ticket) => {
    navigation.navigate('TicketDetails' as never, { ticketId: ticket.id } as never);
  };

  const handleShowQRCode = (ticket: Ticket) => {
    Alert.alert('QR Code', `QR Code: ${ticket.qrCode}`);
  };

  const renderTicket = ({ item }: { item: Ticket }) => (
    <TouchableOpacity style={styles.ticketCard} onPress={() => handleViewTicket(item)}>
      <Image source={{ uri: item.eventImage }} style={styles.eventImage} />
      <View style={styles.ticketContent}>
        <Text style={styles.eventTitle}>{item.eventTitle}</Text>
        <Text style={styles.eventDate}>
          {new Date(item.eventDate).toLocaleDateString()}
        </Text>
        <Text style={styles.ticketType}>{item.ticketType}</Text>
        <Text style={styles.ticketPrice}>
          {item.price > 0 ? `$${item.price}` : 'Free'}
        </Text>
      </View>
      <View style={styles.ticketActions}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
        <TouchableOpacity 
          style={styles.qrButton}
          onPress={() => handleShowQRCode(item)}
        >
          <Ionicons name="qr-code" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={styles.transactionCard}>
      <View style={styles.transactionIcon}>
        <Ionicons 
          name={getTransactionIcon(item.type)} 
          size={24} 
          color={getTransactionColor(item.type)} 
        />
      </View>
      <View style={styles.transactionContent}>
        <Text style={styles.transactionDescription}>{item.description}</Text>
        <Text style={styles.transactionDate}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>
      <View style={styles.transactionAmount}>
        <Text style={[styles.amountText, { color: getTransactionColor(item.type) }]}>
          {item.type === 'purchase' ? '-' : '+'}${item.amount}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'completed':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'used':
      case 'expired':
      case 'failed':
        return '#F44336';
      default:
        return '#9E9E9E';
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'purchase':
        return 'card';
      case 'refund':
        return 'refresh';
      case 'transfer':
        return 'swap-horizontal';
      default:
        return 'card';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'purchase':
        return '#F44336';
      case 'refund':
        return '#4CAF50';
      case 'transfer':
        return '#2196F3';
      default:
        return '#9E9E9E';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading wallet...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Wallet</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPaymentMethod}>
          <Ionicons name="add" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tickets' && styles.activeTab]}
          onPress={() => setActiveTab('tickets')}
        >
          <Text style={[styles.tabText, activeTab === 'tickets' && styles.activeTabText]}>
            Tickets ({tickets.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'payments' && styles.activeTab]}
          onPress={() => setActiveTab('payments')}
        >
          <Text style={[styles.tabText, activeTab === 'payments' && styles.activeTabText]}>
            Payments ({transactions.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {activeTab === 'tickets' ? (
          <View style={styles.ticketsContainer}>
            {tickets.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="ticket" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyTitle}>No tickets yet</Text>
                <Text style={styles.emptySubtitle}>
                  Purchase tickets to events and they'll appear here
                </Text>
                <TouchableOpacity 
                  style={styles.browseButton}
                  onPress={() => navigation.navigate('Discover' as never)}
                >
                  <Text style={styles.browseButtonText}>Browse Events</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <FlatList
                data={tickets}
                renderItem={renderTicket}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        ) : (
          <View style={styles.paymentsContainer}>
            {transactions.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="card" size={64} color={theme.colors.textSecondary} />
                <Text style={styles.emptyTitle}>No transactions yet</Text>
                <Text style={styles.emptySubtitle}>
                  Your payment history will appear here
                </Text>
              </View>
            ) : (
              <FlatList
                data={transactions}
                renderItem={renderTransaction}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  addButton: {
    padding: 8,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: theme.colors.primary + '20',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  activeTabText: {
    color: theme.colors.primary,
  },
  content: {
    flex: 1,
  },
  ticketsContainer: {
    padding: 20,
  },
  paymentsContainer: {
    padding: 20,
  },
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  eventImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  ticketContent: {
    flex: 1,
    justifyContent: 'center',
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  ticketType: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  ticketPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  ticketActions: {
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    textTransform: 'capitalize',
  },
  qrButton: {
    padding: 8,
  },
  transactionCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  transactionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  transactionAmount: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amountText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  browseButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  browseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WalletScreen;
