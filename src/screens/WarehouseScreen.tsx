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
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useInventoryStore } from '../store/useInventoryStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { InventoryItem } from '../types/inventory';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function WarehouseScreen() {
  const navigation = useNavigation<Nav>();
  const items = useInventoryStore((s) => s.items);
  const findByBarcode = useInventoryStore((s) => s.findByBarcode);
  const [query, setQuery] = useState('');
  const [scanInput, setScanInput] = useState('');

  const filtered = query
    ? items.filter(
        (i) =>
          i.name.includes(query) ||
          i.barcode.includes(query) ||
          i.category.includes(query)
      )
    : items;

  // Manual barcode entry: open the editor (edit if known, add if not).
  function handleManualLookup() {
    const code = scanInput.trim();
    if (!code) return;
    setScanInput('');
    const item = findByBarcode(code);
    if (item) {
      navigation.navigate('ItemEditor', { barcode: code });
    } else {
      Alert.alert('לא נמצא', `פריט עם ברקוד ${code} אינו במלאי.`, [
        { text: 'ביטול', style: 'cancel' },
        {
          text: 'הוסף פריט',
          onPress: () => navigation.navigate('ItemEditor', { barcode: code }),
        },
      ]);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.title}>מחסן וציוד</Text>

        {/* Camera scan */}
        <View style={styles.scanRow}>
          <TouchableOpacity
            style={styles.cameraBtn}
            onPress={() => navigation.navigate('Scan')}
            activeOpacity={0.85}
          >
            <Text style={styles.cameraBtnText}>📷  סריקת ברקוד</Text>
          </TouchableOpacity>
        </View>

        {/* Manual barcode entry */}
        <View style={styles.manualRow}>
          <TouchableOpacity style={styles.manualBtn} onPress={handleManualLookup}>
            <Text style={styles.manualBtnText}>בדוק</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.scanInput}
            placeholder="הזן ברקוד ידנית..."
            placeholderTextColor={Colors.textSecondary}
            value={scanInput}
            onChangeText={setScanInput}
            onSubmitEditing={handleManualLookup}
            keyboardType="default"
            textAlign="right"
            returnKeyType="search"
          />
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.search}
            placeholder="חיפוש לפי שם או קטגוריה..."
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
  const setLocation = useInventoryStore((s) => s.setLocation);

  function toggleLocation() {
    setLocation(item.id, item.location === 'warehouse' ? 'vehicle' : 'warehouse');
  }

  return (
    <View style={rowStyles.row}>
      <View style={rowStyles.info}>
        <Text style={rowStyles.name}>{item.name}</Text>
        <Text style={rowStyles.barcode}>{item.barcode}</Text>
        <View style={rowStyles.metaRow}>
          {/* Tap to move between vehicle and warehouse. */}
          <TouchableOpacity
            style={[rowStyles.locationBadge, item.location === 'vehicle' && rowStyles.vehicle]}
            onPress={toggleLocation}
            activeOpacity={0.7}
          >
            <Text
              style={[
                rowStyles.locationText,
                item.location === 'vehicle' && rowStyles.locationTextVehicle,
              ]}
            >
              {item.location === 'warehouse' ? 'מחסן ⇄' : 'רכב ⇄'}
            </Text>
          </TouchableOpacity>
          {item.category ? (
            <View style={rowStyles.categoryBadge}>
              <Text style={rowStyles.categoryText}>{item.category}</Text>
            </View>
          ) : null}
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
    gap: 4,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationBadge: {
    backgroundColor: Colors.primary + '20',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  vehicle: {
    backgroundColor: '#F97316' + '20',
  },
  locationText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  locationTextVehicle: {
    color: '#F97316',
  },
  categoryBadge: {
    backgroundColor: Colors.border + '80',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textSecondary,
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
    paddingHorizontal: Layout.screenPadding,
    marginBottom: 8,
  },
  cameraBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cameraBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  manualRow: {
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
  manualBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  manualBtnText: {
    color: Colors.primary,
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
