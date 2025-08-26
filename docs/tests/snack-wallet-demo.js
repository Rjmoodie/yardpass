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
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// Simple theme for demo
const theme = {
  colors: {
    primary: '#007AFF',
    background: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
  },
};

const WalletScreen = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [showQRScanner, setShowQRScanner] = useState(false);

  // Mock data
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

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (timeString) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const handleScanQR = () => {
    Alert.alert('QR Scanner', 'QR Scanner would open here');
  };

  const handleQRCodeScanned = (data) => {
    Alert.alert('QR Code Scanned', `Data: ${data}`);
    setShowQRScanner(false);
  };

  const renderTicketCard = (ticket) => (
    <TouchableOpacity
      key={ticket.id}
      style={styles.ticketCard}
      activeOpacity={0.7}
      onPress={() => Alert.alert('Ticket Details', `Viewing ${ticket.eventName}`)}
    >
      <View style={styles.ticketHeader}>
        <View style={styles.ticketInfo}>
          <Text style={styles.eventName}>{ticket.eventName}</Text>
          <Text style={styles.venue}>{ticket.venue}</Text>
          <Text style={styles.dateTime}>
            {formatDate(ticket.eventDate)} • {formatTime(ticket.eventTime)}
          </Text>
        </View>
        <View style={styles.ticketStatus}>
          <Text style={[styles.statusText, { color: theme.colors.primary }]}>
            {ticket.ticketType}
          </Text>
          <Text style={styles.price}>${ticket.price}</Text>
        </View>
      </View>
      
      <View style={styles.ticketFooter}>
        <View style={styles.qrContainer}>
          <Image source={{ uri: ticket.qrCode }} style={styles.qrCode} />
          <Text style={styles.qrLabel}>QR Code</Text>
        </View>
        <TouchableOpacity
          style={[styles.scanButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleScanQR}
          activeOpacity={0.8}
        >
          <Ionicons name="qr-code-outline" size={20} color="white" />
          <Text style={styles.scanButtonText}>Scan</Text>
        </TouchableOpacity>
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
              onPress={() => setActiveTab(tab.key)}
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
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitle}>QR Scanner</Text>
          <Text style={styles.modalSubtitle}>This would show the camera view</Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowQRScanner(false)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
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
    borderBottomColor: '#E5E5EA',
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
    borderColor: '#E5E5EA',
    shadowColor: '#000',
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
  venue: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 14,
    color: '#8E8E93',
  },
  ticketStatus: {
    alignItems: 'flex-end',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  ticketFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qrContainer: {
    alignItems: 'center',
  },
  qrCode: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 4,
  },
  qrLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
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
    paddingHorizontal: 40,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 24,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default WalletScreen;
