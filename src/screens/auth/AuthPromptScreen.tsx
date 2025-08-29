import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface AuthPromptScreenProps {
  route: {
    params: {
      action: string;
      title: string;
      message: string;
      primaryAction: string;
      secondaryAction: string;
      onSuccess?: () => void;
    };
  };
}

const AuthPromptScreen: React.FC<AuthPromptScreenProps> = ({ route }) => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  
  const {
    action,
    title,
    message,
    primaryAction,
    secondaryAction,
    onSuccess,
  } = route.params;

  const handleSignIn = () => {
    navigation.navigate('SignIn' as never);
  };

  const handleSignUp = () => {
    navigation.navigate('SignUp' as never);
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy_tickets':
        return '🎫';
      case 'like_post':
        return '❤️';
      case 'comment':
        return '💬';
      case 'follow':
        return '👥';
      case 'create_event':
        return '📅';
      case 'create_post':
        return '📝';
      case 'save_event':
        return '🔖';
      case 'access_wallet':
        return '💳';
      default:
        return '🔒';
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={24} color={theme.colors.white} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Action Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.actionIcon}>{getActionIcon(action)}</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>{title}</Text>

          {/* Message */}
          <Text style={styles.message}>{message}</Text>

          {/* Benefits */}
          <View style={styles.benefitsContainer}>
            <Text style={styles.benefitsTitle}>With an account you can:</Text>
            <View style={styles.benefitsList}>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                <Text style={styles.benefitText}>Buy and manage tickets</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                <Text style={styles.benefitText}>Follow favorite organizers</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                <Text style={styles.benefitText}>Save events for later</Text>
              </View>
              <View style={styles.benefitItem}>
                <Ionicons name="checkmark-circle" size={20} color={theme.colors.white} />
                <Text style={styles.benefitText}>Join the community</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleSignUp}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[theme.colors.accent, theme.colors.primary]}
              style={styles.buttonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryButtonText}>{secondaryAction}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSignIn}
            activeOpacity={0.8}
          >
            <Text style={styles.secondaryButtonText}>{primaryAction}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Continue Browsing</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  actionIcon: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: theme.colors.white,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    opacity: 0.9,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.white,
    textAlign: 'center',
    marginBottom: 20,
  },
  benefitsList: {
    gap: 12,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 16,
    color: theme.colors.white,
    opacity: 0.9,
  },
  actionsContainer: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    gap: 16,
  },
  primaryButton: {
    borderRadius: 12,
    shadowColor: theme.colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonGradient: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.white,
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.white,
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: theme.colors.white,
    opacity: 0.7,
    textDecorationLine: 'underline',
  },
});

export default AuthPromptScreen;
