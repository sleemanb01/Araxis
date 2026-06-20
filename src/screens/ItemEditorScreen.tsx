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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { useInventoryStore } from '../store/useInventoryStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { ItemLocation } from '../types/inventory';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'ItemEditor'>;

export function ItemEditorScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { barcode } = route.params;

  const findByBarcode = useInventoryStore((s) => s.findByBarcode);
  const addItem = useInventoryStore((s) => s.addItem);
  const updateItem = useInventoryStore((s) => s.updateItem);
  const getCategories = useInventoryStore((s) => s.getCategories);

  // Resolved once at mount: edit if the barcode already exists, else create.
  const existing = useMemo(() => findByBarcode(barcode), [findByBarcode, barcode]);

  const [name, setName] = useState(existing?.name ?? '');
  const [quantity, setQuantity] = useState(String(existing?.quantity ?? 1));
  const [category, setCategory] = useState(existing?.category ?? '');
  const [location, setLocation] = useState<ItemLocation>(existing?.location ?? 'warehouse');
  const [saving, setSaving] = useState(false);

  const categories = useMemo(() => getCategories(), [getCategories]);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('שגיאה', 'יש להזין שם פריט.');
      return;
    }
    const parsed = parseInt(quantity, 10);
    const safeQty = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    const trimmedCategory = category.trim();

    setSaving(true);
    try {
      if (existing) {
        await updateItem(existing.id, {
          name: trimmedName,
          quantity: safeQty,
          category: trimmedCategory,
          location,
        });
      } else {
        await addItem({
          barcode,
          name: trimmedName,
          quantity: safeQty,
          category: trimmedCategory,
          location,
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

        <Text style={styles.label}>כמות</Text>
        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="number-pad"
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

        <Text style={styles.label}>מיקום</Text>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, location === 'warehouse' && styles.segmentActive]}
            onPress={() => setLocation('warehouse')}
          >
            <Text style={[styles.segmentText, location === 'warehouse' && styles.segmentTextActive]}>
              מחסן
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, location === 'vehicle' && styles.segmentActiveVehicle]}
            onPress={() => setLocation('vehicle')}
          >
            <Text style={[styles.segmentText, location === 'vehicle' && styles.segmentTextActive]}>
              רכב
            </Text>
          </TouchableOpacity>
        </View>

        <CustomButton
          label={existing ? 'שמור שינויים' : 'הוסף פריט'}
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
    marginTop: 12,
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
    backgroundColor: Colors.border + '60',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  barcodeText: {
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'right',
    fontWeight: '600',
    letterSpacing: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'flex-end',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: { fontSize: 13, color: Colors.textPrimary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  segment: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  segmentActive: { backgroundColor: Colors.primary },
  segmentActiveVehicle: { backgroundColor: '#F97316' },
  segmentText: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary },
  segmentTextActive: { color: '#FFFFFF' },
});
