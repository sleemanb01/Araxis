import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomButton } from '../components/CustomButton';
import { Colors } from '../constants/colors';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ScanScreen() {
  const navigation = useNavigation<Nav>();
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  function handleScanned(data: string) {
    const code = data?.trim();
    if (!code || scannedRef.current) return;
    scannedRef.current = true; // ignore the rapid follow-up frames
    navigation.replace('ItemEditor', { barcode: code });
  }

  // Permission status still loading.
  if (!permission) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.msg}>טוען מצלמה...</Text>
      </SafeAreaView>
    );
  }

  // Not granted — ask, or send to Settings if permanently denied.
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.title}>נדרשת גישה למצלמה</Text>
        <Text style={styles.msg}>כדי לסרוק ברקודים של פריטים יש לאשר גישה למצלמה.</Text>
        {permission.canAskAgain ? (
          <CustomButton
            label="אפשר גישה למצלמה"
            onPress={requestPermission}
            style={{ marginTop: 20, alignSelf: 'stretch' }}
          />
        ) : (
          <CustomButton
            label="פתח הגדרות"
            onPress={() => Linking.openSettings()}
            style={{ marginTop: 20, alignSelf: 'stretch' }}
          />
        )}
        <CustomButton
          label="חזור"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 4, alignSelf: 'stretch' }}
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.flex}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
        }}
        onBarcodeScanned={({ data }) => handleScanned(data)}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <Text style={styles.hint}>כוון את המצלמה לברקוד</Text>
        <View style={styles.frame} />
        <TouchableOpacity style={styles.cancel} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelText}>ביטול</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#000' },
  center: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  msg: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 40,
  },
  hint: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },
  cancel: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  cancelText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
