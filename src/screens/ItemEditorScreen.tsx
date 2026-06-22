import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { useInventoryStore } from '../store/useInventoryStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { ItemLocation } from '../types/inventory';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'ItemEditor'>;

function Stepper({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <View style={styles.stepper}>
      <TouchableOpacity style={styles.stepBtn} onPress={() => onChange(Math.max(min, value - 1))}>
        <Ionicons name="remove" size={16} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={styles.stepQty}>{value}</Text>
      <TouchableOpacity style={[styles.stepBtn, styles.stepBtnPlus]} onPress={() => onChange(value + 1)}>
        <Ionicons name="add" size={16} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

export function ItemEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { barcode } = route.params;

  const findByBarcode = useInventoryStore((s) => s.findByBarcode);
  const addItem = useInventoryStore((s) => s.addItem);
  const updateItem = useInventoryStore((s) => s.updateItem);
  const getCategories = useInventoryStore((s) => s.getCategories);

  const existing = useMemo(() => findByBarcode(barcode), [findByBarcode, barcode]);
  const categories = useMemo(() => getCategories(), [getCategories]);

  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? '');
  // Edit mode: track both locations. Create mode: pick one location + qty.
  const [warehouseQty, setWarehouseQty] = useState(existing?.warehouseQty ?? 0);
  const [vehicleQty, setVehicleQty] = useState(existing?.vehicleQty ?? 0);
  const [location, setLocation] = useState<ItemLocation>('warehouse');
  const [qty, setQty] = useState(1);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('שגיאה', 'יש להזין שם פריט.');
      return;
    }
    setSaving(true);
    try {
      if (existing) {
        await updateItem(existing.id, {
          name: trimmedName,
          category: category.trim(),
          warehouseQty,
          vehicleQty,
        });
      } else {
        await addItem({
          barcode,
          name: trimmedName,
          category: category.trim(),
          warehouseQty: location === 'warehouse' ? qty : 0,
          vehicleQty: location === 'vehicle' ? qty : 0,
        });
      }
      navigation.goBack();
    } catch (e) {
      console.warn('[itemEditor] save failed:', e);
      Alert.alert('שגיאה', 'שמירת הפריט נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>{existing ? 'עריכת פריט' : 'פריט חדש'}</Text>

        <Text style={styles.label}>ברקוד</Text>
        <View style={styles.barcodeBox}>
          <Ionicons name="barcode-outline" size={17} color={Colors.textSecondary} />
          <Text style={styles.barcodeText}>{barcode}</Text>
        </View>

        <Text style={styles.label}>שם פריט</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="לדוגמה: פילטר אוויר"
          placeholderTextColor={Colors.textSecondary}
          textAlign="right"
        />

        <Text style={styles.label}>קטגוריה</Text>
        <TextInput
          style={styles.input}
          value={category}
          onChangeText={setCategory}
          placeholder="הקלד קטגוריה או בחר מהרשימה"
          placeholderTextColor={Colors.textSecondary}
          textAlign="right"
        />
        {categories.length > 0 && (
          <View style={styles.chips}>
            {categories.map((c) => {
              const active = category.trim() === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {existing ? (
          <>
            <Text style={styles.label}>כמות במלאי</Text>
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLoc}>מחסן</Text>
              <Stepper value={warehouseQty} onChange={setWarehouseQty} />
            </View>
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLoc}>רכב</Text>
              <Stepper value={vehicleQty} onChange={setVehicleQty} />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.label}>מיקום</Text>
            <View style={styles.segment}>
              {(['warehouse', 'vehicle'] as ItemLocation[]).map((loc) => {
                const active = location === loc;
                return (
                  <TouchableOpacity
                    key={loc}
                    style={[styles.segBtn, active && styles.segBtnActive]}
                    onPress={() => setLocation(loc)}
                  >
                    <Text style={[styles.segText, active && styles.segTextActive]}>
                      {loc === 'warehouse' ? 'מחסן' : 'רכב'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <Text style={styles.label}>כמות</Text>
            <View style={styles.qtyRow}>
              <Text style={styles.qtyLoc}>{location === 'warehouse' ? 'מחסן' : 'רכב'}</Text>
              <Stepper value={qty} onChange={setQty} min={1} />
            </View>
          </>
        )}

        <CustomButton
          label={existing ? 'שמור שינויים' : 'הוסף למלאי'}
          onPress={handleSave}
          loading={saving}
          style={{ marginTop: 24 }}
        />
        <CustomButton
          label="ביטול"
          variant="ghost"
          onPress={() => navigation.goBack()}
          style={{ marginTop: 4 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  heading: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  barcodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
    backgroundColor: Colors.border + '60',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  barcodeText: { fontSize: 15, color: Colors.textPrimary, fontWeight: '600', letterSpacing: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, justifyContent: 'flex-end' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textPrimary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  segment: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  segBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', backgroundColor: Colors.surface },
  segBtnActive: { backgroundColor: Colors.primary },
  segText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  segTextActive: { color: '#FFFFFF' },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 8,
  },
  qtyLoc: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
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
  stepQty: { fontSize: 17, fontWeight: '700', minWidth: 24, textAlign: 'center', color: Colors.textPrimary },
});
