import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  Animated,
} from 'react-native';
import { Camera, CameraType } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../constants/theme';

const { width, height } = Dimensions.get('window');

interface QRScannerProps {
  onQRCodeScanned: (qrCode: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

const QRScanner: React.FC<QRScannerProps> = ({ 
  onQRCodeScanned, 
  onClose, 
  title = 'Scan QR Code',
  subtitle = 'Point your camera at a ticket QR code'
}) => {
  const { currentTheme } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [scannedCodes, setScannedCodes] = useState<Set<string>>(new Set());
  
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (isScanning) {
      const scanAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnimation, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false,
          }),
          Animated.timing(scanLineAnimation, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false,
          }),
        ])
      );
      scanAnimation.start();

      return () => scanAnimation.stop();
    }
  }, [isScanning, scanLineAnimation]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (!isScanning || scannedCodes.has(data)) return;

    setIsScanning(false);
    setScannedCodes(prev => new Set(prev).add(data));

    // Visual feedback
    Animated.sequence([
      Animated.timing(fadeAnimation, {
        toValue: 0.5,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback (if available)
    if (Platform.OS === 'ios') {
      // In a real app, you'd use expo-haptics here
      // Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Process the QR code
    onQRCodeScanned(data);
  };

  const resetScanner = () => {
    setIsScanning(true);
    setScannedCodes(new Set());
  };

  const toggleFlash = async () => {
    // Flash toggle functionality would be implemented here
    Alert.alert('Flash', 'Flash toggle functionality will be available soon');
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={theme.colors.textSecondary} />
          <Text style={[styles.permissionText, { color: theme.colors.text }]}>
            Requesting camera permission...
          </Text>
        </View>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color="#FF3B30" />
          <Text style={[styles.permissionText, { color: theme.colors.text }]}>
            Camera access is required to scan QR codes
          </Text>
          <Text style={[styles.permissionSubtext, { color: theme.colors.textSecondary }]}>
            Please enable camera permissions in your device settings
          </Text>
          <TouchableOpacity
            style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.permissionButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        type={CameraType.back}
        barCodeScannerSettings={{
          barCodeTypes: ['qr'],
        }}
        onBarCodeScanned={handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={24} color={theme.colors.white} />
            </TouchableOpacity>
            
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>{title}</Text>
              <Text style={styles.headerSubtitle}>{subtitle}</Text>
            </View>

            <TouchableOpacity
              style={styles.flashButton}
              onPress={toggleFlash}
              activeOpacity={0.7}
            >
              <Ionicons name="flash-outline" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </View>

          {/* Scanning Area */}
          <View style={styles.scanningArea}>
            <View style={styles.scanningFrame}>
              {/* Corner indicators */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />

              {/* Scanning line */}
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    transform: [{
                      translateY: scanLineAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 200], // Adjust based on frame size
                      }),
                    }],
                    opacity: fadeAnimation,
                  },
                ]}
              />

              {/* Scanning instructions */}
              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsText}>
                  Position the QR code within the frame
                </Text>
              </View>
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            {!isScanning && (
              <TouchableOpacity
                style={[styles.rescanButton, { backgroundColor: theme.colors.primary }]}
                onPress={resetScanner}
                activeOpacity={0.8}
              >
                <Ionicons name="refresh" size={20} color={theme.colors.white} />
                <Text style={styles.rescanButtonText}>Scan Again</Text>
              </TouchableOpacity>
            )}

            <View style={styles.helpContainer}>
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.white} />
              <Text style={styles.helpText}>
                Having trouble? Make sure the QR code is well-lit and clearly visible
              </Text>
            </View>
          </View>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  headerTitle: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: theme.colors.white,
    fontSize: 14,
    opacity: 0.8,
    textAlign: 'center',
  },
  flashButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: theme.colors.primary,
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: theme.colors.primary,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 8,
  },
  instructionsContainer: {
    position: 'absolute',
    bottom: -60,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    color: theme.colors.white,
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.9,
  },
  bottomControls: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
  },
  rescanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginBottom: 20,
    gap: 8,
  },
  rescanButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    gap: 10,
  },
  helpText: {
    color: theme.colors.white,
    fontSize: 14,
    opacity: 0.8,
    flex: 1,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  permissionSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
  },
  permissionButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default QRScanner;


