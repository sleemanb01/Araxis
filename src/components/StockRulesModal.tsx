import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from './CustomButton';
import { updateInventoryItem } from '../services/inventoryService';
import { InventoryItem } from '../types/inventory';
import { containsCI } from '../utils/format';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

/**
 * Stock rules: a hand-picked list of HIGH-PRIORITY items, each with a critical
 * quantity — below it the item counts as low stock. Add items with the +
 * (search by name); everything on the list is high priority by definition.
 */
export function StockRulesModal({
  visible,
  onClose,
  items,
}: {
  visible: boolean;
  onClose: () => void;
  items: InventoryItem[];
}) {
  const [ruled, setRuled] = useState<Record<string, string>>({}); // id -> critical qty text
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Snapshot existing rules when the modal opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (visible && !wasOpen) {
    setWasOpen(true);
    setRuled(
      Object.fromEntries(
        items
          .filter((i) => i.priority === true)
          .map((i) => [i.id, i.criticalQty != null ? String(i.criticalQty) : ''])
      )
    );
    setAdding(false);
    setSearch('');
  } else if (!visible && wasOpen) {
    setWasOpen(false);
  }

  const ruledItems = items.filter((i) => i.id in ruled);
  const suggestions = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return items.filter((i) => !(i.id in ruled) && containsCI(i.itemName, q)).slice(0, 6);
  }, [items, ruled, search]);

  function addItem(id: string) {
    setRuled((r) => ({ ...r, [id]: '' }));
    setSearch('');
    setAdding(false);
  }

  function removeItem(id: string) {
    setRuled(({ [id]: _gone, ...rest }) => rest);
  }

  async function save() {
    setSaving(true);
    try {
      const updates: Promise<void>[] = [];
      items.forEach((i) => {
        const inList = i.id in ruled;
        const critical = inList && ruled[i.id].trim() !== '' ? Math.max(0, parseInt(ruled[i.id], 10) || 0) : null;
        const changed = inList !== (i.priority === true) || critical !== (i.criticalQty ?? null);
        if (!changed) return;
        updates.push(
          updateInventoryItem(i.id, { priority: inList, criticalQty: critical as any })
        );
      });
      await Promise.all(updates);
      setSaving(false);
      onClose();
    } catch {
      setSaving(false);
      Alert.alert('שגיאה', 'שמירת הכללים נכשלה.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAdding((a) => !a)} activeOpacity={0.85}>
              <Ionicons name={adding ? 'close' : 'add'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>כללי מלאי</Text>
          </View>
          <Text style={styles.sub}>
            מוצרים לבנים בעדיפות גבוהה. קבע לכל מוצר כמות קריטית — מתחתיה הוא יסומן כמלאי נמוך.
          </Text>

          {adding && (
            <View>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={Colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="חפש פריט להוספה…"
                  placeholderTextColor={Colors.textSecondary}
                  value={search}
                  onChangeText={setSearch}
                  textAlign="right"
                  autoFocus
                />
              </View>
              {suggestions.map((s) => (
                <TouchableOpacity key={s.id} style={styles.suggRow} onPress={() => addItem(s.id)} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                  <Text style={styles.suggText} numberOfLines={1}>{s.itemName}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <FlatList
            data={ruledItems}
            keyExtractor={(i) => i.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={<Text style={styles.empty}>אין כללים עדיין — הוסף פריט עם ה-+.</Text>}
            renderItem={({ item }) => (
              <View style={styles.row}>
                <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={19} color={Colors.danger} />
                </TouchableOpacity>
                <TextInput
                  style={styles.qtyInput}
                  value={ruled[item.id]}
                  onChangeText={(v) =>
                    setRuled((r) => ({ ...r, [item.id]: v.replace(/\D/g, '') }))
                  }
                  placeholder="5"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="number-pad"
                  maxLength={4}
                  textAlign="center"
                />
                <Text style={styles.name} numberOfLines={1}>{item.itemName}</Text>
              </View>
            )}
          />
          <CustomButton label="שמור כללים" onPress={save} loading={saving} style={styles.btn} />
          <CustomButton label="ביטול" variant="ghost" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  card: { backgroundColor: Colors.background, borderRadius: 14, padding: 18, maxHeight: '82%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  sub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 6, marginBottom: 12, lineHeight: 17 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  searchInput: { flex: 1, paddingVertical: 9, fontSize: 14, color: Colors.textPrimary },
  suggRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggText: { flex: 1, fontSize: 14, color: Colors.textPrimary, textAlign: 'right' },
  list: { flexGrow: 0, marginTop: 8, marginBottom: 8 },
  empty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  name: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  qtyInput: {
    width: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  btn: { marginBottom: 8 },
});
