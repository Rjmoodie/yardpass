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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Conversation {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  timeAgo: string;
  unreadCount: number;
  isOnline: boolean;
  isVerified?: boolean;
}

interface Message {
  id: string;
  text: string;
  timestamp: string;
  isFromMe: boolean;
  isRead: boolean;
  type: 'text' | 'image' | 'video';
  mediaUrl?: string;
}

const mockConversations: Conversation[] = [
  {
    id: '1',
    name: 'Sarah Dancer',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLdaCsNlxnJ522FOH-AI2NH7OnNZsbiSX-ET1sOx-YyhtUosZc1akJZnKJZUtCe4oQ8YvI7vdEOwjFZS57MriYCxf6SibOeABnAzgWbi2xilS0YRpHX_3zaKj4vPzA7U0OXU_eRwZVQYPyc_XSQL50MqPNPvOitd_2mItb6MkmP4JS9HAlPePhKuq-2Xi-SkJ6Wkn3xqpFnQ66zRMqRRUCzKklHq-MswQxJj_w-FXkQP6BpMRJMyzHoqaGVTJjF7Qw0o67yehq5o_G',
    lastMessage: 'Thanks for the invite! I\'ll be there! 🎉',
    timeAgo: '2m ago',
    unreadCount: 2,
    isOnline: true,
    isVerified: true,
  },
  {
    id: '2',
    name: 'Mike Wilson',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1mJjW8eviQ4VlqSn9PZ5hlBmVOFqizoprZZ2Q5KlunLgnHfQP3a2VL915jr5Yt_5Ci1wJWd9nM4w3PrkD6eoJykyr1sNu4QgD2ufzZsMyL3Z-ecv15dh6G_-0RQeUQAYkbk3mwsbKPpL4jkTI76SLogSs-Be17GaGZR9QbOtkx1-wRWMZzQ_y0gAh3uBeb6ngPwVnDOx36GVHaKaX-ZMqSJm8JfUxgindWKfNPCh7w9JgAVhwv8aW4rgKtz5Dp1ixK96loM_pnApf',
    lastMessage: 'The new track is ready for review',
    timeAgo: '1h ago',
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: '3',
    name: 'Emma Davis',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe0IpIxUcYVRGV5nAOSRKw8sza42-eeWLiuKTnYR3KJyUPbiZvbOv6KhHG5Kg_vxd3X_MsYSgdK7lzjJ_G8QznU50x8G8S7YEV5HheWAas_H6UXqMyh9bwHQ69dJuxkBM9FUEprmlQ9Vgc2JED7g6XaW_F5b-E2HjEG1gW-EIs7o2V5GYBvdNeEJHVYXa5-KYSI4FtFMH9kxysXe4OjhyjbN8MLCwcAXADPLFWAbC_Lko1H15L8_7gI9FgTWPJ8b0r9N_jE3zhbqtx',
    lastMessage: 'Can\'t wait for the festival!',
    timeAgo: '3h ago',
    unreadCount: 1,
    isOnline: true,
    isVerified: true,
  },
  {
    id: '4',
    name: 'Alex Johnson',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxidXvEcjRXe9HJa3AtffOGz6zu1AMTcN99O_RZO_NeKopvpMrxhXME-eDbFBl6joXMnB3W5-EPUp2mNTfu5wmd1F5GZI0JfirtcIyNRlCiOQOzwFJIF1JHakj2N2LH57h3-Me-97I1b2a9gtHhO2XGYt5eNkiXEmMDKqgQcGXAOIfOKPTPAKc9AfvV33r6HD2OJMCkGkhfotPkv7kZkwQbsLl3lqRDEa7Zdul6FLh96-5xvpYlL3JOW5aub3MY4RTNQvP3o-dKL4W',
    lastMessage: 'Great performance last night!',
    timeAgo: '1d ago',
    unreadCount: 0,
    isOnline: false,
  },
];

const mockMessages: Message[] = [
  {
    id: '1',
    text: 'Hey! How\'s the event planning going?',
    timestamp: '10:30 AM',
    isFromMe: false,
    isRead: true,
    type: 'text',
  },
  {
    id: '2',
    text: 'It\'s going great! We\'ve got most of the lineup confirmed',
    timestamp: '10:32 AM',
    isFromMe: true,
    isRead: true,
    type: 'text',
  },
  {
    id: '3',
    text: 'That\'s awesome! Can\'t wait to see the final schedule',
    timestamp: '10:35 AM',
    isFromMe: false,
    isRead: true,
    type: 'text',
  },
  {
    id: '4',
    text: 'I\'ll send you the updated lineup later today',
    timestamp: '10:36 AM',
    isFromMe: true,
    isRead: false,
    type: 'text',
  },
  {
    id: '5',
    text: 'Perfect! Thanks for keeping me in the loop',
    timestamp: '10:38 AM',
    isFromMe: false,
    isRead: true,
    type: 'text',
  },
];

const MessagesScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'conversations' | 'chat'>('conversations');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = () => {
    if (messageText.trim()) {
      console.log('Sending message:', messageText);
      setMessageText('');
      // Here you would typically add the message to the conversation
    }
  };

  const openChat = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    setActiveTab('chat');
  };

  const goBackToConversations = () => {
    setActiveTab('conversations');
    setSelectedConversation(null);
  };

  const renderConversation = ({ item }: { item: Conversation }) => (
    <TouchableOpacity style={styles.conversationItem} onPress={() => openChat(item)}>
      <View style={styles.conversationLeft}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: item.avatar }} style={styles.avatar} />
          {item.isOnline && <View style={styles.onlineIndicator} />}
        </View>
        <View style={styles.conversationInfo}>
          <View style={styles.conversationHeader}>
            <Text style={styles.conversationName}>{item.name}</Text>
            {item.isVerified && (
              <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
            )}
          </View>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        </View>
      </View>
      
      <View style={styles.conversationRight}>
        <Text style={styles.timeAgo}>{item.timeAgo}</Text>
        {item.unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadCount}>{item.unreadCount}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[styles.messageContainer, item.isFromMe && styles.messageContainerRight]}>
      <View style={[styles.messageBubble, item.isFromMe ? styles.myMessage : styles.theirMessage]}>
        <Text style={[styles.messageText, item.isFromMe && styles.myMessageText]}>
          {item.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={[styles.messageTime, item.isFromMe && styles.myMessageTime]}>
            {item.timestamp}
          </Text>
          {item.isFromMe && (
            <Ionicons 
              name={item.isRead ? "checkmark-done" : "checkmark"} 
              size={16} 
              color={item.isRead ? "#00ff88" : "#a3a3a3"} 
            />
          )}
        </View>
      </View>
    </View>
  );

  if (activeTab === 'chat' && selectedConversation) {
    return (
      <SafeAreaView style={styles.container}>
        {/* Chat Header */}
        <View style={styles.chatHeader}>
          <TouchableOpacity onPress={goBackToConversations} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.chatHeaderInfo}>
            <View style={styles.chatHeaderLeft}>
              <Image source={{ uri: selectedConversation.avatar }} style={styles.chatAvatar} />
              <View style={styles.chatHeaderText}>
                <View style={styles.chatHeaderNameRow}>
                  <Text style={styles.chatHeaderName}>{selectedConversation.name}</Text>
                  {selectedConversation.isVerified && (
                    <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
                  )}
                </View>
                <Text style={styles.chatHeaderStatus}>
                  {selectedConversation.isOnline ? 'Online' : 'Offline'}
                </Text>
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.chatHeaderButton}>
            <Ionicons name="call" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          data={mockMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          showsVerticalScrollIndicator={false}
          inverted
        />

        {/* Typing Indicator */}
        {isTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>{selectedConversation.name} is typing...</Text>
          </View>
        )}

        {/* Message Input */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <View style={styles.inputWrapper}>
            <TouchableOpacity style={styles.attachButton}>
              <Ionicons name="add" size={24} color="#a3a3a3" />
            </TouchableOpacity>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Type a message..."
              placeholderTextColor="#a3a3a3"
              value={messageText}
              onChangeText={setMessageText}
              multiline
            />
            
            <TouchableOpacity 
              style={[styles.sendButton, messageText.trim() && styles.sendButtonActive]}
              onPress={handleSendMessage}
              disabled={!messageText.trim()}
            >
              <Ionicons 
                name="send" 
                size={20} 
                color={messageText.trim() ? "#1a1a1a" : "#a3a3a3"} 
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity style={styles.newMessageButton}>
          <Ionicons name="create" size={24} color="#00ff88" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#a3a3a3" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor="#a3a3a3"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Conversations List */}
      <FlatList
        data={mockConversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        style={styles.conversationsList}
        showsVerticalScrollIndicator={false}
      />
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
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  newMessageButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    paddingVertical: 8,
  },
  conversationsList: {
    flex: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  conversationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff88',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  lastMessage: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  conversationRight: {
    alignItems: 'flex-end',
  },
  timeAgo: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: '#00ff88',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  chatHeaderInfo: {
    flex: 1,
  },
  chatHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chatAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  chatHeaderText: {
    flex: 1,
  },
  chatHeaderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  chatHeaderName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  chatHeaderStatus: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  chatHeaderButton: {
    padding: 4,
  },
  messagesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  messageContainer: {
    marginVertical: 4,
    alignItems: 'flex-start',
  },
  messageContainerRight: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  theirMessage: {
    backgroundColor: '#262626',
  },
  myMessage: {
    backgroundColor: '#00ff88',
  },
  messageText: {
    fontSize: 16,
    color: 'white',
    marginBottom: 4,
  },
  myMessageText: {
    color: '#1a1a1a',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  messageTime: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  myMessageTime: {
    color: '#1a1a1a',
  },
  typingIndicator: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 14,
    color: '#a3a3a3',
    fontStyle: 'italic',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: '#262626',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  attachButton: {
    padding: 8,
  },
  messageInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
});

export default MessagesScreen;
