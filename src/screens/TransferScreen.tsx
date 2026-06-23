import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useInventoryStore } from '../store/useInventoryStore';
import { useShallow } from 'zustand/react/shallow';
import { InventoryItem } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export function TransferScreen() {
  const navigation = useNavigation();
  const items = useInventoryStore(useShallow((s) => s.itemsAt('warehouse')));
  const transfer = useInventoryStore((s) => s.transfer);
  const [moves, setMoves] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const totalUnits = Object.values(moves).reduce((s, n) => s + n, 0);

  function setQty(item: InventoryItem, next: number) {
    const clamped = Math.max(0, Math.min(next, item.warehouseQty));
    setMoves((m) => ({ ...m, [item.id]: clamped }));
  }

  async function handleTransfer() {
    const entries = Object.entries(moves).filter(([, n]) => n > 0);
    if (entries.length === 0) return;
    setSaving(true);
    try {
      await Promise.all(entries.map(([id, n]) => transfer(id, n, 'toVehicle')));
      navigation.goBack();
    } catch (e) {
      console.warn('[transfer] failed:', e);
      Alert.alert('שגיאה', 'ההעברה נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        ListHeaderComponent={
          <Text style={styles.hint}>בחר כמה יחידות להעביר מהמחסן לרכב</Text>
        }
        renderItem={({ item }) => {
          const qty = moves[item.id] ?? 0;
          const active = qty > 0;
          return (
            <View style={[styles.row, active && styles.rowActive]}>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.sub}>
                  במחסן: {item.warehouseQty} · ברכב: {item.vehicleQty}
                </Text>
              </View>
              <View style={styles.stepper}>
                <TouchableOpacity style={styles.stepBtn} onPress={() => setQty(item, qty - 1)}>
                  <Ionicons name="remove" size={16} color={Colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.qty, active && { color: Colors.primary }]}>{qty}</Text>
                <TouchableOpacity
                  style={[styles.stepBtn, styles.stepBtnPlus]}
                  onPress={() => setQty(item, qty + 1)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>אין פריטים במחסן להעברה.</Text>}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.transferBtn, totalUnits === 0 && styles.transferBtnDisabled]}
          onPress={handleTransfer}
          disabled={totalUnits === 0 || saving}
          activeOpacity={0.85}
        >
          <Ionicons name="car" size={19} color="#FFFFFF" />
          <Text style={styles.transferText}>
            {totalUnits > 0 ? `העבר ${totalUnits} יחידות לרכב` : 'בחר פריטים להעברה'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Layout.screenPadding, paddingBottom: 24 },
  hint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 13,
    marginBottom: 10,
  },
  rowActive: { borderColor: Colors.primary },
  info: { flex: 1, minWidth: 0, marginEnd: 10 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  sub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 3 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnPlus: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  qty: { fontSize: 16, fontWeight: '700', minWidth: 18, textAlign: 'center', color: Colors.textPrimary },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 40, fontSize: 15 },
  footer: {
    padding: Layout.screenPadding,
    paddingBottom: 18,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  transferBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
  },
  transferBtnDisabled: { opacity: 0.5 },
  transferText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
