import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { supabase } from '@/services/supabase';
import { resetPassword } from '@/store/slices/authSlice';
import { theme } from '@/constants/theme';

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResetMode, setIsResetMode] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  useEffect(() => {
    checkUrlParams();
  }, []);

  const checkUrlParams = () => {
    try {
      // Get URL parameters from the current URL
      const url = window.location.href;
      const urlParams = new URLSearchParams(window.location.search);
      
      // Also check for hash parameters (Supabase sometimes uses these)
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Check for tokens in both URL params and hash
      const token = urlParams.get('access_token') || hashParams.get('access_token');
      const refresh = urlParams.get('refresh_token') || hashParams.get('refresh_token');
      const type = urlParams.get('type') || hashParams.get('type');
      
      console.log('ResetPassword component - URL params check:');
      console.log('access_token:', !!token);
      console.log('refresh_token:', !!refresh);
      console.log('type:', type);
      
      if (token && refresh && type === 'recovery') {
        console.log('Setting reset mode - tokens found');
        setAccessToken(token);
        setRefreshToken(refresh);
        setIsResetMode(true);
        
        // Establish session with Supabase
        establishSession(token, refresh);
      } else {
        console.log('Not setting reset mode - missing tokens or wrong type');
        setIsResetMode(false);
      }
    } catch (error) {
      console.error('Error checking URL params:', error);
      setIsResetMode(false);
    }
  };

  const establishSession = async (token: string, refresh: string) => {
    try {
      console.log('Establishing session with tokens...');
      
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refresh,
      });

      if (error) {
        console.error('Error establishing session:', error);
        Alert.alert('Error', 'Failed to establish session. Please try the reset link again.');
        setIsResetMode(false);
        return;
      }

      if (data.session) {
        console.log('Session established successfully');
        // Session is now active, user can update password
      } else {
        console.error('No session data returned');
        Alert.alert('Error', 'Failed to establish session. Please try the reset link again.');
        setIsResetMode(false);
      }
    } catch (error) {
      console.error('Error in establishSession:', error);
      Alert.alert('Error', 'Failed to establish session. Please try the reset link again.');
      setIsResetMode(false);
    }
  };

  const handleSendResetEmail = async () => {
    if (!email || !email.includes('@')) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await dispatch(resetPassword(email)).unwrap();
      Alert.alert(
        'Reset Email Sent',
        'Check your email for password reset instructions.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) {
        throw error;
      }

      Alert.alert(
        'Success',
        'Your password has been updated successfully.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn' as never) }]
      );
    } catch (error: any) {
      console.error('Error updating password:', error);
      Alert.alert('Error', error.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignIn = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={handleBackToSignIn}
            >
              <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
              <Text style={styles.backText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>

          {/* Main Content */}
          <View style={styles.content}>
            <View style={styles.card}>
              <Text style={styles.title}>
                {isResetMode ? 'Update Password' : 'Reset Password'}
              </Text>
              
              <Text style={styles.subtitle}>
                {isResetMode 
                  ? 'Enter your new password below'
                  : 'Enter your email to receive reset instructions'
                }
              </Text>

              {!isResetMode ? (
                // Email Input Mode
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your email address"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              ) : (
                // Password Update Mode
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  
                  <Text style={styles.label}>Confirm Password</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {/* Action Button */}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.primary },
                  isLoading && styles.actionButtonDisabled
                ]}
                onPress={isResetMode ? handleUpdatePassword : handleSendResetEmail}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>
                  {isLoading 
                    ? (isResetMode ? 'Updating...' : 'Sending...')
                    : (isResetMode ? 'Update Password' : 'Send Reset Email')
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  backText: {
    marginLeft: 8,
    fontSize: 16,
    color: theme.colors.text,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.background,
    marginBottom: 16,
  },
  actionButton: {
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ResetPasswordScreen;
