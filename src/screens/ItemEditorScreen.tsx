import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { useInventory } from '../context/InventoryContext';
import { useUser } from '../context/UserContext';
import { createInventoryItem, updateInventoryItem, deleteInventoryItem } from '../services/inventoryService';
import { qtyAt, WAREHOUSE } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'ItemEditor'>;

export function ItemEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { items } = useInventory();
  const { caps } = useUser();
  const existing = route.params?.itemId
    ? items.find((i) => i.id === route.params!.itemId)
    : undefined;

  const [name, setName] = useState(existing?.itemName ?? '');
  const [barcode, setBarcode] = useState(existing?.barcode ?? '');
  const [price, setPrice] = useState(existing?.price != null ? String(existing.price) : '');
  const [customerPrice, setCustomerPrice] = useState(
    existing?.customerPrice != null ? String(existing.customerPrice) : ''
  );
  const [scannerOpen, setScannerOpen] = useState(false);
  const [warehouseQty, setWarehouseQty] = useState(
    String(existing ? qtyAt(existing, WAREHOUSE) : 0)
  );
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם פריט.');
      return;
    }
    const qty = Math.max(0, parseInt(warehouseQty, 10) || 0);
    const code = barcode.trim();
    const priceN = Math.max(0, parseFloat(price) || 0);
    const customerPriceN = Math.max(0, parseFloat(customerPrice) || 0);
    setSaving(true);
    try {
      if (existing) {
        await updateInventoryItem(existing.id, {
          itemName: name.trim(),
          barcode: code, // '' clears it
          locations: { ...existing.locations, [WAREHOUSE]: qty },
          ...(existing.lacks && qty > 0 ? { lacks: false } : {}), // restocked → clear "lacks"
          ...(caps.viewFinancials ? { price: priceN, customerPrice: customerPriceN } : {}),
        });
      } else {
        await createInventoryItem({
          itemName: name.trim(),
          locations: { [WAREHOUSE]: qty },
          ...(code ? { barcode: code } : {}), // omit empty on create
          ...(caps.viewFinancials ? { price: priceN, customerPrice: customerPriceN } : {}),
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'השמירה נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!existing) return;
    Alert.alert('מחיקת פריט', `למחוק את "${existing.itemName}"? פעולה זו אינה ניתנת לביטול.`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteInventoryItem(existing.id);
            navigation.goBack();
          } catch {
            Alert.alert('שגיאה', 'המחיקה נכשלה.');
          }
        },
      },
    ]);
  }

  const costNum = parseFloat(price) || 0;
  const custNum = parseFloat(customerPrice) || 0;
  const unitProfit = custNum - costNum;
  const profitPct = costNum > 0 ? Math.round((custNum / costNum) * 100) : 0;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{existing ? 'עריכת פריט' : 'פריט חדש'}</Text>
        <TextField label="שם הפריט" value={name} onChange={setName} placeholder="לדוגמה: מצלמת Dahua PTZ 4MP" />

        <TextField label="ברקוד" value={barcode} onChange={setBarcode} placeholder="סרוק או הזן ידנית" />
        <CustomButton
          label="סרוק ברקוד"
          variant="secondary"
          onPress={() => setScannerOpen(true)}
          icon={<Ionicons name="barcode-outline" size={18} color={Colors.primary} />}
          style={styles.scanBtn}
        />

        {caps.viewFinancials && (
          <>
            <TextField label="מחיר עלות ליחידה (₪)" value={price} onChange={setPrice} placeholder="0" keyboardType="numeric" />
            <TextField label="מחיר ללקוח (₪)" value={customerPrice} onChange={setCustomerPrice} placeholder="0" keyboardType="numeric" />
            <View style={styles.profitRow}>
              <Text style={styles.customerHint}>₪{unitProfit.toLocaleString('he-IL')}</Text>
              {costNum > 0 && <Text style={styles.profitPct}>{profitPct}%</Text>}
            </View>
          </>
        )}

        <TextField label="כמות במחסן" value={warehouseQty} onChange={setWarehouseQty} placeholder="0" keyboardType="numeric" />
        {existing && <Text style={styles.note}>מלאי במיקומים אחרים מתעדכן דרך מסך ההעברה.</Text>}
        <CustomButton label="שמור" onPress={save} loading={saving} style={styles.btn} />
        {existing && caps.manageInventory && (
          <CustomButton label="מחק פריט" variant="danger" onPress={confirmDelete} style={styles.deleteBtn} />
        )}
      </ScrollView>

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={setBarcode}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 16 },
  note: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  scanBtn: { marginTop: -6, marginBottom: 18 },
  profitRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: -4, marginBottom: 12 },
  customerHint: { fontSize: 13, color: '#1E9E5A', fontWeight: '700' },
  profitPct: { fontSize: 13, color: '#2563EB', fontWeight: '700' },
  btn: { marginTop: 12 },
  deleteBtn: { marginTop: 24 },
});
