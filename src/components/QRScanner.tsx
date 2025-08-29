import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Camera, BarCodeScanner } from 'expo-camera';
import { useApiGateway } from '../services/api';

interface QRScannerProps {
  eventId: string;
  onScanSuccess: (result: any) => void;
  onScanError: (error: string) => void;
  onClose: () => void;
  isVisible: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({
  eventId,
  onScanSuccess,
  onScanError,
  onClose,
  isVisible,
}) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const apiGateway = useApiGateway();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }: { data: string }) => {
    if (scanned) return;
    setScanned(true);

    try {
      const response = await apiGateway.post('/functions/v1/scan-ticket', {
        qr_code: data,
        event_id: eventId
      });

      if (response.success) {
        onScanSuccess(response.data);
        Alert.alert('Success', 'Ticket scanned!');
      } else {
        throw new Error(response.error);
      }
    } catch (error: any) {
      onScanError(error.message);
      Alert.alert('Error', error.message);
    }
  };

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <Camera
        style={styles.camera}
        onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        barCodeScannerSettings={{
          barCodeTypes: [BarCodeScanner.Constants.BarCodeType.qr],
        }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
          <View style={styles.scanFrame} />
          <TouchableOpacity 
            onPress={() => setScanned(false)}
            style={styles.scanButton}
          >
            <Text style={styles.scanButtonText}>Scan Again</Text>
          </TouchableOpacity>
        </View>
      </Camera>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  camera: { flex: 1 },
  overlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'space-between',
    padding: 20
  },
  closeButton: { alignSelf: 'flex-end' },
  closeText: { color: 'white', fontSize: 18 },
  scanFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#007AFF',
    alignSelf: 'center'
  },
  scanButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignSelf: 'center'
  },
  scanButtonText: { color: 'white', fontSize: 16 }
});
