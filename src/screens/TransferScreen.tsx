import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { useInventory } from '../context/InventoryContext';
import { useUser } from '../context/UserContext';
import { transfer } from '../services/inventoryService';
import { InventoryItem, qtyAt, WAREHOUSE, crewLocation } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'Transfer'>;

export function TransferScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { items } = useInventory();
  const { crews } = useUser();
  const [crewId, setCrewId] = useState<string>(route.params?.crewId ?? crews[0]?.id ?? '');
  const [moves, setMoves] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);

  const available = items.filter((i) => qtyAt(i, WAREHOUSE) > 0);
  const totalUnits = Object.values(moves).reduce((s, n) => s + n, 0);

  function setQty(item: InventoryItem, next: number) {
    const clamped = Math.max(0, Math.min(next, qtyAt(item, WAREHOUSE)));
    setMoves((m) => ({ ...m, [item.id]: clamped }));
  }

  async function commit() {
    if (!crewId) {
      Alert.alert('שגיאה', 'יש לבחור צוות.');
      return;
    }
    const dest = crewLocation(crewId);
    setSaving(true);
    try {
      await Promise.all(
        Object.entries(moves)
          .filter(([, n]) => n > 0)
          .map(([id, n]) => transfer(id, n, WAREHOUSE, dest))
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
            <Text style={styles.title}>משיכת ציוד לצוות</Text>
            {crews.length === 0 ? (
              <Text style={styles.empty}>אינך חבר באף צוות.</Text>
            ) : (
              <View style={styles.chips}>
                {crews.map((c) => {
                  const on = c.id === crewId;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[styles.chip, on && styles.chipOn]}
                      onPress={() => setCrewId(c.id)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.chipText, on && styles.chipTextOn]}>{c.name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין מלאי במחסן למשיכה.</Text>}
        contentContainerStyle={styles.list}
      />
      <View style={styles.footer}>
        <CustomButton
          label={`משוך ${totalUnits} פריטים`}
          onPress={commit}
          loading={saving}
          disabled={totalUnits === 0 || !crewId}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.textPrimary },
  chipTextOn: { color: '#FFFFFF', fontWeight: '600' },
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
