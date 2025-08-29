import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EventDetails {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  image: string;
  category: string;
  price: string;
  attendees: number;
  maxAttendees: number;
  isAttending: boolean;
  isSaved: boolean;
  isLiked: boolean;
  likes: number;
  shares: number;
  organizer: {
    name: string;
    avatar: string;
    isVerified: boolean;
    followers: number;
  };
  tags: string[];
  requirements: string[];
  highlights: string[];
}

interface Comment {
  id: string;
  user: {
    name: string;
    avatar: string;
    isVerified: boolean;
  };
  text: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
}

interface Attendee {
  id: string;
  name: string;
  avatar: string;
  isVerified: boolean;
  isOrganizer: boolean;
}

const { width } = Dimensions.get('window');

const EventDetailsScreen: React.FC = () => {
  const [eventDetails, setEventDetails] = useState<EventDetails>({
    id: '1',
    title: 'Summer Music Festival 2024',
    description: 'The biggest music festival of the summer featuring top artists from around the world. Experience incredible performances, amazing food, and unforgettable memories with thousands of music lovers. This year we\'re bringing you the most diverse lineup yet, with genres spanning from rock and pop to electronic and hip-hop.',
    date: 'July 15, 2024',
    time: '2:00 PM - 11:00 PM',
    location: 'Central Park, New York City',
    image: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=800',
    category: 'Music Festival',
    price: '$75',
    attendees: 1250,
    maxAttendees: 2000,
    isAttending: true,
    isSaved: true,
    isLiked: false,
    likes: 342,
    shares: 89,
    organizer: {
      name: 'Music Events Co.',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
      isVerified: true,
      followers: 15420,
    },
    tags: ['Music', 'Festival', 'Live Performance', 'Food', 'Art'],
    requirements: ['Valid ID required', 'No outside food or drinks', 'Comfortable walking shoes recommended'],
    highlights: ['Multiple stages', 'Food trucks', 'Art installations', 'VIP areas', 'Meet & greet opportunities'],
  });

  const [activeTab, setActiveTab] = useState<'details' | 'attendees' | 'comments'>('details');
  const [commentText, setCommentText] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  const mockComments: Comment[] = [
    {
      id: '1',
      user: {
        name: 'Emma Davis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
        isVerified: true,
      },
      text: 'Can\'t wait for this! The lineup looks incredible! 🎵',
      timestamp: '2h ago',
      likes: 12,
      isLiked: false,
    },
    {
      id: '2',
      user: {
        name: 'Mike Wilson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        isVerified: false,
      },
      text: 'Already got my tickets! This is going to be epic!',
      timestamp: '4h ago',
      likes: 8,
      isLiked: true,
    },
    {
      id: '3',
      user: {
        name: 'Sarah Johnson',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
        isVerified: true,
      },
      text: 'Anyone know if there will be food options for vegetarians?',
      timestamp: '6h ago',
      likes: 5,
      isLiked: false,
    },
  ];

  const mockAttendees: Attendee[] = [
    {
      id: '1',
      name: 'Emma Davis',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
      isVerified: true,
      isOrganizer: false,
    },
    {
      id: '2',
      name: 'Mike Wilson',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
      isVerified: false,
      isOrganizer: false,
    },
    {
      id: '3',
      name: 'Sarah Johnson',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
      isVerified: true,
      isOrganizer: false,
    },
    {
      id: '4',
      name: 'Alex Chen',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
      isVerified: false,
      isOrganizer: false,
    },
  ];

  const handleAttendToggle = () => {
    Alert.alert(
      'Event Attendance',
      eventDetails.isAttending 
        ? 'Are you sure you want to cancel your attendance?' 
        : 'Would you like to attend this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: eventDetails.isAttending ? 'Cancel Attendance' : 'Attend',
          onPress: () => {
            setEventDetails(prev => ({ 
              ...prev, 
              isAttending: !prev.isAttending,
              attendees: prev.isAttending ? prev.attendees - 1 : prev.attendees + 1
            }));
          }
        },
      ]
    );
  };

  const handleSaveToggle = () => {
    setEventDetails(prev => ({ ...prev, isSaved: !prev.isSaved }));
  };

  const handleLikeToggle = () => {
    setEventDetails(prev => ({ 
      ...prev, 
      isLiked: !prev.isLiked,
      likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1
    }));
  };

  const handleShare = () => {
    setShowShareModal(true);
  };

  const handleSendComment = () => {
    if (commentText.trim()) {
      console.log('Sending comment:', commentText);
      setCommentText('');
    }
  };

  const handleCommentLike = (commentId: string) => {
    console.log('Liking comment:', commentId);
  };

  const renderEventHeader = () => (
    <View style={styles.eventHeader}>
      <Image source={{ uri: eventDetails.image }} style={styles.eventImage} />
      
      <View style={styles.eventOverlay}>
        <View style={styles.eventInfo}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{eventDetails.category}</Text>
          </View>
          
          <Text style={styles.eventTitle}>{eventDetails.title}</Text>
          
          <View style={styles.eventStats}>
            <View style={styles.stat}>
              <Ionicons name="people" size={16} color="#00ff88" />
              <Text style={styles.statText}>{eventDetails.attendees} attending</Text>
            </View>
            
            <View style={styles.stat}>
              <Ionicons name="heart" size={16} color="#ff4444" />
              <Text style={styles.statText}>{eventDetails.likes} likes</Text>
            </View>
            
            <View style={styles.stat}>
              <Ionicons name="share" size={16} color="#00ff88" />
              <Text style={styles.statText}>{eventDetails.shares} shares</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );

  const renderOrganizerInfo = () => (
    <View style={styles.organizerSection}>
      <View style={styles.organizerHeader}>
        <Text style={styles.sectionTitle}>Organized by</Text>
        <TouchableOpacity style={styles.followButton}>
          <Text style={styles.followButtonText}>Follow</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.organizerInfo}>
        <Image source={{ uri: eventDetails.organizer.avatar }} style={styles.organizerAvatar} />
        <View style={styles.organizerDetails}>
          <View style={styles.organizerNameRow}>
            <Text style={styles.organizerName}>{eventDetails.organizer.name}</Text>
            {eventDetails.organizer.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
            )}
          </View>
          <Text style={styles.organizerFollowers}>
            {eventDetails.organizer.followers.toLocaleString()} followers
          </Text>
        </View>
      </View>
    </View>
  );

  const renderEventDetails = () => (
    <View style={styles.detailsSection}>
      <Text style={styles.sectionTitle}>Event Details</Text>
      
      <View style={styles.detailItem}>
        <Ionicons name="calendar" size={20} color="#00ff88" />
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Date & Time</Text>
          <Text style={styles.detailValue}>{eventDetails.date} • {eventDetails.time}</Text>
        </View>
      </View>
      
      <View style={styles.detailItem}>
        <Ionicons name="location" size={20} color="#00ff88" />
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Location</Text>
          <Text style={styles.detailValue}>{eventDetails.location}</Text>
        </View>
      </View>
      
      <View style={styles.detailItem}>
        <Ionicons name="card" size={20} color="#00ff88" />
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Price</Text>
          <Text style={styles.detailValue}>{eventDetails.price}</Text>
        </View>
      </View>
      
      <View style={styles.detailItem}>
        <Ionicons name="people" size={20} color="#00ff88" />
        <View style={styles.detailContent}>
          <Text style={styles.detailLabel}>Capacity</Text>
          <Text style={styles.detailValue}>
            {eventDetails.attendees}/{eventDetails.maxAttendees} spots filled
          </Text>
        </View>
      </View>
      
      <Text style={styles.description}>{eventDetails.description}</Text>
      
      {/* Tags */}
      <View style={styles.tagsSection}>
        <Text style={styles.sectionSubtitle}>Tags</Text>
        <View style={styles.tagsContainer}>
          {eventDetails.tags.map(tag => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Highlights */}
      <View style={styles.highlightsSection}>
        <Text style={styles.sectionSubtitle}>Highlights</Text>
        {eventDetails.highlights.map(highlight => (
          <View key={highlight} style={styles.highlightItem}>
            <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
            <Text style={styles.highlightText}>{highlight}</Text>
          </View>
        ))}
      </View>
      
      {/* Requirements */}
      <View style={styles.requirementsSection}>
        <Text style={styles.sectionSubtitle}>Requirements</Text>
        {eventDetails.requirements.map(requirement => (
          <View key={requirement} style={styles.requirementItem}>
            <Ionicons name="information-circle" size={16} color="#ffaa00" />
            <Text style={styles.requirementText}>{requirement}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderAttendees = () => (
    <View style={styles.attendeesSection}>
      <View style={styles.attendeesHeader}>
        <Text style={styles.sectionTitle}>Attendees</Text>
        <Text style={styles.attendeesCount}>
          {eventDetails.attendees} of {eventDetails.maxAttendees}
        </Text>
      </View>
      
      <FlatList
        data={mockAttendees}
        renderItem={({ item }) => (
          <View style={styles.attendeeItem}>
            <Image source={{ uri: item.avatar }} style={styles.attendeeAvatar} />
            <View style={styles.attendeeInfo}>
              <View style={styles.attendeeNameRow}>
                <Text style={styles.attendeeName}>{item.name}</Text>
                {item.isVerified && (
                  <Ionicons name="checkmark-circle" size={14} color="#00ff88" />
                )}
                {item.isOrganizer && (
                  <View style={styles.organizerBadge}>
                    <Text style={styles.organizerBadgeText}>Organizer</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity style={styles.messageButton}>
              <Ionicons name="chatbubble-outline" size={20} color="#00ff88" />
            </TouchableOpacity>
          </View>
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  const renderComments = () => (
    <View style={styles.commentsSection}>
      <Text style={styles.sectionTitle}>Comments</Text>
      
      <FlatList
        data={mockComments}
        renderItem={({ item }) => (
          <View style={styles.commentItem}>
            <Image source={{ uri: item.user.avatar }} style={styles.commentAvatar} />
            <View style={styles.commentContent}>
              <View style={styles.commentHeader}>
                <View style={styles.commentUserInfo}>
                  <Text style={styles.commentUserName}>{item.user.name}</Text>
                  {item.user.isVerified && (
                    <Ionicons name="checkmark-circle" size={12} color="#00ff88" />
                  )}
                </View>
                <Text style={styles.commentTime}>{item.timestamp}</Text>
              </View>
              <Text style={styles.commentText}>{item.text}</Text>
              <View style={styles.commentActions}>
                <TouchableOpacity 
                  style={styles.commentAction}
                  onPress={() => handleCommentLike(item.id)}
                >
                  <Ionicons 
                    name={item.isLiked ? "heart" : "heart-outline"} 
                    size={16} 
                    color={item.isLiked ? "#ff4444" : "#a3a3a3"} 
                  />
                  <Text style={styles.commentActionText}>{item.likes}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.commentAction}>
                  <Ionicons name="chatbubble-outline" size={16} color="#a3a3a3" />
                  <Text style={styles.commentActionText}>Reply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
      />
      
      {/* Comment Input */}
      <View style={styles.commentInputContainer}>
        <TextInput
          style={styles.commentInput}
          placeholder="Add a comment..."
          placeholderTextColor="#a3a3a3"
          value={commentText}
          onChangeText={setCommentText}
          multiline
        />
        <TouchableOpacity 
          style={[styles.sendButton, commentText.trim() && styles.sendButtonActive]}
          onPress={handleSendComment}
          disabled={!commentText.trim()}
        >
          <Ionicons 
            name="send" 
            size={20} 
            color={commentText.trim() ? "#1a1a1a" : "#a3a3a3"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleSaveToggle}>
            <Ionicons 
              name={eventDetails.isSaved ? "bookmark" : "bookmark-outline"} 
              size={24} 
              color={eventDetails.isSaved ? "#00ff88" : "white"} 
            />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderEventHeader()}
        {renderOrganizerInfo()}

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'details' && styles.tabActive]}
            onPress={() => setActiveTab('details')}
          >
            <Text style={[styles.tabText, activeTab === 'details' && styles.tabTextActive]}>
              Details
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'attendees' && styles.tabActive]}
            onPress={() => setActiveTab('attendees')}
          >
            <Text style={[styles.tabText, activeTab === 'attendees' && styles.tabTextActive]}>
              Attendees
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'comments' && styles.tabActive]}
            onPress={() => setActiveTab('comments')}
          >
            <Text style={[styles.tabText, activeTab === 'comments' && styles.tabTextActive]}>
              Comments
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'details' && renderEventDetails()}
        {activeTab === 'attendees' && renderAttendees()}
        {activeTab === 'comments' && renderComments()}
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLikeToggle}>
          <Ionicons 
            name={eventDetails.isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={eventDetails.isLiked ? "#ff4444" : "white"} 
          />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.attendButton, eventDetails.isAttending && styles.attendButtonActive]}
          onPress={handleAttendToggle}
        >
          <Text style={[styles.attendButtonText, eventDetails.isAttending && styles.attendButtonTextActive]}>
            {eventDetails.isAttending ? 'Attending' : 'Attend Event'}
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  content: {
    flex: 1,
  },
  eventHeader: {
    position: 'relative',
  },
  eventImage: {
    width: width,
    height: 300,
  },
  eventOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
    padding: 20,
  },
  eventInfo: {
    marginTop: 60,
  },
  categoryBadge: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  eventTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 12,
  },
  eventStats: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 14,
    color: 'white',
  },
  organizerSection: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  organizerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  followButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  organizerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  organizerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  organizerDetails: {
    flex: 1,
  },
  organizerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  organizerName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  organizerFollowers: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 20,
    marginHorizontal: 4,
  },
  tabActive: {
    backgroundColor: '#00ff88',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  tabTextActive: {
    color: '#1a1a1a',
  },
  detailsSection: {
    padding: 20,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailContent: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  description: {
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  tagsSection: {
    marginBottom: 24,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#262626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 14,
    color: '#00ff88',
  },
  highlightsSection: {
    marginBottom: 24,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  highlightText: {
    fontSize: 14,
    color: 'white',
    marginLeft: 8,
  },
  requirementsSection: {
    marginBottom: 24,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: '#ffaa00',
    marginLeft: 8,
  },
  attendeesSection: {
    padding: 20,
  },
  attendeesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  attendeesCount: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  attendeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  attendeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  attendeeInfo: {
    flex: 1,
  },
  attendeeNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  attendeeName: {
    fontSize: 16,
    fontWeight: '500',
    color: 'white',
  },
  organizerBadge: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4,
  },
  organizerBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  messageButton: {
    padding: 8,
  },
  commentsSection: {
    padding: 20,
    paddingBottom: 100,
  },
  commentItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  commentUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentUserName: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  commentTime: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  commentText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    gap: 16,
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#262626',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 16,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: 'white',
    maxHeight: 80,
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
  sendButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#00ff88',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    backgroundColor: '#1a1a1a',
  },
  actionButton: {
    padding: 12,
    marginRight: 12,
  },
  attendButton: {
    flex: 1,
    backgroundColor: '#333333',
    paddingVertical: 12,
    borderRadius: 24,
    alignItems: 'center',
  },
  attendButtonActive: {
    backgroundColor: '#00ff88',
  },
  attendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  attendButtonTextActive: {
    color: '#1a1a1a',
  },
});

export default EventDetailsScreen;
