import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Colors } from '../constants/colors';

/** Full-screen camera modal that scans a single barcode and returns its value. */
export function BarcodeScannerModal({
  visible,
  onClose,
  onScanned,
}: {
  visible: boolean;
  onClose: () => void;
  onScanned: (code: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [locked, setLocked] = useState(false);

  // Re-arm the one-shot lock each time the modal opens.
  useEffect(() => {
    if (visible) setLocked(false);
  }, [visible]);

  function handleScan(result: BarcodeScanningResult) {
    if (locked || !result.data) return;
    setLocked(true); // ignore the rapid follow-up frames
    onScanned(result.data.trim());
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.fill}>
        {!permission ? null : !permission.granted ? (
          <View style={styles.center}>
            <Text style={styles.msg}>נדרשת הרשאת מצלמה כדי לסרוק ברקוד.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
              <Text style={styles.primaryText}>אפשר גישה למצלמה</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancel}>ביטול</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CameraView
            style={styles.fill}
            facing="back"
            barcodeScannerSettings={{
              barcodeTypes: [
                'ean13',
                'ean8',
                'upc_a',
                'upc_e',
                'code128',
                'code39',
                'code93',
                'itf14',
                'codabar',
                'qr',
              ],
            }}
            onBarcodeScanned={locked ? undefined : handleScan}
          >
            <View style={styles.overlay}>
              <View style={styles.frame} />
              <Text style={styles.hint}>כוון את המצלמה אל הברקוד</Text>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.primaryText}>ביטול</Text>
              </TouchableOpacity>
            </View>
          </CameraView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16, backgroundColor: Colors.background },
  msg: { fontSize: 15, color: Colors.textPrimary, textAlign: 'center' },
  primaryBtn: { backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 13, paddingHorizontal: 24 },
  primaryText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  cancel: { color: Colors.textSecondary, fontSize: 15 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 260,
    height: 170,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 14,
    backgroundColor: 'transparent',
  },
  hint: { marginTop: 22, color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  cancelBtn: {
    position: 'absolute',
    bottom: 48,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
});
