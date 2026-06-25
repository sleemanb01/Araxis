import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInventory } from '../context/InventoryContext';
import { useUser } from '../context/UserContext';
import { adjustQuantity } from '../services/inventoryService';
import { InventoryItem, isLowStock, qtyAt, WAREHOUSE } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function WarehouseScreen() {
  const navigation = useNavigation<Nav>();
  const { items } = useInventory();
  const { caps } = useUser();
  const canEdit = caps.manageInventory;
  const [query, setQuery] = useState('');

  const lowCount = useMemo(() => items.filter(isLowStock).length, [items]);
  const visible = useMemo(() => {
    const q = query.trim();
    return q ? items.filter((i) => i.itemName.includes(q)) : items;
  }, [items, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <InventoryRow
            item={item}
            canEdit={canEdit}
            onEdit={() => navigation.navigate('ItemEditor', { itemId: item.id })}
          />
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>מחסן וציוד</Text>
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>סה״כ פריטים</Text>
                <Text style={styles.metricValue}>{items.length}</Text>
              </View>
              <View style={[styles.metric, styles.metricWarn]}>
                <Text style={[styles.metricLabel, styles.metricWarnText]}>מלאי נמוך</Text>
                <Text style={[styles.metricValue, styles.metricWarnText]}>{lowCount}</Text>
              </View>
            </View>

            {canEdit && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ItemEditor', {})} activeOpacity={0.85}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addText}>פריט חדש</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loadBtn} onPress={() => navigation.navigate('Transfer')} activeOpacity={0.85}>
                  <Ionicons name="car-outline" size={20} color={Colors.primary} />
                  <Text style={styles.loadText}>טען לרכב</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.searchRow}>
              <Ionicons name="search" size={17} color={Colors.textSecondary} />
              <TextInput
                style={styles.search}
                placeholder="חיפוש לפי שם…"
                placeholderTextColor={Colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                textAlign="right"
              />
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין פריטים להצגה.</Text>}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function InventoryRow({
  item,
  canEdit,
  onEdit,
}: {
  item: InventoryItem;
  canEdit: boolean;
  onEdit: () => void;
}) {
  const low = isLowStock(item);
  const breakdown = Object.entries(item.locations)
    .filter(([, n]) => n > 0)
    .map(([loc, n]) => `${loc} ${n}`)
    .join(' · ');

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowInfo} onPress={onEdit} activeOpacity={0.7}>
        <Text style={styles.rowName} numberOfLines={1}>{item.itemName}</Text>
        <View style={styles.rowMeta}>
          {low && (
            <View style={styles.lowTag}>
              <Ionicons name="alert-circle-outline" size={12} color="#A32D2D" />
              <Text style={styles.lowText}>מלאי נמוך</Text>
            </View>
          )}
          <Text style={styles.split}>{breakdown || 'אין מלאי'}</Text>
        </View>
      </TouchableOpacity>

      {canEdit && (
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => qtyAt(item, WAREHOUSE) > 0 && adjustQuantity(item.id, WAREHOUSE, -1)}
          >
            <Ionicons name="remove" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepQty, low && { color: '#A32D2D' }]}>{qtyAt(item, WAREHOUSE)}</Text>
          <TouchableOpacity
            style={[styles.stepBtn, styles.stepBtnPlus]}
            onPress={() => adjustQuantity(item.id, WAREHOUSE, 1)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.tabBarHeight + 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', paddingTop: 10, paddingBottom: 12 },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metric: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12 },
  metricWarn: { backgroundColor: '#FAEEDA' },
  metricLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 3 },
  metricWarnText: { color: '#854F0B' },
  metricValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  addBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  addText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  loadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 16,
  },
  loadText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  search: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  rowInfo: { flex: 1, minWidth: 0, marginEnd: 10, gap: 5 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  lowTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FCEBEB',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  lowText: { fontSize: 11, color: '#A32D2D', fontWeight: '500' },
  split: { fontSize: 12, color: Colors.textSecondary },
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
  stepQty: { fontSize: 16, fontWeight: '700', minWidth: 22, textAlign: 'center', color: Colors.textPrimary },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
