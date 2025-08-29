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

interface Post {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  content: string;
  images: string[];
  video?: {
    url: string;
    duration: number;
    thumbnail: string;
  };
  location?: string;
  timestamp: string;
  likes: number;
  comments: number;
  shares: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowing: boolean;
}

interface Comment {
  id: string;
  user: {
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
  text: string;
  timestamp: string;
  likes: number;
  isLiked: boolean;
  replies: Comment[];
}

const { width } = Dimensions.get('window');

const PostDetailsScreen: React.FC = () => {
  const [post, setPost] = useState<Post>({
    id: '1',
    user: {
      name: 'Sarah Dancer',
      username: 'sarahdancer',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
      isVerified: true,
    },
    content: 'Just finished an amazing dance performance at the city theater! The energy was incredible and the audience was so supportive. Thank you to everyone who came out to support local artists! 🎭✨ #DanceLife #Performance #LocalArtists',
    images: [
      'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800',
    ],
    location: 'City Theater, New York',
    timestamp: '2 hours ago',
    likes: 1247,
    comments: 89,
    shares: 23,
    isLiked: true,
    isSaved: false,
    isFollowing: true,
  });

  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  const mockComments: Comment[] = [
    {
      id: '1',
      user: {
        name: 'Emma Davis',
        username: 'emmadavis',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100',
        isVerified: true,
      },
      text: 'Amazing performance! You were absolutely incredible on stage! 👏',
      timestamp: '1h ago',
      likes: 12,
      isLiked: false,
      replies: [],
    },
    {
      id: '2',
      user: {
        name: 'Mike Wilson',
        username: 'mikewilson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
        isVerified: false,
      },
      text: 'Wish I could have been there! The photos look stunning!',
      timestamp: '45m ago',
      likes: 8,
      isLiked: true,
      replies: [
        {
          id: '2-1',
          user: {
            name: 'Sarah Dancer',
            username: 'sarahdancer',
            avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100',
            isVerified: true,
          },
          text: 'Thank you! Next time for sure! 💕',
          timestamp: '30m ago',
          likes: 5,
          isLiked: false,
          replies: [],
        },
      ],
    },
    {
      id: '3',
      user: {
        name: 'Alex Chen',
        username: 'alexchen',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100',
        isVerified: false,
      },
      text: 'Your passion for dance is so inspiring! Keep shining! ✨',
      timestamp: '30m ago',
      likes: 15,
      isLiked: false,
      replies: [],
    },
  ];

  const handleLikeToggle = () => {
    setPost(prev => ({
      ...prev,
      isLiked: !prev.isLiked,
      likes: prev.isLiked ? prev.likes - 1 : prev.likes + 1,
    }));
  };

  const handleSaveToggle = () => {
    setPost(prev => ({ ...prev, isSaved: !prev.isSaved }));
  };

  const handleFollowToggle = () => {
    Alert.alert(
      post.isFollowing ? 'Unfollow User' : 'Follow User',
      post.isFollowing 
        ? 'Are you sure you want to unfollow Sarah Dancer?' 
        : 'Would you like to follow Sarah Dancer?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: post.isFollowing ? 'Unfollow' : 'Follow',
          style: post.isFollowing ? 'destructive' : 'default',
          onPress: () => {
            setPost(prev => ({ ...prev, isFollowing: !prev.isFollowing }));
          }
        },
      ]
    );
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

  const renderPostHeader = () => (
    <View style={styles.postHeader}>
      <View style={styles.userInfo}>
        <Image source={{ uri: post.user.avatar }} style={styles.userAvatar} />
        <View style={styles.userDetails}>
          <View style={styles.userNameRow}>
            <Text style={styles.userName}>{post.user.name}</Text>
            {post.user.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
            )}
          </View>
          <Text style={styles.userUsername}>@{post.user.username}</Text>
          {post.location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={12} color="#a3a3a3" />
              <Text style={styles.locationText}>{post.location}</Text>
            </View>
          )}
        </View>
      </View>
      
      <View style={styles.headerActions}>
        <TouchableOpacity style={styles.followButton} onPress={handleFollowToggle}>
          <Text style={[styles.followButtonText, post.isFollowing && styles.followingButtonText]}>
            {post.isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreButton}>
          <Ionicons name="ellipsis-horizontal" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPostContent = () => (
    <View style={styles.postContent}>
      <Text style={styles.postText}>{post.content}</Text>
      
      {post.images.length > 0 && (
        <View style={styles.imageContainer}>
          {post.images.length === 1 ? (
            <Image source={{ uri: post.images[0] }} style={styles.singleImage} />
          ) : (
            <View style={styles.imageGrid}>
              {post.images.slice(0, 2).map((image, index) => (
                <Image 
                  key={index} 
                  source={{ uri: image }} 
                  style={[styles.gridImage, index === 1 && styles.secondImage]} 
                />
              ))}
              {post.images.length > 2 && (
                <View style={styles.imageOverlay}>
                  <Text style={styles.imageCount}>+{post.images.length - 2}</Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
      
      <Text style={styles.timestamp}>{post.timestamp}</Text>
    </View>
  );

  const renderPostActions = () => (
    <View style={styles.postActions}>
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLikeToggle}>
          <Ionicons 
            name={post.isLiked ? "heart" : "heart-outline"} 
            size={24} 
            color={post.isLiked ? "#ff4444" : "white"} 
          />
          <Text style={styles.actionText}>{post.likes}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => setShowComments(!showComments)}
        >
          <Ionicons name="chatbubble-outline" size={24} color="white" />
          <Text style={styles.actionText}>{post.comments}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="white" />
          <Text style={styles.actionText}>{post.shares}</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.saveButton} onPress={handleSaveToggle}>
        <Ionicons 
          name={post.isSaved ? "bookmark" : "bookmark-outline"} 
          size={24} 
          color={post.isSaved ? "#00ff88" : "white"} 
        />
      </TouchableOpacity>
    </View>
  );

  const renderComment = ({ item }: { item: Comment }) => (
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
              size={14} 
              color={item.isLiked ? "#ff4444" : "#a3a3a3"} 
            />
            <Text style={styles.commentActionText}>{item.likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.commentAction}>
            <Ionicons name="chatbubble-outline" size={14} color="#a3a3a3" />
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
        </View>
        
        {/* Replies */}
        {item.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {item.replies.map(reply => (
              <View key={reply.id} style={styles.replyItem}>
                <Image source={{ uri: reply.user.avatar }} style={styles.replyAvatar} />
                <View style={styles.replyContent}>
                  <View style={styles.replyHeader}>
                    <View style={styles.replyUserInfo}>
                      <Text style={styles.replyUserName}>{reply.user.name}</Text>
                      {reply.user.isVerified && (
                        <Ionicons name="checkmark-circle" size={10} color="#00ff88" />
                      )}
                    </View>
                    <Text style={styles.replyTime}>{reply.timestamp}</Text>
                  </View>
                  <Text style={styles.replyText}>{reply.text}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );

  const renderCommentInput = () => (
    <View style={styles.commentInputContainer}>
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=50' }} 
        style={styles.currentUserAvatar} 
      />
      <View style={styles.inputContainer}>
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
            size={18} 
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
        <Text style={styles.headerTitle}>Post</Text>
        <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Post Content */}
        <View style={styles.postContainer}>
          {renderPostHeader()}
          {renderPostContent()}
          {renderPostActions()}
        </View>

        {/* Comments Section */}
        {showComments && (
          <View style={styles.commentsSection}>
            <View style={styles.commentsHeader}>
              <Text style={styles.commentsTitle}>Comments ({post.comments})</Text>
              <TouchableOpacity>
                <Text style={styles.viewAllText}>View all</Text>
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={mockComments}
              renderItem={renderComment}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          </View>
        )}
      </ScrollView>

      {/* Comment Input */}
      {renderCommentInput()}
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
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  shareButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  postContainer: {
    paddingBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  userUsername: {
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  followingButtonText: {
    color: 'white',
  },
  moreButton: {
    padding: 4,
  },
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  postText: {
    fontSize: 16,
    color: 'white',
    lineHeight: 24,
    marginBottom: 12,
  },
  imageContainer: {
    marginBottom: 12,
  },
  singleImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  imageGrid: {
    flexDirection: 'row',
    gap: 4,
    position: 'relative',
  },
  gridImage: {
    flex: 1,
    height: 200,
    borderRadius: 12,
  },
  secondImage: {
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: '50%',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  timestamp: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  saveButton: {
    padding: 4,
  },
  commentsSection: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingTop: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  commentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  viewAllText: {
    fontSize: 14,
    color: '#00ff88',
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  repliesContainer: {
    marginTop: 12,
    marginLeft: 20,
  },
  replyItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  replyContent: {
    flex: 1,
  },
  replyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  replyUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  replyUserName: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
  },
  replyTime: {
    fontSize: 10,
    color: '#a3a3a3',
  },
  replyText: {
    fontSize: 12,
    color: 'white',
    lineHeight: 16,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    backgroundColor: '#1a1a1a',
  },
  currentUserAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#262626',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  commentInput: {
    flex: 1,
    fontSize: 14,
    color: 'white',
    maxHeight: 80,
    paddingHorizontal: 0,
    paddingVertical: 4,
  },
  sendButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#00ff88',
  },
});

export default PostDetailsScreen;
