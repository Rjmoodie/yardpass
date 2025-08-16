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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Notification {
  id: string;
  type: 'follow' | 'like' | 'comment' | 'event' | 'mention' | 'system';
  title: string;
  message: string;
  timeAgo: string;
  avatar?: string;
  image?: string;
  isRead: boolean;
  isVerified?: boolean;
  actionText?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'follow',
    title: 'Liam Carter',
    message: 'started following you',
    timeAgo: '2m ago',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAC2ZW6k71QIA0yTlGGv0wnOVFoDWH73syhYGPyqBLT3fLDRpGydvzPfuM46Y2MhyXEr9SQQm6O3X_wG9s88Fpbpudgd8CDlHX5pvHn2w6HeqhEWDWyWwCs8K8MjG9pDcDqeRRQwcSpFJzpdcYHOIM1ur5Is13vD0Ph1EBhlTVmA7-Y2CTyTGS4evxCmq-frpgHOB4ZZkq5_cl5eJFD80HZoKVItHDk0QbdxolBm0Ry2EPl3HQrmTvHV99dXFIm0YZ-a8Wrh7kd5BK5',
    isRead: false,
    isVerified: true,
    actionText: 'Follow back',
  },
  {
    id: '2',
    type: 'like',
    title: 'Sarah Dancer',
    message: 'liked your video',
    timeAgo: '5m ago',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCLdaCsNlxnJ522FOH-AI2NH7OnNZsbiSX-ET1sOx-YyhtUosZc1akJZnKJZUtCe4oQ8YvI7vdEOwjFZS57MriYCxf6SibOeABnAzgWbi2xilS0YRpHX_3zaKj4vPzA7U0OXU_eRwZVQYPyc_XSQL50MqPNPvOitd_2mItb6MkmP4JS9HAlPePhKuq-2Xi-SkJ6Wkn3xqpFnQ66zRMqRRUCzKklHq-MswQxJj_w-FXkQP6BpMRJMyzHoqaGVTJjF7Qw0o67yehq5o_G',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBxidXvEcjRXe9HJa3AtffOGz6zu1AMTcN99O_RZO_NeKopvpMrxhXME-eDbFBl6joXMnB3W5-EPUp2mNTfu5wmd1F5GZI0JfirtcIyNRlCiOQOzwFJIF1JHakj2N2LH57h3-Me-97I1b2a9gtHhO2XGYt5eNkiXEmMDKqgQcGXAOIfOKPTPAKc9AfvV33r6HD2OJMCkGkhfotPkv7kZkwQbsLl3lqRDEa7Zdul6FLh96-5xvpYlL3JOW5aub3MY4RTNQvP3o-dKL4W',
    isRead: false,
    isVerified: true,
  },
  {
    id: '3',
    type: 'comment',
    title: 'Mike Wilson',
    message: 'commented: "Amazing moves! 🔥"',
    timeAgo: '12m ago',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD1mJjW8eviQ4VlqSn9PZ5hlBmVOFqizoprZZ2Q5KlunLgnHfQP3a2VL915jr5Yt_5Ci1wJWd9nM4w3PrkD6eoJykyr1sNu4QgD2ufzZsMyL3Z-ecv15dh6G_-0RQeUQAYkbk3mwsbKPpL4jkTI76SLogSs-Be17GaGZR9QbOtkx1-wRWMZzQ_y0gAh3uBeb6ngPwVnDOx36GVHaKaX-ZMqSJm8JfUxgindWKfNPCh7w9JgAVhwv8aW4rgKtz5Dp1ixK96loM_pnApf',
    isRead: true,
    actionText: 'Reply',
  },
  {
    id: '4',
    type: 'event',
    title: 'Electric Echoes Festival',
    message: 'is starting in 2 hours',
    timeAgo: '1h ago',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDp2NsJjGMq6FWUibZwSMoKMJ7xR1BPO1c_t3zszwtODB5h_VQodoTpnlNfFe0N6-ClWuJXYstSDhJ8Z6XfLysiK-sTFw2BXYP81qEaxKIKCcNeqxHN-h65R6EWZUR1w10DlcaMSS-rJr3X6l6YITsJTkGygAyCmw24gbtfTgRJAWSfewL4KBVXaPMciJpLuXM03NY3d6uKwlyPZngqTLhMTpz4n_8Dps2LQ42i8pzAMep0WbZWNhZJUAM0x57JxD8BuUzskOPeK2ah',
    isRead: true,
    actionText: 'View Event',
  },
  {
    id: '5',
    type: 'mention',
    title: 'Emma Davis',
    message: 'mentioned you in a comment',
    timeAgo: '2h ago',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBe0IpIxUcYVRGV5nAOSRKw8sza42-eeWLiuKTnYR3KJyUPbiZvbOv6KhHG5Kg_vxd3X_MsYSgdK7lzjJ_G8QznU50x8G8S7YEV5HheWAas_H6UXqMyh9bwHQ69dJuxkBM9FUEprmlQ9Vgc2JED7g6XaW_F5b-E2HjEG1gW-EIs7o2V5GYBvdNeEJHVYXa5-KYSI4FtFMH9kxysXe4OjhyjbN8MLCwcAXADPLFWAbC_Lko1H15L8_7gI9FgTWPJ8b0r9N_jE3zhbqtx',
    isRead: true,
    actionText: 'View',
  },
  {
    id: '6',
    type: 'system',
    title: 'Welcome to YardPass!',
    message: 'Your account has been successfully created. Start exploring events and connecting with creators!',
    timeAgo: '1d ago',
    isRead: true,
    actionText: 'Get Started',
  },
];

const NotificationsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'follows' | 'likes' | 'comments' | 'events'>('all');
  const [notifications, setNotifications] = useState(mockNotifications);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow':
        return 'person-add';
      case 'like':
        return 'heart';
      case 'comment':
        return 'chatbubble';
      case 'event':
        return 'calendar';
      case 'mention':
        return 'at';
      case 'system':
        return 'notifications';
      default:
        return 'notifications';
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow':
        return '#00ff88';
      case 'like':
        return '#ff4757';
      case 'comment':
        return '#3742fa';
      case 'event':
        return '#ffa502';
      case 'mention':
        return '#2ed573';
      case 'system':
        return '#a3a3a3';
      default:
        return '#a3a3a3';
    }
  };

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, isRead: true } : notification
      )
    );
  };

  const renderNotification = ({ item }: { item: Notification }) => (
    <TouchableOpacity 
      style={[styles.notificationItem, !item.isRead && styles.unreadNotification]}
      onPress={() => markAsRead(item.id)}
    >
      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={styles.avatarContainer}>
            {item.avatar ? (
              <Image source={{ uri: item.avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.iconContainer, { backgroundColor: getNotificationColor(item.type) }]}>
                <Ionicons name={getNotificationIcon(item.type) as any} size={20} color="white" />
              </View>
            )}
            {!item.isRead && <View style={styles.unreadDot} />}
          </View>
          
          <View style={styles.notificationInfo}>
            <View style={styles.notificationTitleRow}>
              <Text style={styles.notificationTitle}>{item.title}</Text>
              {item.isVerified && (
                <Ionicons name="checkmark-circle" size={16} color="#00ff88" />
              )}
            </View>
            <Text style={styles.notificationMessage}>{item.message}</Text>
            <Text style={styles.notificationTime}>{item.timeAgo}</Text>
          </View>
        </View>

        {item.image && (
          <Image source={{ uri: item.image }} style={styles.notificationImage} />
        )}

        {item.actionText && (
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>{item.actionText}</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  const filteredNotifications = activeTab === 'all' 
    ? notifications 
    : notifications.filter(n => n.type === activeTab.slice(0, -1) as any);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.unreadBadge}>
            <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'follows' && styles.activeTab]}
            onPress={() => setActiveTab('follows')}
          >
            <Text style={[styles.tabText, activeTab === 'follows' && styles.activeTabText]}>Follows</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'likes' && styles.activeTab]}
            onPress={() => setActiveTab('likes')}
          >
            <Text style={[styles.tabText, activeTab === 'likes' && styles.activeTabText]}>Likes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'comments' && styles.activeTab]}
            onPress={() => setActiveTab('comments')}
          >
            <Text style={[styles.tabText, activeTab === 'comments' && styles.activeTabText]}>Comments</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'events' && styles.activeTab]}
            onPress={() => setActiveTab('events')}
          >
            <Text style={[styles.tabText, activeTab === 'events' && styles.activeTabText]}>Events</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Notifications List */}
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        style={styles.notificationsList}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.notificationsContent}
      />

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="search" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="calendar" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={24} color="#a3a3a3" />
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
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
  },
  unreadBadge: {
    backgroundColor: '#00ff88',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    alignItems: 'center',
  },
  unreadBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  activeTab: {
    backgroundColor: '#00ff88',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  activeTabText: {
    color: '#1a1a1a',
  },
  notificationsList: {
    flex: 1,
  },
  notificationsContent: {
    paddingBottom: 20,
  },
  notificationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  unreadNotification: {
    backgroundColor: 'rgba(0, 255, 136, 0.05)',
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  notificationHeader: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#00ff88',
    borderWidth: 2,
    borderColor: '#1a1a1a',
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  notificationMessage: {
    fontSize: 14,
    color: '#a3a3a3',
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#666666',
  },
  notificationImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginLeft: 12,
  },
  actionButton: {
    backgroundColor: '#00ff88',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 8,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bottomNavigation: {
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 12,
    paddingHorizontal: 16,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  createButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -24,
    shadowColor: '#00ff88',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
});

export default NotificationsScreen;
