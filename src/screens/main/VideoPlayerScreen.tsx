import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  Modal,
  ScrollView,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';

const { width, height } = Dimensions.get('window');

interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  timeAgo: string;
  likes: number;
  isLiked: boolean;
  isCreator?: boolean;
}

const mockComments: Comment[] = [
  {
    id: '1',
    username: 'john_doe',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAGOeAgW8ZoOGsDeC4w3Ew9gt8E92t_QgMQ6PnlRVG7OHHuJnC0SlVHN4x99PHeoJH84XZ7p-uFvLzLatiOle0IPA4uV-_Ukrj00EqTh4URcu8gcddsZx--QD2_omV6FJGZwzDuXWAcCCE0A6btR3QQ9DqafxDQYuF0RFbzTi6uw_9cQ9Q55Hhps1iHdy1rw-4stwpeDfEkDTrZMh6mDnZONs2jIc0eY7My7JZlgL-9TQJ2toZ-qI1xar5inT9SUsXR2QIRlbH4X_JN',
    text: 'This is amazing! Where was this shot?',
    timeAgo: '5h ago',
    likes: 12,
    isLiked: false,
  },
  {
    id: '2',
    username: 'sarah_dancer',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLdaCsNlxnJ522FOH-AI2NH7OnNZsbiSX-ET1sOx-YyhtUosZc1akJZnKJZUtCe4oQ8YvI7vdEOwjFZS57MriYCxf6SibOeABnAzgWbi2xilS0YRpHX_3zaKj4vPzA7U0OXU_eRwZVQYPyc_XSQL50MqPNPvOitd_2mItb6MkmP4JS9HAlPePhKuq-2Xi-SkJ6Wkn3xqpFnQ66zRMqRRUCzKklHq-MswQxJj_w-FXkQP6BpMRJMyzHoqaGVTJjF7Qw0o67yehq5o_G',
    text: 'Thank you! It\'s at the downtown square!',
    timeAgo: '5h ago',
    likes: 45,
    isLiked: true,
    isCreator: true,
  },
  {
    id: '3',
    username: 'jane_smith',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRgmH__pj8QgpWOy4Zy9fNHiRnhjfdf3Bo5n3qBQF6UfCNSkMAes5RAN89hw6HwX9RCVcRhD6gKegQGTfLbmsSLLi5uS6SI92I_61qHziKR1ZgN4cs0p_MbztgdeCGIVJCu64oTgknhuUv-_olvVwsfiHtHayZViIHHjW-Oy_SoU6BumOSXt_2Fris3cPTtmkLVOIY5dKRCc70Iratn4tv80Ua-W6v-0RB1GYpxmj98ZE3OQM_5DB8EvaF5BFWPbtB7VzmWKAuoMRS',
    text: 'Love the energy! The green accent from YardPass is a nice touch on your profile. 😉',
    timeAgo: '4h ago',
    likes: 8,
    isLiked: false,
  },
];

const VideoPlayerScreen: React.FC = () => {
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(mockComments);
  const videoRef = useRef<Video>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;

  const toggleComments = () => {
    if (showComments) {
      // Slide down
      Animated.timing(slideAnim, {
        toValue: height,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setShowComments(false));
    } else {
      setShowComments(true);
      // Slide up
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  };

  const toggleLike = () => {
    setIsLiked(!isLiked);
  };

  const toggleCommentLike = (commentId: string) => {
    setComments(prev => 
      prev.map(comment => 
        comment.id === commentId 
          ? { ...comment, isLiked: !comment.isLiked, likes: comment.isLiked ? comment.likes - 1 : comment.likes + 1 }
          : comment
      )
    );
  };

  const postComment = () => {
    if (commentText.trim()) {
      const newComment: Comment = {
        id: Date.now().toString(),
        username: 'current_user',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1mJjW8eviQ4VlqSn9PZ5hlBmVOFqizoprZZ2Q5KlunLgnHfQP3a2VL915jr5Yt_5Ci1wJWd9nM4w3PrkD6eoJykyr1sNu4QgD2ufzZsMyL3Z-ecv15dh6G_-0RQeUQAYkbk3mwsbKPpL4jkTI76SLogSs-Be17GaGZR9QbOtkx1-wRWMZzQ_y0gAh3uBeb6ngPwVnDOx36GVHaKaX-ZMqSJm8JfUxgindWKfNPCh7w9JgAVhwv8aW4rgKtz5Dp1ixK96loM_pnApf',
        text: commentText.trim(),
        timeAgo: 'Just now',
        likes: 0,
        isLiked: false,
      };
      setComments(prev => [newComment, ...prev]);
      setCommentText('');
    }
  };

  const CommentItem = ({ comment }: { comment: Comment }) => (
    <View style={styles.commentItem}>
      <Image source={{ uri: comment.avatar }} style={styles.commentAvatar} />
      <View style={styles.commentContent}>
        <View style={styles.commentHeader}>
          <Text style={styles.commentUsername}>@{comment.username}</Text>
          {comment.isCreator && (
            <Text style={styles.creatorBadge}>Creator</Text>
          )}
        </View>
        <Text style={styles.commentText}>{comment.text}</Text>
        <View style={styles.commentActions}>
          <Text style={styles.commentTime}>{comment.timeAgo}</Text>
          <TouchableOpacity style={styles.commentAction}>
            <Text style={styles.commentActionText}>Reply</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.commentAction}
            onPress={() => toggleCommentLike(comment.id)}
          >
            <Ionicons 
              name={comment.isLiked ? "heart" : "heart-outline"} 
              size={16} 
              color={comment.isLiked ? "#00ff88" : "#9ca3af"} 
            />
            <Text style={styles.commentActionText}>{comment.likes}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Video Background */}
      <View style={styles.videoContainer}>
        <Video
          ref={videoRef}
          source={{ uri: 'https://assets.mixkit.co/videos/preview/mixkit-man-dancing-under-the-rain-32432-large.mp4' }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          shouldPlay
          isLooping
          isMuted
        />
        <View style={styles.videoOverlay} />
      </View>

      {/* Bottom Content */}
      <View style={styles.bottomContent}>
        <View style={styles.userInfo}>
          <Image
            source={{
              uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe0IpIxUcYVRGV5nAOSRKw8sza42-eeWLiuKTnYR3KJyUPbiZvbOv6KhHG5Kg_vxd3X_MsYSgdK7lzjJ_G8QznU50x8G8S7YEV5HheWAas_H6UXqMyh9bwHQ69dJuxkBM9FUEprmlQ9Vgc2JED7g6XaW_F5b-E2HjEG1gW-EIs7o2V5GYBvdNeEJHVYXa5-KYSI4FtFMH9kxysXe4OjhyjbN8MLCwcAXADPLFWAbC_Lko1H15L8_7gI9FgTWPJ8b0r9N_jE3zhbqtx',
            }}
            style={styles.userAvatar}
          />
          <View style={styles.userDetails}>
            <View style={styles.userHeader}>
              <Text style={styles.username}>@sarah_dancer</Text>
              <TouchableOpacity style={styles.followButton}>
                <Text style={styles.followButtonText}>Follow</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.caption}>Vibing in the rain! #dance #rainyday #vibes</Text>
          </View>
        </View>

        {/* Video Controls */}
        <View style={styles.videoControls}>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="play" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <TouchableOpacity style={styles.controlButton}>
            <Ionicons name="volume-high" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Right Side Actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity style={styles.actionButton} onPress={toggleLike}>
          <Ionicons 
            name={isLiked ? "heart" : "heart-outline"} 
            size={32} 
            color={isLiked ? "#00ff88" : "white"} 
          />
          <Text style={styles.actionText}>12.3k</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={toggleComments}>
          <Ionicons name="chatbubble-outline" size={32} color="white" />
          <Text style={styles.actionText}>1.2k</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="share-outline" size={32} color="white" />
          <Text style={styles.actionText}>456</Text>
        </TouchableOpacity>
      </View>

      {/* Comments Modal */}
      <Modal
        visible={showComments}
        transparent
        animationType="none"
        onRequestClose={toggleComments}
      >
        <Animated.View 
          style={[
            styles.commentsModal,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          {/* Comments Header */}
          <View style={styles.commentsHeader}>
            <View style={styles.commentsHeaderSpacer} />
            <Text style={styles.commentsTitle}>Comments ({comments.length})</Text>
            <TouchableOpacity style={styles.closeButton} onPress={toggleComments}>
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          <ScrollView style={styles.commentsList} showsVerticalScrollIndicator={false}>
            {comments.map(comment => (
              <CommentItem key={comment.id} comment={comment} />
            ))}
          </ScrollView>

          {/* Comment Input */}
          <View style={styles.commentInput}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1mJjW8eviQ4VlqSn9PZ5hlBmVOFqizoprZZ2Q5KlunLgnHfQP3a2VL915jr5Yt_5Ci1wJWd9nM4w3PrkD6eoJykyr1sNu4QgD2ufzZsMyL3Z-ecv15dh6G_-0RQeUQAYkbk3mwsbKPpL4jkTI76SLogSs-Be17GaGZR9QbOtkx1-wRWMZzQ_y0gAh3uBeb6ngPwVnDOx36GVHaKaX-ZMqSJm8JfUxgindWKfNPCh7w9JgAVhwv8aW4rgKtz5Dp1ixK96loM_pnApf',
              }}
              style={styles.commentInputAvatar}
            />
            <TextInput
              style={styles.commentInputField}
              placeholder="Add comment..."
              placeholderTextColor="#9ca3af"
              value={commentText}
              onChangeText={setCommentText}
            />
            <TouchableOpacity 
              style={styles.postButton} 
              onPress={postComment}
              disabled={!commentText.trim()}
            >
              <Text style={[styles.postButtonText, !commentText.trim() && styles.postButtonDisabled]}>
                Post
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  videoContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    zIndex: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'white',
  },
  userDetails: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  followButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  followButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  caption: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
  },
  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  controlButton: {
    padding: 4,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
  },
  progressFill: {
    width: '50%',
    height: '100%',
    backgroundColor: '#00ff88',
    borderRadius: 3,
  },
  rightActions: {
    position: 'absolute',
    right: 16,
    top: height / 2 - 100,
    alignItems: 'center',
    gap: 24,
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    color: 'white',
  },
  commentsModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: height * 0.8,
    backgroundColor: '#1a1a1a',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  commentsHeaderSpacer: {
    width: 24,
  },
  commentsTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  commentsList: {
    flex: 1,
    padding: 16,
  },
  commentItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  commentUsername: {
    fontSize: 14,
    color: '#9ca3af',
  },
  creatorBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00ff88',
  },
  commentText: {
    fontSize: 14,
    color: 'white',
    marginTop: 2,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 4,
  },
  commentTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  commentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  commentActionText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  commentInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333333',
    backgroundColor: '#262626',
  },
  commentInputAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  commentInputField: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    paddingVertical: 8,
  },
  postButton: {
    paddingHorizontal: 8,
  },
  postButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00ff88',
  },
  postButtonDisabled: {
    color: '#666666',
  },
});

export default VideoPlayerScreen;
