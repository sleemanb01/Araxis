import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { useInventory } from '../context/InventoryContext';
import { createInventoryItem, updateInventoryItem } from '../services/inventoryService';
import { qtyAt, WAREHOUSE } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'ItemEditor'>;

export function ItemEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { items } = useInventory();
  const existing = route.params?.itemId
    ? items.find((i) => i.id === route.params!.itemId)
    : undefined;

  const [name, setName] = useState(existing?.itemName ?? '');
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
    setSaving(true);
    try {
      if (existing) {
        await updateInventoryItem(existing.id, {
          itemName: name.trim(),
          locations: { ...existing.locations, [WAREHOUSE]: qty },
        });
      } else {
        await createInventoryItem({ itemName: name.trim(), locations: { [WAREHOUSE]: qty } });
      }
      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'השמירה נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{existing ? 'עריכת פריט' : 'פריט חדש'}</Text>
        <TextField label="שם הפריט" value={name} onChange={setName} placeholder="לדוגמה: מצלמת Dahua PTZ 4MP" />
        <TextField label="כמות במחסן" value={warehouseQty} onChange={setWarehouseQty} placeholder="0" keyboardType="numeric" />
        {existing && <Text style={styles.note}>מלאי במיקומים אחרים מתעדכן דרך מסך ההעברה.</Text>}
        <CustomButton label="שמור" onPress={save} loading={saving} style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 16 },
  note: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  btn: { marginTop: 12 },
});
