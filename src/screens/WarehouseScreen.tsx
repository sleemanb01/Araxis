import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInventoryStore } from '../store/useInventoryStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { InventoryItem } from '../types/inventory';

export function WarehouseScreen() {
  const { items, findByBarcode, setLastScanned } = useInventoryStore();
  const [query, setQuery] = useState('');
  const [scanInput, setScanInput] = useState('');

  const filtered = query
    ? items.filter(
        (i) => i.name.includes(query) || i.barcode.includes(query)
      )
    : items;

  function handleManualScan() {
    if (!scanInput.trim()) return;
    const item = findByBarcode(scanInput.trim());
    setLastScanned(item ?? null);
    if (!item) {
      Alert.alert('לא נמצא', `פריט עם ברקוד ${scanInput} אינו במלאי.`);
    } else {
      Alert.alert('נמצא', `${item.name} — כמות: ${item.quantity}`);
    }
    setScanInput('');
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>מחסן וציוד</Text>

        {/* Barcode scan row */}
        <View style={styles.scanRow}>
          <TouchableOpacity style={styles.scanBtn} onPress={handleManualScan}>
            <Text style={styles.scanBtnText}>סרוק</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.scanInput}
            placeholder="הזן ברקוד..."
            placeholderTextColor={Colors.textSecondary}
            value={scanInput}
            onChangeText={setScanInput}
            onSubmitEditing={handleManualScan}
            keyboardType="number-pad"
            textAlign="right"
            returnKeyType="search"
          />
        </View>

        {/* Search row */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder="חיפוש לפי שם..."
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            textAlign="right"
          />
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => <InventoryRow item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </SafeAreaView>
  );
}

function InventoryRow({ item }: { item: InventoryItem }) {
  const updateQuantity = useInventoryStore((s) => s.updateQuantity);

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{item.name}</Text>
        <Text style={rowStyles.barcode}>{item.barcode}</Text>
        <View style={[rowStyles.locationBadge, item.location === 'vehicle' && rowStyles.vehicle]}>
          <Text style={rowStyles.locationText}>
            {item.location === 'warehouse' ? 'מחסן' : 'רכב'}
          </Text>
        </View>
      </View>
      <View style={rowStyles.qty}>
        <TouchableOpacity style={rowStyles.qtyBtn} onPress={() => updateQuantity(item.id, -1)}>
          <Text style={rowStyles.qtyBtnText}>−</Text>
        </TouchableOpacity>
        <Text style={rowStyles.qtyText}>{item.quantity}</Text>
        <TouchableOpacity style={rowStyles.qtyBtn} onPress={() => updateQuantity(item.id, 1)}>
          <Text style={rowStyles.qtyBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  info: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  barcode: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  locationBadge: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: 'flex-end',
  },
  vehicle: {
    backgroundColor: '#F97316' + '20',
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
  },
  qty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginStart: 16,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: {
    fontSize: 18,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
    minWidth: 28,
    textAlign: 'center',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    paddingHorizontal: Layout.screenPadding,
    paddingTop: 10,
    paddingBottom: 12,
  },
  scanRow: {
    flexDirection: 'row',
    paddingHorizontal: Layout.screenPadding,
    marginBottom: 8,
    gap: 8,
  },
  scanInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  scanBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  scanBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  searchRow: {
    paddingHorizontal: Layout.screenPadding,
    marginBottom: 12,
  },
  search: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  list: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.tabBarHeight + 16,
  },
});
