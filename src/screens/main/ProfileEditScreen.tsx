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
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileData {
  avatar: string;
  username: string;
  displayName: string;
  bio: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  isPrivate: boolean;
  showEmail: boolean;
  showPhone: boolean;
  allowMessages: boolean;
  allowComments: boolean;
}

const ProfileEditScreen: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData>({
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=200',
    username: 'sarahdancer',
    displayName: 'Sarah Dancer',
    bio: 'Professional dancer and choreographer. Love creating art through movement and sharing my passion with the world. 🎭✨',
    email: 'sarah.dancer@email.com',
    phone: '+1 (555) 123-4567',
    location: 'New York, NY',
    website: 'https://sarahdancer.com',
    instagram: '@sarahdancer',
    twitter: '@sarahdancer',
    tiktok: '@sarahdancer',
    isPrivate: false,
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    allowComments: true,
  });

  const [activeSection, setActiveSection] = useState<'basic' | 'social' | 'privacy'>('basic');

  const handleInputChange = (field: keyof ProfileData, value: string | boolean) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
  };

  const handleAvatarUpload = () => {
    Alert.alert('Avatar Upload', 'Image picker would open here');
  };

  const handleSave = () => {
    Alert.alert(
      'Save Changes',
      'Are you sure you want to save these changes?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: () => console.log('Profile saved') },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. Are you sure you want to delete your account?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => console.log('Account deleted') },
      ]
    );
  };

  const renderBasicInfo = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      {/* Avatar */}
      <View style={styles.avatarSection}>
        <TouchableOpacity style={styles.avatarContainer} onPress={handleAvatarUpload}>
          <Image source={{ uri: profileData.avatar }} style={styles.avatar} />
          <View style={styles.avatarOverlay}>
            <Ionicons name="camera" size={24} color="white" />
          </View>
        </TouchableOpacity>
        <Text style={styles.avatarHint}>Tap to change photo</Text>
      </View>

      {/* Username */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Username *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter username"
          placeholderTextColor="#a3a3a3"
          value={profileData.username}
          onChangeText={(value) => handleInputChange('username', value)}
        />
        <Text style={styles.inputHint}>This will be your unique identifier</Text>
      </View>

      {/* Display Name */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Display Name *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter display name"
          placeholderTextColor="#a3a3a3"
          value={profileData.displayName}
          onChangeText={(value) => handleInputChange('displayName', value)}
        />
      </View>

      {/* Bio */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Bio</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          placeholder="Tell us about yourself..."
          placeholderTextColor="#a3a3a3"
          value={profileData.bio}
          onChangeText={(value) => handleInputChange('bio', value)}
          multiline
          numberOfLines={4}
        />
        <Text style={styles.inputHint}>Max 150 characters</Text>
      </View>

      {/* Email */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email *</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter email address"
          placeholderTextColor="#a3a3a3"
          value={profileData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          keyboardType="email-address"
        />
      </View>

      {/* Phone */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter phone number"
          placeholderTextColor="#a3a3a3"
          value={profileData.phone}
          onChangeText={(value) => handleInputChange('phone', value)}
          keyboardType="phone-pad"
        />
      </View>

      {/* Location */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Location</Text>
        <TextInput
          style={styles.textInput}
          placeholder="Enter your location"
          placeholderTextColor="#a3a3a3"
          value={profileData.location}
          onChangeText={(value) => handleInputChange('location', value)}
        />
      </View>
    </View>
  );

  const renderSocialLinks = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Social Links</Text>
      
      {/* Website */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Website</Text>
        <TextInput
          style={styles.textInput}
          placeholder="https://yourwebsite.com"
          placeholderTextColor="#a3a3a3"
          value={profileData.website}
          onChangeText={(value) => handleInputChange('website', value)}
          keyboardType="url"
        />
      </View>

      {/* Instagram */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Instagram</Text>
        <View style={styles.socialInputContainer}>
          <Ionicons name="logo-instagram" size={20} color="#E4405F" style={styles.socialIcon} />
          <TextInput
            style={styles.socialInput}
            placeholder="@username"
            placeholderTextColor="#a3a3a3"
            value={profileData.instagram}
            onChangeText={(value) => handleInputChange('instagram', value)}
          />
        </View>
      </View>

      {/* Twitter */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Twitter</Text>
        <View style={styles.socialInputContainer}>
          <Ionicons name="logo-twitter" size={20} color="#1DA1F2" style={styles.socialIcon} />
          <TextInput
            style={styles.socialInput}
            placeholder="@username"
            placeholderTextColor="#a3a3a3"
            value={profileData.twitter}
            onChangeText={(value) => handleInputChange('twitter', value)}
          />
        </View>
      </View>

      {/* TikTok */}
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>TikTok</Text>
        <View style={styles.socialInputContainer}>
          <Ionicons name="logo-twitter" size={20} color="#000000" style={styles.socialIcon} />
          <TextInput
            style={styles.socialInput}
            placeholder="@username"
            placeholderTextColor="#a3a3a3"
            value={profileData.tiktok}
            onChangeText={(value) => handleInputChange('tiktok', value)}
          />
        </View>
      </View>
    </View>
  );

  const renderPrivacySettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Privacy Settings</Text>
      
      {/* Private Account */}
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Private Account</Text>
          <Text style={styles.settingDescription}>Only approved followers can see your content</Text>
        </View>
        <Switch
          value={profileData.isPrivate}
          onValueChange={(value) => handleInputChange('isPrivate', value)}
          trackColor={{ false: '#333333', true: '#00ff88' }}
          thumbColor={profileData.isPrivate ? '#1a1a1a' : '#f4f3f4'}
        />
      </View>

      {/* Show Email */}
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Show Email</Text>
          <Text style={styles.settingDescription}>Allow others to see your email address</Text>
        </View>
        <Switch
          value={profileData.showEmail}
          onValueChange={(value) => handleInputChange('showEmail', value)}
          trackColor={{ false: '#333333', true: '#00ff88' }}
          thumbColor={profileData.showEmail ? '#1a1a1a' : '#f4f3f4'}
        />
      </View>

      {/* Show Phone */}
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Show Phone</Text>
          <Text style={styles.settingDescription}>Allow others to see your phone number</Text>
        </View>
        <Switch
          value={profileData.showPhone}
          onValueChange={(value) => handleInputChange('showPhone', value)}
          trackColor={{ false: '#333333', true: '#00ff88' }}
          thumbColor={profileData.showPhone ? '#1a1a1a' : '#f4f3f4'}
        />
      </View>

      {/* Allow Messages */}
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Allow Messages</Text>
          <Text style={styles.settingDescription}>Let others send you direct messages</Text>
        </View>
        <Switch
          value={profileData.allowMessages}
          onValueChange={(value) => handleInputChange('allowMessages', value)}
          trackColor={{ false: '#333333', true: '#00ff88' }}
          thumbColor={profileData.allowMessages ? '#1a1a1a' : '#f4f3f4'}
        />
      </View>

      {/* Allow Comments */}
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Text style={styles.settingTitle}>Allow Comments</Text>
          <Text style={styles.settingDescription}>Let others comment on your posts</Text>
        </View>
        <Switch
          value={profileData.allowComments}
          onValueChange={(value) => handleInputChange('allowComments', value)}
          trackColor={{ false: '#333333', true: '#00ff88' }}
          thumbColor={profileData.allowComments ? '#1a1a1a' : '#f4f3f4'}
        />
      </View>
    </View>
  );

  const renderAccountActions = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Actions</Text>
      
      <TouchableOpacity style={styles.actionButton} onPress={handleSave}>
        <Ionicons name="save" size={20} color="#00ff88" />
        <Text style={styles.actionButtonText}>Save Changes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="download" size={20} color="#a3a3a3" />
        <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
          Download My Data
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton}>
        <Ionicons name="lock-closed" size={20} color="#a3a3a3" />
        <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
          Change Password
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.actionButton, styles.deleteButton]} 
        onPress={handleDeleteAccount}
      >
        <Ionicons name="trash" size={20} color="#ff4444" />
        <Text style={[styles.actionButtonText, styles.deleteButtonText]}>
          Delete Account
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeSection === 'basic' && styles.tabActive]}
          onPress={() => setActiveSection('basic')}
        >
          <Text style={[styles.tabText, activeSection === 'basic' && styles.tabTextActive]}>
            Basic
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeSection === 'social' && styles.tabActive]}
          onPress={() => setActiveSection('social')}
        >
          <Text style={[styles.tabText, activeSection === 'social' && styles.tabTextActive]}>
            Social
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.tab, activeSection === 'privacy' && styles.tabActive]}
          onPress={() => setActiveSection('privacy')}
        >
          <Text style={[styles.tabText, activeSection === 'privacy' && styles.tabTextActive]}>
            Privacy
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeSection === 'basic' && renderBasicInfo()}
        {activeSection === 'social' && renderSocialLinks()}
        {activeSection === 'privacy' && (
          <>
            {renderPrivacySettings()}
            {renderAccountActions()}
          </>
        )}
      </ScrollView>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#00ff88',
    borderRadius: 20,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 20,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 8,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#00ff88',
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarHint: {
    fontSize: 12,
    color: '#a3a3a3',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: 'white',
    borderWidth: 1,
    borderColor: '#333333',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  inputHint: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 4,
  },
  socialInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#333333',
  },
  socialIcon: {
    marginRight: 12,
  },
  socialInput: {
    flex: 1,
    fontSize: 16,
    color: 'white',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#a3a3a3',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#00ff88',
    marginLeft: 12,
  },
  actionButtonTextSecondary: {
    color: '#a3a3a3',
  },
  deleteButton: {
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#ff4444',
  },
});

export default ProfileEditScreen;
