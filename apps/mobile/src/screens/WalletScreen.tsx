import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';

const { width: screenWidth } = Dimensions.get('window');

// ✅ OPTIMIZED: Memoized mock data
const mockTickets = {
  active: [
    {
      id: '1',
      eventName: 'Summer Music Festival 2024',
      eventDate: '2024-07-15',
      eventTime: '18:00',
      venue: 'Central Park, NYC',
      ticketType: 'General Admission',
      price: 75,
      status: 'active',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket_1',
      usedAt: null,
    },
    {
      id: '2',
      eventName: 'Tech Conference 2024',
      eventDate: '2024-08-20',
      eventTime: '09:00',
      venue: 'Convention Center, SF',
      ticketType: 'VIP Pass',
      price: 299,
      status: 'active',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket_2',
      usedAt: null,
    },
  ],
  used: [
    {
      id: '3',
      eventName: 'Comedy Night',
      eventDate: '2024-06-10',
      eventTime: '20:00',
      venue: 'Comedy Club, LA',
      ticketType: 'General Admission',
      price: 45,
      status: 'used',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket_3',
      usedAt: '2024-06-10T20:15:00Z',
    },
  ],
  expired: [
    {
      id: '4',
      eventName: 'Spring Art Exhibition',
      eventDate: '2024-05-01',
      eventTime: '14:00',
      venue: 'Museum of Modern Art',
      ticketType: 'Student Pass',
      price: 25,
      status: 'expired',
      qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=ticket_4',
      usedAt: null,
    },
  ],
};

const WalletScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'active' | 'used' | 'expired'>('active');

  // ✅ OPTIMIZED: Memoized tab data
  const tabData = useMemo(() => [
    { key: 'active', label: 'Active', count: mockTickets.active.length },
    { key: 'used', label: 'Used', count: mockTickets.used.length },
    { key: 'expired', label: 'Expired', count: mockTickets.expired.length },
  ], []);

  // ✅ OPTIMIZED: Memoized current tickets
  const currentTickets = useMemo(() => mockTickets[activeTab], [activeTab]);

  // ✅ OPTIMIZED: Memoized formatters
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const formatTime = useCallback((timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }, []);

  // ✅ OPTIMIZED: Memoized ticket press handler
  const handleTicketPress = useCallback((ticket: any) => {
    if (ticket.status === 'active') {
      navigation.navigate('TicketDetail' as never, { ticket } as never);
    } else {
      Alert.alert('Ticket Details', `${ticket.eventName}\n${formatDate(ticket.eventDate)} at ${formatTime(ticket.eventTime)}`);
    }
  }, [navigation, formatDate, formatTime]);

  // ✅ OPTIMIZED: Memoized QR code handler
  const handleQRCodePress = useCallback((ticket: any) => {
    const qrCode = ticket.qrCode;
    Alert.alert(
      'QR Code',
      `QR Code: ${qrCode}\n\nThis would validate the ticket with the backend.`,
      [{ text: 'OK' }]
    );
  }, []);

  // ✅ OPTIMIZED: Memoized ticket renderer with React.memo
  const renderTicketCard = useCallback(({ item: ticket }: { item: any }) => (
    <TouchableOpacity
      key={ticket.id}
      style={[styles.ticketCard, { borderColor: theme.colors.border }]}
      onPress={() => handleTicketPress(ticket)}
      activeOpacity={0.7}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={[styles.eventName, { color: theme.colors.text }]}>
            {ticket.eventName}
          </Text>
          <Text style={[styles.eventDetails, { color: theme.colors.textSecondary }]}>
            {formatDate(ticket.eventDate)} • {formatTime(ticket.eventTime)}
          </Text>
          <Text style={[styles.venue, { color: theme.colors.textSecondary }]}>
            📍 {ticket.venue}
          </Text>
        </View>
        <View style={styles.ticketStatus}>
          <View style={[
            styles.statusBadge,
            {
              backgroundColor: ticket.status === 'active'
                ? theme.colors.primary + '20'
                : ticket.status === 'used'
                ? '#4CAF50' + '20'
                : '#FF9800' + '20'
            }
          ]}>
            <Text style={[
              styles.statusText,
              {
                color: ticket.status === 'active'
                  ? theme.colors.primary
                  : ticket.status === 'used'
                  ? '#4CAF50'
                  : '#FF9800'
              }
            ]}>
              {ticket.status.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.ticketDetails}>
        <View style={styles.ticketTypeContainer}>
          <Text style={[styles.ticketType, { color: theme.colors.text }]}>
            {ticket.ticketType}
          </Text>
          <Text style={[styles.ticketPrice, { color: theme.colors.primary }]}>
            {formatCurrency(ticket.price)}
          </Text>
        </View>

        {ticket.status === 'active' && (
          <TouchableOpacity
            style={styles.qrCodeContainer}
            onPress={() => handleQRCodePress(ticket)}
            activeOpacity={0.7}
          >
            <Image source={{ uri: ticket.qrCode }} style={styles.qrCode} />
            <Text style={[styles.qrCodeLabel, { color: theme.colors.textSecondary }]}>
              Tap to view QR
            </Text>
          </TouchableOpacity>
        )}

        {ticket.status === 'used' && ticket.usedAt && (
          <View style={styles.usedInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Text style={[styles.usedText, { color: theme.colors.textSecondary }]}>
              Used on {formatDate(ticket.usedAt)}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  ), [theme.colors, handleTicketPress, handleQRCodePress, formatDate, formatTime, formatCurrency]);

  // ✅ OPTIMIZED: Memoized key extractor
  const keyExtractor = useCallback((item: any) => item.id, []);

  // ✅ OPTIMIZED: Memoized empty state renderer
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyState}>
      <Ionicons
        name="ticket-outline"
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={[styles.emptyStateText, { color: theme.colors.textSecondary }]}>
        No {activeTab} tickets
      </Text>
      <Text style={[styles.emptyStateSubtext, { color: theme.colors.textSecondary }]}>
        {activeTab === 'active'
          ? 'Your active tickets will appear here'
          : activeTab === 'used'
          ? 'Your used tickets will appear here'
          : 'Your expired tickets will appear here'
        }
      </Text>
    </View>
  ), [activeTab, theme.colors.textSecondary]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Tickets</Text>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabData.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
            onPress={() => setActiveTab(tab.key as any)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary }
            ]}>
              {tab.label}
            </Text>
            <View style={[
              styles.tabBadge,
              { backgroundColor: activeTab === tab.key ? theme.colors.primary : theme.colors.border }
            ]}>
              <Text style={[
                styles.tabBadgeText,
                { color: activeTab === tab.key ? theme.colors.white : theme.colors.textSecondary }
              ]}>
                {tab.count}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tickets List */}
      <FlatList
        data={currentTickets}
        renderItem={renderTicketCard}
        keyExtractor={keyExtractor}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.ticketsList}
        ListEmptyComponent={renderEmptyState}
        // ✅ OPTIMIZED: Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={3}
        updateCellsBatchingPeriod={50}
        getItemLayout={(data, index) => ({
          length: 200, // Approximate height of each ticket card
          offset: 200 * index,
          index,
        })}
      />
    </SafeAreaView>
  );
};

// ✅ OPTIMIZED: Memoized component
export default React.memo(WalletScreen);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeTab: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ticketsList: {
    padding: 20,
    flexGrow: 1,
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  eventDetails: {
    fontSize: 14,
    marginBottom: 2,
  },
  venue: {
    fontSize: 14,
  },
  ticketStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  ticketDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTypeContainer: {
    flex: 1,
  },
  ticketType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  ticketPrice: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  qrCodeContainer: {
    alignItems: 'center',
  },
  qrCode: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  qrCodeLabel: {
    fontSize: 10,
  },
  usedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  usedText: {
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.7,
  },
});
