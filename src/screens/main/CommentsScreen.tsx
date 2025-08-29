import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Comment {
  id: string;
  username: string;
  avatar: string;
  text: string;
  timeAgo: string;
  likes: number;
  isLiked: boolean;
  isCreator?: boolean;
  replies?: Comment[];
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
    replies: [
      {
        id: '1-1',
        username: 'sarah_dancer',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLdaCsNlxnJ522FOH-AI2NH7OnNZsbiSX-ET1sOx-YyhtUosZc1akJZnKJZUtCe4oQ8YvI7vdEOwjFZS57MriYCxf6SibOeABnAzgWbi2xilS0YRpHX_3zaKj4vPzA7U0OXU_eRwZVQYPyc_XSQL50MqPNPvOitd_2mItb6MkmP4JS9HAlPePhKuq-2Xi-SkJ6Wkn3xqpFnQ66zRMqRRUCzKklHq-MswQxJj_w-FXkQP6BpMRJMyzHoqaGVTJjF7Qw0o67yehq5o_G',
        text: 'Thank you! It\'s at the downtown square!',
        timeAgo: '4h ago',
        likes: 45,
        isLiked: true,
        isCreator: true,
      },
    ],
  },
  {
    id: '2',
    username: 'jane_smith',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDRgmH__pj8QgpWOy4Zy9fNHiRnhjfdf3Bo5n3qBQF6UfCNSkMAes5RAN89hw6HwX9RCVcRhD6gKegQGTfLbmsSLLi5uS6SI92I_61qHziKR1ZgN4cs0p_MbztgdeCGIVJCu64oTgknhuUv-_olvVwsfiHtHayZViIHHjW-Oy_SoU6BumOSXt_2Fris3cPTtmkLVOIY5dKRCc70Iratn4tv80Ua-W6v-0RB1GYpxmj98ZE3OQM_5DB8EvaF5BFWPbtB7VzmWKAuoMRS',
    text: 'Love the energy! The green accent from YardPass is a nice touch on your profile. 😉',
    timeAgo: '4h ago',
    likes: 8,
    isLiked: false,
  },
  {
    id: '3',
    username: 'mike_wilson',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1mJjW8eviQ4VlqSn9PZ5hlBmVOFqizoprZZ2Q5KlunLgnHfQP3a2VL915jr5Yt_5Ci1wJWd9nM4w3PrkD6eoJykyr1sNu4QgD2ufzZsMyL3Z-ecv15dh6G_-0RQeUQAYkbk3mwsbKPpL4jkTI76SLogSs-Be17GaGZR9QbOtkx1-wRWMZzQ_y0gAh3uBeb6ngPwVnDOx36GVHaKaX-ZMqSJm8JfUxgindWKfNPCh7w9JgAVhwv8aW4rgKtz5Dp1ixK96loM_pnApf',
    text: 'The dance moves are incredible! What\'s your secret?',
    timeAgo: '3h ago',
    likes: 15,
    isLiked: true,
  },
  {
    id: '4',
    username: 'emma_davis',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe0IpIxUcYVRGV5nAOSRKw8sza42-eeWLiuKTnYR3KJyUPbiZvbOv6KhHG5Kg_vxd3X_MsYSgdK7lzjJ_G8QznU50x8G8S7YEV5HheWAas_H6UXqMyh9bwHQ69dJuxkBM9FUEprmlQ9Vgc2JED7g6XaW_F5b-E2HjEG1gW-EIs7o2V5GYBvdNeEJHVYXa5-KYSI4FtFMH9kxysXe4OjhyjbN8MLCwcAXADPLFWAbC_Lko1H15L8_7gI9FgTWPJ8b0r9N_jE3zhbqtx',
    text: 'This gives me such good vibes! Can\'t wait to see more from you!',
    timeAgo: '2h ago',
    likes: 23,
    isLiked: false,
  },
];

const CommentsScreen: React.FC = () => {
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState(mockComments);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

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
      setReplyingTo(null);
    }
  };

  const CommentItem = ({ comment, isReply = false }: { comment: Comment; isReply?: boolean }) => (
    <View style={[styles.commentItem, isReply && styles.replyItem]}>
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
          <TouchableOpacity 
            style={styles.commentAction}
            onPress={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
          >
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
        
        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <View style={styles.repliesContainer}>
            {comment.replies.map(reply => (
              <CommentItem key={reply.id} comment={reply} isReply={true} />
            ))}
          </View>
        )}
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
        <Text style={styles.headerTitle}>Comments ({comments.length})</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Comments List */}
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.commentsList} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.commentsContent}
        >
          {comments.map(comment => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </ScrollView>

        {/* Comment Input */}
        <View style={styles.commentInput}>
          {replyingTo && (
            <View style={styles.replyingTo}>
              <Text style={styles.replyingToText}>
                Replying to @{comments.find(c => c.id === replyingTo)?.username}
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close" size={16} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputContainer}>
            <Image
              source={{
                uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1mJjW8eviQ4VlqSn9PZ5hlBmVOFqizoprZZ2Q5KlunLgnHfQP3a2VL915jr5Yt_5Ci1wJWd9nM4w3PrkD6eoJykyr1sNu4QgD2ufzZsMyL3Z-ecv15dh6G_-0RQeUQAYkbk3mwsbKPpL4jkTI76SLogSs-Be17GaGZR9QbOtkx1-wRWMZzQ_y0gAh3uBeb6ngPwVnDOx36GVHaKaX-ZMqSJm8JfUxgindWKfNPCh7w9JgAVhwv8aW4rgKtz5Dp1ixK96loM_pnApf',
              }}
              style={styles.commentInputAvatar}
            />
            <TextInput
              style={styles.commentInputField}
              placeholder={replyingTo ? "Write a reply..." : "Add comment..."}
              placeholderTextColor="#9ca3af"
              value={commentText}
              onChangeText={setCommentText}
              multiline
              maxLength={500}
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
        </View>
      </KeyboardAvoidingView>
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
  keyboardAvoidingView: {
    flex: 1,
  },
  commentsList: {
    flex: 1,
  },
  commentsContent: {
    paddingBottom: 20,
  },
  commentItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  replyItem: {
    marginLeft: 40,
    paddingVertical: 8,
  },
  commentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  creatorBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: '#00ff88',
  },
  commentText: {
    fontSize: 14,
    color: 'white',
    lineHeight: 20,
    marginBottom: 8,
  },
  commentActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  repliesContainer: {
    marginTop: 8,
    paddingLeft: 12,
  },
  commentInput: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    backgroundColor: '#262626',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  replyingTo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  replyingToText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
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
    paddingHorizontal: 12,
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    maxHeight: 100,
    textAlignVertical: 'top',
  },
  postButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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

export default CommentsScreen;
