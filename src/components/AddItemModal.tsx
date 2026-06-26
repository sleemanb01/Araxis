import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from './CustomButton';
import { TextField } from './TextField';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { useInventory } from '../context/InventoryContext';
import { createInventoryItem } from '../services/inventoryService';
import { WAREHOUSE } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

/**
 * Add an inventory item: type a name/barcode (with live suggestions from the
 * warehouse) or scan. An exact match adds the existing item; otherwise a new
 * (missing) item is created. Returns the resulting item id via onAdded.
 */
export function AddItemModal({
  visible,
  onClose,
  onAdded,
}: {
  visible: boolean;
  onClose: () => void;
  onAdded: (itemId: string) => void | Promise<void>;
}) {
  const { items } = useInventory();
  const [name, setName] = useState('');
  const [barcode, setBarcode] = useState('');
  const [scanOpen, setScanOpen] = useState(false);

  function close() {
    setName('');
    setBarcode('');
    setScanOpen(false);
    onClose();
  }

  const existing = useMemo(() => {
    const bc = barcode.trim();
    const nm = name.trim();
    return items.find((i) => (!!bc && i.barcode === bc) || (!!nm && i.itemName === nm)) ?? null;
  }, [items, name, barcode]);

  const suggestions = useMemo(() => {
    const nm = name.trim();
    const bc = barcode.trim();
    if (!nm && !bc) return [];
    return items
      .filter((i) => (!!nm && i.itemName.includes(nm)) || (!!bc && (i.barcode ?? '').includes(bc)))
      .slice(0, 6);
  }, [items, name, barcode]);

  function onScan(code: string) {
    setScanOpen(false);
    setBarcode(code);
    const ex = items.find((i) => i.barcode === code);
    if (ex) setName(ex.itemName);
  }

  async function add() {
    try {
      let id: string;
      if (existing) id = existing.id;
      else {
        if (!name.trim()) return;
        id = await createInventoryItem({
          itemName: name.trim(),
          ...(barcode.trim() ? { barcode: barcode.trim() } : {}),
          lacks: true,
          locations: { [WAREHOUSE]: 0 },
        });
      }
      await onAdded(id);
      close();
    } catch {
      Alert.alert('שגיאה', 'הוספת הפריט נכשלה.');
    }
  }

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.bg}>
          <View style={styles.card}>
            <Text style={styles.title}>הוספת פריט</Text>
            <TextField label="שם הפריט" value={name} onChange={setName} placeholder="לדוגמה: מצלמה" />
            <View style={styles.barcodeRow}>
              <View style={styles.barcodeField}>
                <TextField label="ברקוד" value={barcode} onChange={setBarcode} placeholder="סרוק או הזן" />
              </View>
              <TouchableOpacity style={styles.scanBtn} onPress={() => setScanOpen(true)} activeOpacity={0.85}>
                <Ionicons name="barcode-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {!existing && suggestions.length > 0 && (
              <View style={styles.suggBox}>
                {suggestions.map((it) => (
                  <TouchableOpacity
                    key={it.id}
                    style={styles.suggRow}
                    onPress={() => {
                      setName(it.itemName);
                      setBarcode(it.barcode ?? '');
                    }}
                  >
                    <Text style={styles.suggText} numberOfLines={1}>
                      {it.itemName}{it.barcode ? ` · ${it.barcode}` : ''}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {existing && <Text style={styles.sub}>פריט קיים: {existing.itemName} — יתווסף הקיים.</Text>}

            <CustomButton
              label="הוסף פריט"
              onPress={add}
              disabled={!existing && !name.trim()}
              style={styles.btn}
            />
            <CustomButton label="ביטול" variant="ghost" onPress={close} />
          </View>
        </View>
      </Modal>

      <BarcodeScannerModal visible={scanOpen} onClose={() => setScanOpen(false)} onScanned={onScan} />
    </>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  card: { backgroundColor: Colors.background, borderRadius: 14, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  barcodeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  barcodeField: { flex: 1 },
  scanBtn: { width: 48, height: 48, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  suggBox: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, overflow: 'hidden', marginBottom: 10 },
  suggRow: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  suggText: { fontSize: 14, color: Colors.textPrimary, textAlign: 'right' },
  btn: { marginTop: 8 },
});
