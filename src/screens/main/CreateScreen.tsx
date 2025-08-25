import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/store';
import { theme } from '@/constants/theme';
import { useProtectedAction } from '@/hooks/useProtectedAction';

const { width } = Dimensions.get('window');

interface CreateOption {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  description: string;
  onPress: () => void;
}

const CreateScreen: React.FC = () => {
  const navigation = useNavigation();
  const { requireAuth } = useProtectedAction();
  const { user } = useSelector((state: RootState) => state.auth);
  
  const [showModal, setShowModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<CreateOption | null>(null);

  const createOptions: CreateOption[] = [
    {
      id: 'post',
      title: 'Create Post',
      subtitle: 'Share photos, videos, and stories',
      icon: 'add-circle',
      color: theme.colors.primary,
      description: 'Share your event experiences, photos, and videos with the community.',
      onPress: () => handleCreatePost(),
    },
    {
      id: 'event',
      title: 'Create Event',
      subtitle: 'Organize and host events',
      icon: 'calendar',
      color: '#FF6B6B',
      description: 'Create and manage your own events, set up ticketing, and track attendance.',
      onPress: () => handleCreateEvent(),
    },
    {
      id: 'story',
      title: 'Story Mode',
      subtitle: 'Quick 24-hour content',
      icon: 'camera',
      color: '#4ECDC4',
      description: 'Share quick moments that disappear after 24 hours.',
      onPress: () => handleCreateStory(),
    },
    {
      id: 'live',
      title: 'Go Live',
      subtitle: 'Stream live content',
      icon: 'radio',
      color: '#FFE66D',
      description: 'Start a live stream to share real-time content with your audience.',
      onPress: () => handleGoLive(),
    },
    {
      id: 'poll',
      title: 'Create Poll',
      subtitle: 'Get community feedback',
      icon: 'bar-chart',
      color: '#95E1D3',
      description: 'Create polls and surveys to get feedback from your community.',
      onPress: () => handleCreatePoll(),
    },
    {
      id: 'ticket',
      title: 'Sell Tickets',
      subtitle: 'Create ticket tiers',
      icon: 'ticket',
      color: '#F8BBD9',
      description: 'Set up different ticket types and pricing for your events.',
      onPress: () => handleSellTickets(),
    },
  ];

  const handleCreatePost = () => {
    requireAuth(() => {
      navigation.navigate('CreatePost' as never);
    }, 'Sign in to create posts');
  };

  const handleCreateEvent = () => {
    requireAuth(() => {
      navigation.navigate('EventEditor' as never);
    }, 'Sign in to create events');
  };

  const handleCreateStory = () => {
    requireAuth(() => {
      Alert.alert('Coming Soon', 'Story mode will be available in the next update!');
    }, 'Sign in to create stories');
  };

  const handleGoLive = () => {
    requireAuth(() => {
      Alert.alert('Coming Soon', 'Live streaming will be available in the next update!');
    }, 'Sign in to go live');
  };

  const handleCreatePoll = () => {
    requireAuth(() => {
      Alert.alert('Coming Soon', 'Poll creation will be available in the next update!');
    }, 'Sign in to create polls');
  };

  const handleSellTickets = () => {
    requireAuth(() => {
      navigation.navigate('TicketTierEditor' as never);
    }, 'Sign in to sell tickets');
  };

  const handleOptionPress = (option: CreateOption) => {
    setSelectedOption(option);
    setShowModal(true);
  };

  const handleConfirmCreate = () => {
    if (selectedOption) {
      setShowModal(false);
      selectedOption.onPress();
    }
  };

  const renderCreateOption = (option: CreateOption) => (
    <TouchableOpacity
      key={option.id}
      style={styles.optionCard}
      onPress={() => handleOptionPress(option)}
    >
      <View style={[styles.optionIcon, { backgroundColor: option.color }]}>
        <Ionicons name={option.icon as any} size={32} color="white" />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{option.title}</Text>
        <Text style={styles.optionSubtitle}>{option.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create</Text>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="close" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>

      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>What would you like to create?</Text>
        <Text style={styles.welcomeSubtitle}>
          Choose from the options below to get started
        </Text>
      </View>

      {/* Create Options */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.optionsContainer}>
          {createOptions.map(renderCreateOption)}
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Camera' as never)}
            >
              <Ionicons name="camera" size={24} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Camera</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Gallery' as never)}
            >
              <Ionicons name="images" size={24} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Gallery</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Drafts' as never)}
            >
              <Ionicons name="document-text" size={24} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Drafts</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.quickAction}
              onPress={() => navigation.navigate('Templates' as never)}
            >
              <Ionicons name="copy" size={24} color={theme.colors.primary} />
              <Text style={styles.quickActionText}>Templates</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentSection}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.recentItem}>
            <Ionicons name="time" size={20} color={theme.colors.textSecondary} />
            <Text style={styles.recentText}>No recent activity</Text>
          </View>
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedOption && (
              <>
                <View style={[styles.modalIcon, { backgroundColor: selectedOption.color }]}>
                  <Ionicons name={selectedOption.icon as any} size={32} color="white" />
                </View>
                
                <Text style={styles.modalTitle}>{selectedOption.title}</Text>
                <Text style={styles.modalDescription}>{selectedOption.description}</Text>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalButton}
                    onPress={() => setShowModal(false)}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={handleConfirmCreate}
                  >
                    <Text style={[styles.modalButtonText, styles.modalButtonTextPrimary]}>
                      Continue
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
  closeButton: {
    padding: 8,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  content: {
    flex: 1,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  optionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  optionSubtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  quickActionsSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (width - 64) / 4,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: theme.colors.text,
    marginTop: 8,
  },
  recentSection: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
  },
  recentText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 24,
    marginHorizontal: 20,
    alignItems: 'center',
    maxWidth: 320,
  },
  modalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDescription: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  modalButtonPrimary: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  modalButtonTextPrimary: {
    color: 'white',
  },
});

export default CreateScreen;
