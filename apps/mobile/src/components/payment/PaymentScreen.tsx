import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../constants/theme';

interface Ticket {
  id: string;
  name: string;
  price: number;
  eventName: string;
  eventDate: string;
  eventTime: string;
  venue: string;
  quantity: number;
}

interface PaymentMethod {
  id: string;
  type: 'card' | 'apple_pay' | 'google_pay';
  last4?: string;
  brand?: string;
  isDefault: boolean;
}

interface PaymentScreenProps {
  ticket: Ticket;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentFailure: (error: string) => void;
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({
  ticket,
  onPaymentSuccess,
  onPaymentFailure,
}) => {
  const navigation = useNavigation();
  const { currentTheme } = useTheme();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  // ✅ OPTIMIZED: Memoized payment methods loading
  const loadPaymentMethods = useCallback(async () => {
    // Mock payment methods - in real app, fetch from Stripe
    const mockMethods: PaymentMethod[] = [
      {
        id: 'card_1',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        isDefault: true,
      },
      {
        id: 'card_2',
        type: 'card',
        last4: '5555',
        brand: 'mastercard',
        isDefault: false,
      },
    ];

    if (Platform.OS === 'ios') {
      mockMethods.push({
        id: 'apple_pay',
        type: 'apple_pay',
        isDefault: false,
      });
    }

    if (Platform.OS === 'android') {
      mockMethods.push({
        id: 'google_pay',
        type: 'google_pay',
        isDefault: false,
      });
    }

    setPaymentMethods(mockMethods);
    setSelectedPaymentMethod(mockMethods[0]?.id || null);
  }, []);

  useEffect(() => {
    loadPaymentMethods();
  }, [loadPaymentMethods]);

  // ✅ OPTIMIZED: Memoized total calculations
  const totals = useMemo(() => {
    const subtotal = ticket.price * ticket.quantity;
    const serviceFee = subtotal * 0.05; // 5% service fee
    const tax = subtotal * 0.08; // 8% tax
    return {
      subtotal,
      serviceFee,
      tax,
      total: subtotal + serviceFee + tax,
    };
  }, [ticket.price, ticket.quantity]);

  // ✅ OPTIMIZED: Memoized currency formatter
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  }, []);

  // ✅ OPTIMIZED: Memoized date formatter
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // ✅ OPTIMIZED: Memoized time formatter
  const formatTime = useCallback((timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }, []);

  // ✅ OPTIMIZED: Enhanced payment handling with retry logic
  const handlePayment = useCallback(async () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setIsProcessing(true);

    try {
      // Simulate payment processing with retry logic
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // Simulate payment processing (reduced from 3s to 1s for better UX)
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Simulate success/failure with better success rate
          const isSuccess = Math.random() > 0.05; // 95% success rate

          if (isSuccess) {
            const paymentId = `pi_${Math.random().toString(36).substring(2, 15)}`;
            onPaymentSuccess(paymentId);
            return; // Success, exit retry loop
          } else {
            throw new Error('Payment failed. Please try again.');
          }
        } catch (error: any) {
          lastError = error;
          
          // If this is not the last attempt, wait before retrying
          if (attempt < maxRetries) {
            const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      }

      // All retries failed
      throw lastError || new Error('Payment failed after multiple attempts');
    } catch (error: any) {
      onPaymentFailure(error.message);
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPaymentMethod, onPaymentSuccess, onPaymentFailure]);

  // ✅ OPTIMIZED: Memoized payment method icon getter
  const getPaymentMethodIcon = useCallback((method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return method.brand === 'visa' ? 'card-outline' : 'card-outline';
      case 'apple_pay':
        return 'logo-apple';
      case 'google_pay':
        return 'logo-google';
      default:
        return 'card-outline';
    }
  }, []);

  // ✅ OPTIMIZED: Memoized payment method label getter
  const getPaymentMethodLabel = useCallback((method: PaymentMethod) => {
    switch (method.type) {
      case 'card':
        return `${method.brand?.toUpperCase()} •••• ${method.last4}`;
      case 'apple_pay':
        return 'Apple Pay';
      case 'google_pay':
        return 'Google Pay';
      default:
        return 'Payment Method';
    }
  }, []);

  const addPaymentMethod = useCallback(() => {
    Alert.alert('Coming Soon', 'Add payment method functionality will be available soon');
  }, []);

  // ✅ OPTIMIZED: Memoized ticket details
  const ticketDetails = useMemo(() => ({
    formattedDate: formatDate(ticket.eventDate),
    formattedTime: formatTime(ticket.eventTime),
    formattedPrice: formatCurrency(ticket.price),
    formattedSubtotal: formatCurrency(totals.subtotal),
    formattedServiceFee: formatCurrency(totals.serviceFee),
    formattedTax: formatCurrency(totals.tax),
    formattedTotal: formatCurrency(totals.total),
  }), [ticket, totals, formatDate, formatTime, formatCurrency]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Ticket Details */}
        <View style={[styles.section, { borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Ticket Details</Text>
          
          <View style={styles.ticketCard}>
            <View style={styles.ticketHeader}>
              <Text style={[styles.eventName, { color: theme.colors.text }]}>
                {ticket.eventName}
              </Text>
              <Text style={[styles.ticketName, { color: theme.colors.textSecondary }]}>
                {ticket.name}
              </Text>
            </View>

            <View style={styles.ticketInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {ticketDetails.formattedDate} • {ticketDetails.formattedTime}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="location-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {ticket.venue}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Ionicons name="card-outline" size={16} color={theme.colors.textSecondary} />
                <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
                  {ticket.quantity} {ticket.quantity === 1 ? 'ticket' : 'tickets'}
                </Text>
              </View>
            </View>

            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: theme.colors.text }]}>Price per ticket:</Text>
              <Text style={[styles.priceValue, { color: theme.colors.text }]}>
                {ticketDetails.formattedPrice}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Methods */}
        <View style={[styles.section, { borderColor: theme.colors.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Payment Method</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={addPaymentMethod}
              activeOpacity={0.7}
            >
              <Ionicons name="add" size={20} color={theme.colors.primary} />
              <Text style={[styles.addButtonText, { color: theme.colors.primary }]}>Add</Text>
            </TouchableOpacity>
          </View>

          {paymentMethods.map((method) => (
            <TouchableOpacity
              key={method.id}
              style={[
                styles.paymentMethod,
                { borderColor: theme.colors.border },
                selectedPaymentMethod === method.id && { borderColor: theme.colors.primary }
              ]}
              onPress={() => setSelectedPaymentMethod(method.id)}
              activeOpacity={0.7}
            >
              <View style={styles.paymentMethodLeft}>
                <View style={[
                  styles.paymentIcon,
                  { backgroundColor: selectedPaymentMethod === method.id ? theme.colors.primary + '20' : theme.colors.border }
                ]}>
                  <Ionicons
                    name={getPaymentMethodIcon(method) as any}
                    size={20}
                    color={selectedPaymentMethod === method.id ? theme.colors.primary : theme.colors.textSecondary}
                  />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={[
                    styles.paymentLabel,
                    { color: selectedPaymentMethod === method.id ? theme.colors.primary : theme.colors.text }
                  ]}>
                    {getPaymentMethodLabel(method)}
                  </Text>
                  {method.isDefault && (
                    <Text style={[styles.defaultLabel, { color: theme.colors.textSecondary }]}>
                      Default
                    </Text>
                  )}
                </View>
              </View>
              
              {selectedPaymentMethod === method.id && (
                <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Order Summary */}
        <View style={[styles.section, { borderColor: theme.colors.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Order Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Subtotal</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {ticketDetails.formattedSubtotal}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Service Fee</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {ticketDetails.formattedServiceFee}
            </Text>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>Tax</Text>
            <Text style={[styles.summaryValue, { color: theme.colors.text }]}>
              {ticketDetails.formattedTax}
            </Text>
          </View>
          
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, { color: theme.colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: theme.colors.primary }]}>
              {ticketDetails.formattedTotal}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.payButton,
            { backgroundColor: theme.colors.primary },
            isProcessing && styles.payButtonDisabled
          ]}
          onPress={handlePayment}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          {isProcessing ? (
            <ActivityIndicator color={theme.colors.white} size="small" />
          ) : (
            <Ionicons name="card-outline" size={20} color={theme.colors.white} />
          )}
          <Text style={styles.payButtonText}>
            {isProcessing ? 'Processing...' : `Pay ${ticketDetails.formattedTotal}`}
          </Text>
        </TouchableOpacity>
        
        <Text style={[styles.securityText, { color: theme.colors.textSecondary }]}>
          🔒 Your payment information is secure
        </Text>
      </View>
    </SafeAreaView>
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
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ticketCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 15,
  },
  ticketHeader: {
    marginBottom: 12,
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  ticketName: {
    fontSize: 14,
  },
  ticketInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  paymentMethod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 10,
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  defaultLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 14,
  },
  summaryValue: {
    fontSize: 14,
  },
  totalRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  payButtonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  securityText: {
    fontSize: 12,
    textAlign: 'center',
  },
});

export default PaymentScreen;


