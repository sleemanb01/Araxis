import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { useInventory } from '../context/InventoryContext';
import { transfer } from '../services/inventoryService';
import { InventoryItem, qtyAt, WAREHOUSE } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export function TransferScreen() {
  const navigation = useNavigation();
  const { items } = useInventory();
  const [dest, setDest] = useState('car_alpha');
  const [moves, setMoves] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const available = items.filter((i) => qtyAt(i, WAREHOUSE) > 0);
  const totalUnits = Object.values(moves).reduce((s, n) => s + n, 0);

  function setQty(item: InventoryItem, next: number) {
    const clamped = Math.max(0, Math.min(next, qtyAt(item, WAREHOUSE)));
    setMoves((m) => ({ ...m, [item.id]: clamped }));
  }

  async function commit() {
    const d = dest.trim();
    if (!d) {
      Alert.alert('שגיאה', 'יש לבחור יעד (רכב).');
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(moves)
          .filter(([, n]) => n > 0)
          .map(([id, n]) => transfer(id, n, WAREHOUSE, d))
      );
      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'ההעברה נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={available}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => {
          const qty = moves[item.id] ?? 0;
          return (
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.itemName}</Text>
                <Text style={styles.avail}>במחסן: {qtyAt(item, WAREHOUSE)}</Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(item, qty - 1)}>
                  <Ionicons name="remove" size={16} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.qty}>{qty}</Text>
                <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus]} onPress={() => setQty(item, qty + 1)}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>העברת ציוד לרכב</Text>
            <TextField label="יעד (מזהה רכב)" value={dest} onChange={setDest} placeholder="car_alpha" />
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין מלאי במחסן להעברה.</Text>}
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <CustomButton
          label={`העבר ${totalUnits} פריטים`}
          onPress={commit}
          loading={saving}
          disabled={totalUnits === 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },
  info: { flex: 1, minWidth: 0, marginEnd: 10 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  avail: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  stepBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPlus: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  qty: { fontSize: 16, fontWeight: '700', minWidth: 22, textAlign: 'center', color: Colors.textPrimary },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
  footer: { padding: Layout.screenPadding, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
});
