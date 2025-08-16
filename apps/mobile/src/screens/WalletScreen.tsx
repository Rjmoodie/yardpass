import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';
import QRScanner from '../components/scanner/QRScanner';

const { width } = Dimensions.get('window');

const WalletScreen: React.FC = () => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'active' | 'used' | 'expired'>('active');
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Mock data - replace with real data from API
  const mockTickets = {
    active: [
      {
        id: '1',
        eventName: 'Summer Music Festival 2024',
        eventDate: '2024-08-20',
        eventTime: '18:00',
        ticketType: 'General Admission',
        price: 89.99,
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=SUMMER_FEST_2024_GA_001',
        status: 'active',
        venue: 'Central Park, NYC',
      },
      {
        id: '2',
        eventName: 'Tech Conference 2024',
        eventDate: '2024-09-15',
        eventTime: '09:00',
        ticketType: 'VIP Pass',
        price: 299.99,
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TECH_CONF_2024_VIP_002',
        status: 'active',
        venue: 'Convention Center, SF',
      },
    ],
    used: [
      {
        id: '3',
        eventName: 'Comedy Night',
        eventDate: '2024-07-10',
        eventTime: '20:00',
        ticketType: 'General Admission',
        price: 45.00,
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=COMEDY_NIGHT_GA_003',
        status: 'used',
        venue: 'Comedy Club, LA',
        usedAt: '2024-07-10 20:15',
      },
    ],
    expired: [
      {
        id: '4',
        eventName: 'Spring Art Exhibition',
        eventDate: '2024-05-20',
        eventTime: '14:00',
        ticketType: 'Student Pass',
        price: 25.00,
        qrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=ART_EXHIBIT_STUDENT_004',
        status: 'expired',
        venue: 'Museum of Modern Art, NYC',
      },
    ],
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleTicketPress = (ticket: any) => {
    if (ticket.status === 'active') {
      navigation.navigate('TicketDetail' as never, { ticket } as never);
    } else {
      Alert.alert('Ticket Details', `${ticket.eventName}\n${formatDate(ticket.eventDate)} at ${formatTime(ticket.eventTime)}`);
    }
  };

  const handleScanQR = () => {
    setShowQRScanner(true);
  };

  const handleQRCodeScanned = (qrCode: string) => {
    setShowQRScanner(false);
    // In a real app, this would validate the QR code with the backend
    Alert.alert(
      'QR Code Scanned',
      `QR Code: ${qrCode}\n\nThis would validate the ticket with the backend.`,
      [
        { text: 'OK', onPress: () => console.log('QR Code processed') }
      ]
    );
  };

  const renderTicketCard = (ticket: any) => (
    <TouchableOpacity
      key={ticket.id}
      style={[styles.ticketCard, { borderColor: theme.colors.border }]}
      onPress={() => handleTicketPress(ticket)}
      activeOpacity={0.8}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={[styles.eventName, { color: theme.colors.text }]} numberOfLines={2}>
            {ticket.eventName}
          </Text>
          <Text style={[styles.eventDate, { color: theme.colors.textSecondary }]}>
            {formatDate(ticket.eventDate)} • {formatTime(ticket.eventTime)}
          </Text>
          <Text style={[styles.venue, { color: theme.colors.textSecondary }]} numberOfLines={1}>
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
                ? '#34C759' + '20'
                : '#FF3B30' + '20'
            }
          ]}>
            <Text style={[
              styles.statusText,
              {
                color: ticket.status === 'active' 
                  ? theme.colors.primary 
                  : ticket.status === 'used'
                  ? '#34C759'
                  : '#FF3B30'
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
            ${ticket.price}
          </Text>
        </View>

        {ticket.status === 'active' && (
          <View style={styles.qrContainer}>
            <Image source={{ uri: ticket.qrCode }} style={styles.qrCode} />
            <Text style={[styles.qrText, { color: theme.colors.textSecondary }]}>
              Show this QR code at entry
            </Text>
          </View>
        )}

        {ticket.status === 'used' && ticket.usedAt && (
          <View style={styles.usedInfo}>
            <Ionicons name="checkmark-circle" size={16} color="#34C759" />
            <Text style={[styles.usedText, { color: '#34C759' }]}>
              Used on {new Date(ticket.usedAt).toLocaleDateString()}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>My Tickets</Text>
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanQR}
            activeOpacity={0.7}
          >
            <Ionicons name="qr-code-outline" size={24} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          {[
            { key: 'active', label: 'Active', count: mockTickets.active.length },
            { key: 'used', label: 'Used', count: mockTickets.used.length },
            { key: 'expired', label: 'Expired', count: mockTickets.expired.length },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.tab,
                activeTab === tab.key && { borderBottomColor: theme.colors.primary }
              ]}
              onPress={() => setActiveTab(tab.key as any)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.tabText,
                { color: activeTab === tab.key ? theme.colors.primary : theme.colors.textSecondary }
              ]}>
                {tab.label} ({tab.count})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tickets List */}
        <ScrollView style={styles.ticketsList} showsVerticalScrollIndicator={false}>
          {mockTickets[activeTab].length > 0 ? (
            mockTickets[activeTab].map(renderTicketCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons 
                name="ticket-outline" 
                size={64} 
                color={theme.colors.textSecondary} 
              />
              <Text style={[styles.emptyStateTitle, { color: theme.colors.text }]}>
                No {activeTab} tickets
              </Text>
              <Text style={[styles.emptyStateSubtitle, { color: theme.colors.textSecondary }]}>
                {activeTab === 'active' 
                  ? 'Your active tickets will appear here'
                  : activeTab === 'used'
                  ? 'Tickets you\'ve used will appear here'
                  : 'Expired tickets will appear here'
                }
              </Text>
              {activeTab === 'active' && (
                <TouchableOpacity
                  style={[styles.browseButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => navigation.navigate('Discover' as never)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.browseButtonText}>Browse Events</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* QR Scanner Modal */}
      <Modal
        visible={showQRScanner}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <QRScanner
          onQRCodeScanned={handleQRCodeScanned}
          onClose={() => setShowQRScanner(false)}
          title="Scan Ticket QR Code"
          subtitle="Point your camera at the ticket QR code to validate"
        />
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  scanButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  ticketsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  ticketCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: theme.colors.text,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  ticketInfo: {
    flex: 1,
    marginRight: 12,
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
    lineHeight: 22,
  },
  eventDate: {
    fontSize: 14,
    marginBottom: 4,
  },
  venue: {
    fontSize: 12,
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
    fontWeight: '600',
  },
  ticketDetails: {
    gap: 12,
  },
  ticketTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketType: {
    fontSize: 16,
    fontWeight: '600',
  },
  ticketPrice: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  qrCode: {
    width: 120,
    height: 120,
    marginBottom: 8,
  },
  qrText: {
    fontSize: 12,
    textAlign: 'center',
  },
  usedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  usedText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 40,
  },
  browseButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});

export default WalletScreen;
