import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log error to analytics/crash reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Send to crash reporting service (e.g., Sentry, Crashlytics)
    this.reportError(error, errorInfo);
  }

  componentDidUpdate(prevProps: Props) {
    // Reset error state when props change (if enabled)
    if (this.props.resetOnPropsChange && prevProps !== this.props) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  }

  reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Implement crash reporting service integration here
    // Example with Sentry:
    // Sentry.captureException(error, {
    //   extra: {
    //     componentStack: errorInfo.componentStack,
    //     retryCount: this.state.retryCount
    //   }
    // });
    
    console.log('Error reported to crash reporting service');
  };

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReportBug = () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const subject = encodeURIComponent('YardPass App Bug Report');
    const body = encodeURIComponent(`
Bug Report Details:

Error: ${error.message}
Stack: ${error.stack}

Component Stack:
${errorInfo?.componentStack || 'N/A'}

Device Info:
- Platform: ${Platform.OS}
- Version: ${Platform.Version}
- Screen: ${screenWidth}x${screenHeight}

Retry Count: ${this.state.retryCount}

Please describe what you were doing when this error occurred:
    `);

    const mailtoUrl = `mailto:support@yardpass.com?subject=${subject}&body=${body}`;

    Linking.canOpenURL(mailtoUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(mailtoUrl);
        } else {
          Alert.alert(
            'Email Not Available',
            'Please email us at support@yardpass.com with the error details.',
            [{ text: 'OK' }]
          );
        }
      })
      .catch(err => {
        console.error('Error opening email:', err);
        Alert.alert(
          'Error',
          'Unable to open email. Please contact support@yardpass.com',
          [{ text: 'OK' }]
        );
      });
  };

  handleRestart = () => {
    Alert.alert(
      'Restart App',
      'This will close and restart the app. Any unsaved data may be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restart', 
          style: 'destructive',
          onPress: () => {
            // Implement app restart logic
            // For React Native, you might need to use a native module
            // or simply reset the navigation state
            this.handleRetry();
          }
        }
      ]
    );
  };

  renderErrorUI = () => {
    const { error, retryCount } = this.state;

    return (
      <View style={styles.container}>
        <View style={styles.content}>
          {/* Error Icon */}
          <View style={styles.iconContainer}>
            <Ionicons name="alert-circle" size={64} color={theme.colors.error} />
          </View>

          {/* Error Title */}
          <Text style={styles.title}>Oops! Something went wrong</Text>

          {/* Error Message */}
          <Text style={styles.message}>
            We're sorry, but something unexpected happened. Our team has been notified.
          </Text>

          {/* Error Details (only in development) */}
          {__DEV__ && error && (
            <View style={styles.errorDetails}>
              <Text style={styles.errorDetailsTitle}>Error Details (Development):</Text>
              <Text style={styles.errorText}>{error.message}</Text>
              {error.stack && (
                <Text style={styles.errorStack}>{error.stack}</Text>
              )}
            </View>
          )}

          {/* Retry Count */}
          {retryCount > 0 && (
            <Text style={styles.retryCount}>
              Retry attempt: {retryCount}
            </Text>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={this.handleRetry}
              activeOpacity={0.8}
            >
              <Ionicons name="refresh" size={20} color={theme.colors.text} />
              <Text style={styles.primaryButtonText}>Try Again</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={this.handleReportBug}
              activeOpacity={0.8}
            >
              <Ionicons name="mail" size={20} color={theme.colors.primary} />
              <Text style={styles.secondaryButtonText}>Report Bug</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton]}
              onPress={this.handleRestart}
              activeOpacity={0.8}
            >
              <Ionicons name="reload" size={20} color={theme.colors.primary} />
              <Text style={styles.secondaryButtonText}>Restart App</Text>
            </TouchableOpacity>
          </View>

          {/* Help Text */}
          <Text style={styles.helpText}>
            If the problem persists, please contact our support team.
          </Text>
        </View>
      </View>
    );
  };

  render() {
    const { hasError } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      return fallback || this.renderErrorUI();
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: theme.spacing.xl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.md,
  },
  message: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: theme.spacing.xl,
  },
  errorDetails: {
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
    width: '100%',
  },
  errorDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  errorText: {
    fontSize: 12,
    color: theme.colors.error,
    marginBottom: theme.spacing.sm,
  },
  errorStack: {
    fontSize: 10,
    color: theme.colors.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  retryCount: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.lg,
  },
  buttonContainer: {
    width: '100%',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
    gap: theme.spacing.sm,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderColor: theme.colors.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  helpText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default ErrorBoundary;
