import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGuestList, useGuests, useInvitations, useGuestListStats } from '../../hooks/useGuestList';
import { Guest, GuestStatus, GuestCategory } from '@yardpass/types';
import { theme } from '../../constants/theme';

interface GuestListManagerProps {
  guestListId: string;
  onGuestPress?: (guest: Guest) => void;
  onAddGuests?: () => void;
  onSendInvitations?: () => void;
  onExport?: () => void;
}

const GuestListManager: React.FC<GuestListManagerProps> = ({
  guestListId,
  onGuestPress,
  onAddGuests,
  onSendInvitations,
  onExport,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<GuestStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<GuestCategory | 'all'>('all');

  // Hooks
  const { guestList, isLoading: listLoading, error: listError, refresh: refreshList } = useGuestList(guestListId);
  const { 
    guests, 
    isLoading: guestsLoading, 
    error: guestsError, 
    hasMore, 
    loadMore,
    updateGuest,
    removeGuest,
    refresh: refreshGuests 
  } = useGuests(guestListId, {
    status: selectedFilter === 'all' ? undefined : [selectedFilter],
    category: selectedCategory === 'all' ? undefined : selectedCategory,
  });
  const { sendInvitations, isLoading: sendingInvitations } = useInvitations(guestListId);
  const { stats, isLoading: statsLoading } = useGuestListStats(guestListId);

  // Filter guests based on selected filters
  const filteredGuests = guests.filter(guest => {
    if (selectedFilter !== 'all' && guest.status !== selectedFilter) return false;
    if (selectedCategory !== 'all' && guest.metadata?.category !== selectedCategory) return false;
    return true;
  });

  // Handle guest status update
  const handleStatusUpdate = useCallback(async (guestId: string, newStatus: GuestStatus) => {
    try {
      const response = await updateGuest(guestId, { status: newStatus });
      if (response.success) {
        Alert.alert('Success', 'Guest status updated successfully');
      } else {
        Alert.alert('Error', response.error || 'Failed to update guest status');
      }
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
    }
  }, [updateGuest]);

  // Handle guest removal
  const handleRemoveGuest = useCallback(async (guestId: string, guestName: string) => {
    Alert.alert(
      'Remove Guest',
      `Are you sure you want to remove ${guestName} from the guest list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await removeGuest(guestId);
              if (response.success) {
                Alert.alert('Success', 'Guest removed successfully');
              } else {
                Alert.alert('Error', response.error || 'Failed to remove guest');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            }
          },
        },
      ]
    );
  }, [removeGuest]);

  // Handle bulk invitation sending
  const handleSendInvitations = useCallback(async () => {
    const pendingGuests = guests.filter(g => g.status === 'invited');
    
    if (pendingGuests.length === 0) {
      Alert.alert('No Pending Invitations', 'All guests have already been invited or have responded.');
      return;
    }

    Alert.alert(
      'Send Invitations',
      `Send invitations to ${pendingGuests.length} pending guests?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          onPress: async () => {
            try {
              const response = await sendInvitations({
                guest_ids: pendingGuests.map(g => g.id),
                settings: {
                  delivery_method: 'email',
                  expires_in_days: 30,
                  custom_message: `You're invited to ${guestList?.event?.title || 'our event'}!`,
                  send_reminders: true,
                }
              });
              
              if (response.success) {
                Alert.alert('Success', `${response.message || 'Invitations sent successfully'}`);
              } else {
                Alert.alert('Error', response.error || 'Failed to send invitations');
              }
            } catch (error) {
              Alert.alert('Error', 'An unexpected error occurred');
            }
          },
        },
      ]
    );
  }, [guests, sendInvitations, guestList]);

  // Loading states
  if (listLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading guest list...</Text>
      </View>
    );
  }

  if (listError) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>Failed to load guest list</Text>
        <Text style={styles.errorSubtext}>{listError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshList}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!guestList) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Guest list not found</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{guestList.name}</Text>
          <Text style={styles.subtitle}>
            {guestList.event?.title} • {guestList.max_guests ? `${guests.length}/${guestList.max_guests} guests` : `${guests.length} guests`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.actionButton} onPress={onAddGuests}>
            <Ionicons name="person-add" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onSendInvitations}>
            <Ionicons name="mail" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={onExport}>
            <Ionicons name="download" size={20} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Statistics */}
      {stats && (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{stats.total_guests}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.success }]}>
              {stats.confirmed_guests}
            </Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.warning }]}>
              {stats.pending_guests}
            </Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.error }]}>
              {stats.declined_guests}
            </Text>
            <Text style={styles.statLabel}>Declined</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'all' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('all')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'all' && styles.filterChipTextActive]}>
              All ({guests.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'invited' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('invited')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'invited' && styles.filterChipTextActive]}>
              Invited ({guests.filter(g => g.status === 'invited').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'confirmed' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('confirmed')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'confirmed' && styles.filterChipTextActive]}>
              Confirmed ({guests.filter(g => g.status === 'confirmed').length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, selectedFilter === 'declined' && styles.filterChipActive]}
            onPress={() => setSelectedFilter('declined')}
          >
            <Text style={[styles.filterChipText, selectedFilter === 'declined' && styles.filterChipTextActive]}>
              Declined ({guests.filter(g => g.status === 'declined').length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Guest List */}
      <ScrollView
        style={styles.guestList}
        refreshControl={
          <RefreshControl refreshing={guestsLoading} onRefresh={refreshGuests} />
        }
        onScroll={({ nativeEvent }) => {
          const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
          const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
          if (isCloseToBottom && hasMore && !guestsLoading) {
            loadMore();
          }
        }}
        scrollEventThrottle={400}
      >
        {filteredGuests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people" size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No guests found</Text>
            <Text style={styles.emptySubtext}>
              {selectedFilter !== 'all' || selectedCategory !== 'all' 
                ? 'Try adjusting your filters' 
                : 'Add some guests to get started'
              }
            </Text>
          </View>
        ) : (
          filteredGuests.map((guest) => (
            <GuestListItem
              key={guest.id}
              guest={guest}
              onPress={() => onGuestPress?.(guest)}
              onStatusUpdate={handleStatusUpdate}
              onRemove={handleRemoveGuest}
            />
          ))
        )}

        {guestsLoading && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingMoreText}>Loading more guests...</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickActionButton, sendingInvitations && styles.quickActionButtonDisabled]}
          onPress={handleSendInvitations}
          disabled={sendingInvitations}
        >
          <Ionicons 
            name={sendingInvitations ? "hourglass" : "mail"} 
            size={20} 
            color={sendingInvitations ? theme.colors.textSecondary : theme.colors.primary} 
          />
          <Text style={[styles.quickActionText, sendingInvitations && styles.quickActionTextDisabled]}>
            {sendingInvitations ? 'Sending...' : 'Send Invitations'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Guest List Item Component
interface GuestListItemProps {
  guest: Guest;
  onPress?: () => void;
  onStatusUpdate: (guestId: string, status: GuestStatus) => void;
  onRemove: (guestId: string, guestName: string) => void;
}

const GuestListItem: React.FC<GuestListItemProps> = ({
  guest,
  onPress,
  onStatusUpdate,
  onRemove,
}) => {
  const getStatusColor = (status: GuestStatus) => {
    switch (status) {
      case 'confirmed': return theme.colors.success;
      case 'declined': return theme.colors.error;
      case 'maybe': return theme.colors.warning;
      case 'attended': return theme.colors.primary;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: GuestStatus) => {
    switch (status) {
      case 'confirmed': return 'checkmark-circle';
      case 'declined': return 'close-circle';
      case 'maybe': return 'help-circle';
      case 'attended': return 'checkmark-done-circle';
      default: return 'time';
    }
  };

  return (
    <TouchableOpacity style={styles.guestItem} onPress={onPress}>
      <View style={styles.guestInfo}>
        <View style={styles.guestHeader}>
          <Text style={styles.guestName}>{guest.name}</Text>
          <View style={styles.guestStatus}>
            <Ionicons 
              name={getStatusIcon(guest.status)} 
              size={16} 
              color={getStatusColor(guest.status)} 
            />
            <Text style={[styles.guestStatusText, { color: getStatusColor(guest.status) }]}>
              {guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}
            </Text>
          </View>
        </View>
        
        {guest.email && (
          <Text style={styles.guestEmail}>{guest.email}</Text>
        )}
        
        {guest.phone && (
          <Text style={styles.guestPhone}>{guest.phone}</Text>
        )}
        
        {guest.notes && (
          <Text style={styles.guestNotes} numberOfLines={2}>
            {guest.notes}
          </Text>
        )}

        {guest.metadata?.category && (
          <View style={styles.guestCategory}>
            <Text style={styles.guestCategoryText}>{guest.metadata.category}</Text>
          </View>
        )}
      </View>

      <View style={styles.guestActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onStatusUpdate(guest.id, 'confirmed')}
        >
          <Ionicons name="checkmark" size={16} color={theme.colors.success} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onStatusUpdate(guest.id, 'maybe')}
        >
          <Ionicons name="help" size={16} color={theme.colors.warning} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onStatusUpdate(guest.id, 'declined')}
        >
          <Ionicons name="close" size={16} color={theme.colors.error} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onRemove(guest.id, guest.name)}
        >
          <Ionicons name="trash" size={16} color={theme.colors.error} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
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
    backgroundColor: theme.colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    padding: 20,
  },
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerInfo: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
  filtersContainer: {
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  filterChipTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  guestList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.text,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  guestItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  guestInfo: {
    flex: 1,
  },
  guestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  guestName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  guestStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  guestStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  guestEmail: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  guestPhone: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 4,
  },
  guestNotes: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  guestCategory: {
    marginTop: 8,
  },
  guestCategoryText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  guestActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickActions: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  quickActionButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    gap: 8,
  },
  quickActionButtonDisabled: {
    backgroundColor: theme.colors.border,
  },
  quickActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  quickActionTextDisabled: {
    color: theme.colors.textSecondary,
  },
});

export default GuestListManager;
