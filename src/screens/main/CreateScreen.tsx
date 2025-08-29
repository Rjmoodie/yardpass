import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '../../hooks/useNavigation';
import { useActions } from '../../hooks/useActions';

const CreateScreen: React.FC = () => {
  const {
    navigateToCreatePost,
    navigateToEventCreation,
    navigateToCamera,
    navigateToHome,
    navigateToDiscover,
    navigateToWallet,
    navigateToProfile,
  } = useNavigation();

  const { handleCreatePost, handleCreateEvent } = useActions();

  const ActionButton = ({ 
    title, 
    isPrimary = false, 
    onPress,
    icon 
  }: { 
    title: string; 
    isPrimary?: boolean; 
    onPress: () => void;
    icon: string;
  }) => (
    <TouchableOpacity
      style={[
        styles.actionButton,
        isPrimary ? styles.primaryButton : styles.secondaryButton,
      ]}
      onPress={onPress}
    >
      <View style={styles.buttonContent}>
        <Ionicons 
          name={icon as any} 
          size={24} 
          color={isPrimary ? "#1a1a1a" : "white"} 
          style={styles.buttonIcon}
        />
        <Text
          style={[
            styles.buttonText,
            isPrimary ? styles.primaryButtonText : styles.secondaryButtonText,
          ]}
        >
          {title}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.closeButton}>
          <Ionicons name="close" size={28} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        <View style={styles.buttonContainer}>
          <ActionButton
            title="Video Post"
            isPrimary={true}
            onPress={() => {
              handleCreatePost();
              navigateToCreatePost();
            }}
            icon="videocam"
          />
          <ActionButton
            title="Story"
            onPress={() => {
              handleCreatePost();
              navigateToCreatePost();
            }}
            icon="camera"
          />
          <ActionButton
            title="Go Live"
            onPress={() => {
              handleCreatePost();
              navigateToCreatePost();
            }}
            icon="radio"
          />
          <ActionButton
            title="Create Event"
            onPress={() => {
              handleCreateEvent();
              navigateToEventCreation();
            }}
            icon="calendar"
          />
          <ActionButton
            title="Take Photo"
            onPress={() => navigateToCamera()}
            icon="camera-outline"
          />
        </View>
      </View>

      {/* Bottom Navigation */}
      <View style={styles.bottomNavigation}>
        <TouchableOpacity style={styles.navItem} onPress={navigateToHome}>
          <Ionicons name="home" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={navigateToDiscover}>
          <Ionicons name="search" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.createButton} onPress={() => {}}>
          <Ionicons name="add" size={28} color="#1a1a1a" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={navigateToWallet}>
          <Ionicons name="calendar" size={24} color="#a3a3a3" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={navigateToProfile}>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  headerSpacer: {
    width: 40,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    gap: 16,
  },
  actionButton: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  primaryButton: {
    backgroundColor: '#00ff88',
    borderColor: '#00ff88',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: '#333',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#1a1a1a',
  },
  secondaryButtonText: {
    color: 'white',
  },
  bottomNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  navItem: {
    alignItems: 'center',
  },
  createButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#00ff88',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CreateScreen;
