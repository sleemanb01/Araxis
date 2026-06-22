import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInventoryStore } from '../store/useInventoryStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { InventoryItem, ItemLocation, isLowStock, qtyAt } from '../types/inventory';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Filter = 'all' | ItemLocation;

export function WarehouseScreen() {
  const navigation = useNavigation<Nav>();
  const items = useInventoryStore((s) => s.items);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const lowCount = useMemo(() => items.filter(isLowStock).length, [items]);
  const counts = useMemo(
    () => ({
      all: items.length,
      warehouse: items.filter((i) => i.warehouseQty > 0).length,
      vehicle: items.filter((i) => i.vehicleQty > 0).length,
    }),
    [items]
  );

  const visible = useMemo(() => {
    const byLoc =
      filter === 'all' ? items : items.filter((i) => qtyAt(i, filter) > 0);
    const q = query.trim();
    if (!q) return byLoc;
    return byLoc.filter(
      (i) => i.name.includes(q) || i.barcode.includes(q) || i.category.includes(q)
    );
  }, [items, filter, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <InventoryRow
            item={item}
            filter={filter}
            onEdit={() => navigation.navigate('ItemEditor', { barcode: item.barcode })}
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

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.scanBtn}
                onPress={() => navigation.navigate('Scan')}
                activeOpacity={0.85}
              >
                <Ionicons name="barcode-outline" size={20} color="#FFFFFF" />
                <Text style={styles.scanText}>סרוק פריט</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.loadBtn}
                onPress={() => navigation.navigate('Transfer')}
                activeOpacity={0.85}
              >
                <Ionicons name="car-outline" size={20} color={Colors.primary} />
                <Text style={styles.loadText}>טען לרכב</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search" size={17} color={Colors.textSecondary} />
              <TextInput
                style={styles.search}
                placeholder="חיפוש לפי שם, ברקוד או קטגוריה…"
                placeholderTextColor={Colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                textAlign="right"
              />
            </View>

            <View style={styles.segment}>
              {(['all', 'warehouse', 'vehicle'] as Filter[]).map((f) => {
                const active = filter === f;
                const label =
                  f === 'all' ? 'הכל' : f === 'warehouse' ? 'מחסן' : 'רכב';
                return (
                  <TouchableOpacity
                    key={f}
                    style={[styles.segBtn, active && styles.segBtnActive]}
                    onPress={() => setFilter(f)}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>
                      {label} · {counts[f]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
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
  filter,
  onEdit,
}: {
  item: InventoryItem;
  filter: Filter;
  onEdit: () => void;
}) {
  const adjust = useInventoryStore((s) => s.adjust);
  const low = isLowStock(item);
  const stepperLoc: ItemLocation | null =
    filter === 'warehouse' ? 'warehouse' : filter === 'vehicle' ? 'vehicle' : null;

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowInfo} onPress={onEdit} activeOpacity={0.7}>
        <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.rowMeta}>
          {!!item.category && (
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.category}</Text>
            </View>
          )}
          {low && (
            <View style={styles.lowTag}>
              <Ionicons name="alert-circle-outline" size={12} color="#A32D2D" />
              <Text style={styles.lowText}>מלאי נמוך</Text>
            </View>
          )}
          {filter === 'all' && (
            <Text style={styles.split}>
              מחסן {item.warehouseQty} · רכב {item.vehicleQty}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {stepperLoc && (
        <View style={styles.stepper}>
          <TouchableOpacity
            style={styles.stepBtn}
            onPress={() => qtyAt(item, stepperLoc) > 0 && adjust(item.id, stepperLoc, -1)}
          >
            <Ionicons name="remove" size={16} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.stepQty, low && { color: '#A32D2D' }]}>
            {qtyAt(item, stepperLoc)}
          </Text>
          <TouchableOpacity
            style={[styles.stepBtn, styles.stepBtnPlus]}
            onPress={() => adjust(item.id, stepperLoc, 1)}
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    paddingTop: 10,
    paddingBottom: 12,
  },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metric: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12 },
  metricWarn: { backgroundColor: '#FAEEDA' },
  metricLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 3 },
  metricWarnText: { color: '#854F0B' },
  metricValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  scanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 13,
  },
  scanText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
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
    marginBottom: 12,
  },
  search: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  segment: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: 999,
    padding: 4,
    marginBottom: 14,
  },
  segBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 999 },
  segBtnActive: { backgroundColor: Colors.primary },
  segText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  segTextActive: { color: '#FFFFFF' },
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
  tag: { backgroundColor: Colors.background, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11, color: Colors.textSecondary },
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
