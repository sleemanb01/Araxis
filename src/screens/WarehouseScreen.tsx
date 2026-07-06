import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInventory } from '../context/InventoryContext';
import { useUser } from '../context/UserContext';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { StockRulesModal } from '../components/StockRulesModal';
import { SuppliersModal } from '../components/SuppliersModal';
import { SupplierOrderModal } from '../components/SupplierOrderModal';
import { subscribeToSuppliers } from '../services/supplierService';
import { dialPhone, openWhatsapp } from '../utils/contact';
import { Supplier } from '../types/supplier';
import { adjustQuantity } from '../services/inventoryService';
import { InventoryItem, isLowStock, qtyAt, WAREHOUSE, ItemCategory, CATEGORY_HE } from '../types/inventory';
import { locationLabel } from '../utils/locationLabel';
import { containsCI } from '../utils/format';
import { Crew } from '../types/crew';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function WarehouseScreen() {
  const navigation = useNavigation<Nav>();
  const { items } = useInventory();
  const { caps, crews } = useUser();
  const canEdit = caps.manageInventory;
  const [query, setQuery] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [suppliersOpen, setSuppliersOpen] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [orderSupplier, setOrderSupplier] = useState<Supplier | null>(null);
  const [category, setCategory] = useState<ItemCategory>('items');

  useEffect(() => subscribeToSuppliers(setSuppliers, () => {}), []);

  function supplierActions(s: Supplier) {
    Alert.alert(s.name, s.contact ? `איש קשר: ${s.contact}` : s.phone, [
      { text: 'התקשר', onPress: () => dialPhone(s.phone) },
      { text: 'WhatsApp', onPress: () => openWhatsapp(s.phone) },
      { text: 'תכין לי את זה', onPress: () => setOrderSupplier(s) },
      { text: 'ביטול', style: 'cancel' },
    ]);
  }

  // The list shows the selected category; the metrics are fixed by rule:
  // "סה״כ פריטים" counts ONLY regular items, "מלאי נמוך" ONLY white goods.
  const catItems = useMemo(
    () => items.filter((i) => (i.category ?? 'items') === category),
    [items, category]
  );
  const itemsCount = useMemo(
    () => items.filter((i) => (i.category ?? 'items') === 'items').length,
    [items]
  );
  const visible = useMemo(() => {
    const q = query.trim();
    const list = q
      ? catItems.filter((i) => containsCI(i.itemName, q) || containsCI(i.barcode, q))
      : [...catItems];
    return list.sort((a, b) => a.itemName.localeCompare(b.itemName, 'he'));
  }, [catItems, query]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visible}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <InventoryRow
            item={item}
            canEdit={canEdit}
            crews={crews}
            showPrice={caps.viewFinancials}
            onEdit={() => navigation.navigate('ItemEditor', { itemId: item.id })}
          />
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>מחסן וציוד</Text>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>סה״כ פריטים</Text>
                <Text style={styles.metricValue}>{itemsCount}</Text>
              </View>
              <TouchableOpacity
                style={[styles.metric, styles.suppliersCard]}
                onPress={() => setSuppliersOpen(true)}
                activeOpacity={0.8}
              >
                <Ionicons name="business-outline" size={22} color={Colors.primary} />
                <Text style={styles.suppliersText}>ספקים</Text>
              </TouchableOpacity>
            </View>

            {suppliers.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.supStrip}
                contentContainerStyle={styles.supStripRow}
              >
                {suppliers.map((s) => (
                  <TouchableOpacity key={s.id} style={styles.supCol} onPress={() => supplierActions(s)} activeOpacity={0.8}>
                    <View style={styles.supCircle}>
                      <Text style={styles.supInitial}>{s.name.trim().charAt(0) || '?'}</Text>
                    </View>
                    <Text style={styles.supName} numberOfLines={1}>{s.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {canEdit && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ItemEditor', {})} activeOpacity={0.85}>
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                  <Text style={styles.addText}>פריט חדש</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loadBtn} onPress={() => navigation.navigate('Transfer')} activeOpacity={0.85}>
                  <Ionicons name="people-outline" size={20} color={Colors.primary} />
                  <Text style={styles.loadText}>משיכה לצוות</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.loadBtn} onPress={() => setRulesOpen(true)} activeOpacity={0.85}>
                  <Ionicons name="options-outline" size={20} color={Colors.primary} />
                  <Text style={styles.loadText}>כללים</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.catTabs}>
              {(Object.keys(CATEGORY_HE) as ItemCategory[]).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catTab, category === c && styles.catTabOn]}
                  onPress={() => setCategory(c)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.catTabText, category === c && styles.catTabTextOn]}>
                    {CATEGORY_HE[c]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search" size={17} color={Colors.textSecondary} />
              <TextInput
                style={styles.search}
                placeholder="חיפוש לפי שם או ברקוד…"
                placeholderTextColor={Colors.textSecondary}
                value={query}
                onChangeText={setQuery}
                textAlign="right"
              />
              <TouchableOpacity onPress={() => setScannerOpen(true)} hitSlop={8}>
                <Ionicons name="barcode-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין פריטים להצגה.</Text>}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={setQuery}
      />

      <SuppliersModal
        visible={suppliersOpen}
        onClose={() => setSuppliersOpen(false)}
        canEdit={canEdit}
        suppliers={suppliers}
      />

      <SupplierOrderModal supplier={orderSupplier} onClose={() => setOrderSupplier(null)} />

      {/* Stock rules apply to white goods only. */}
      <StockRulesModal
        visible={rulesOpen}
        onClose={() => setRulesOpen(false)}
        items={items.filter((i) => i.category === 'white')}
      />
    </SafeAreaView>
  );
}

function InventoryRow({
  item,
  canEdit,
  crews,
  showPrice,
  onEdit,
}: {
  item: InventoryItem;
  canEdit: boolean;
  crews: Crew[];
  showPrice: boolean;
  onEdit: () => void;
}) {
  // Low-stock signals apply to white goods only (per the stock rules).
  const low = item.category === 'white' && isLowStock(item);
  const breakdown = Object.entries(item.locations)
    .filter(([, n]) => n > 0)
    .map(([loc, n]) => `${locationLabel(loc, crews)} ${n}`)
    .join(' · ');

  return (
    <View style={styles.row}>
      <TouchableOpacity style={styles.rowInfo} onPress={onEdit} activeOpacity={0.7}>
        <Text style={styles.rowName} numberOfLines={1}>{item.itemName}</Text>
        <View style={styles.rowMeta}>
          {showPrice && typeof item.customerPrice === 'number' && (
            <Text style={styles.custPrice}>₪{item.customerPrice.toLocaleString('he-IL')}</Text>
          )}
          {showPrice && typeof item.customerPrice === 'number' && (
            <Text style={styles.customerPrice}>
              ₪{(item.customerPrice - (item.price ?? 0)).toLocaleString('he-IL')}
            </Text>
          )}
          {showPrice && typeof item.customerPrice === 'number' && (item.price ?? 0) > 0 && (
            <Text style={styles.profitPct}>{Math.round((item.customerPrice / item.price!) * 100)}%</Text>
          )}
          {low && (
            <View style={styles.lowTag}>
              <Ionicons name="alert-circle-outline" size={12} color="#A32D2D" />
              <Text style={styles.lowText}>מלאי נמוך</Text>
            </View>
          )}
          {!!breakdown && <Text style={styles.split}>{breakdown}</Text>}
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
  catTabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  catTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  catTabOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catTabText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  catTabTextOn: { color: '#FFFFFF' },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  metric: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 12 },
  metricLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 3 },
  metricValue: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  suppliersCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  suppliersText: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  supStrip: { height: 78, marginBottom: 12 },
  supStripRow: { gap: 12, alignItems: 'center' },
  supCol: { alignItems: 'center', width: 64 },
  supCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  supInitial: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  supName: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, maxWidth: 64, textAlign: 'center' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
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
  custPrice: { fontSize: 12, fontWeight: '700', color: Colors.primary },
  customerPrice: { fontSize: 12, fontWeight: '700', color: '#1E9E5A' },
  profitPct: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
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
