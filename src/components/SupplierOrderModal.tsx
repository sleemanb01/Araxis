import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from './CustomButton';
import { useInventory } from '../context/InventoryContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { openWhatsapp } from '../utils/contact';
import { containsCI } from '../utils/format';
import { qtyOn } from '../utils/finance';
import { BUSINESS_NAME } from '../constants/business';
import { Supplier } from '../types/supplier';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Line {
  id: string;
  qty: string;
}

/**
 * "תכין לי את זה" — order from a supplier: opens pre-filled with the shopping
 * list (what open jobs still need beyond on-hand stock), fully editable, and
 * sends the order to the supplier via WhatsApp. Nothing is saved.
 */
export function SupplierOrderModal({
  supplier,
  onClose,
}: {
  supplier: Supplier | null;
  onClose: () => void;
}) {
  const { items } = useInventory();
  const { calls } = useLiveMetrics();
  const [lines, setLines] = useState<Line[]>([]);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const nameOf = (id: string) => items.find((i) => i.id === id)?.itemName ?? '—';
  const qtyOf = (l: Line) => Math.max(1, parseInt(l.qty, 10) || 1);

  // Prefill with the shopping list when the modal opens.
  useEffect(() => {
    if (!supplier) return;
    const need = new Map<string, number>();
    calls.forEach((c) => {
      if (c.status === 'completed') return;
      const checked = new Set(c.checkedItems ?? []);
      (c.requiredItems ?? []).forEach((id) => {
        if (checked.has(id)) return;
        need.set(id, (need.get(id) ?? 0) + qtyOn(c, id));
      });
    });
    const prefill: Line[] = [];
    need.forEach((qty, id) => {
      const it = items.find((i) => i.id === id);
      const stock = it ? Object.values(it.locations).reduce((s, n) => s + (n ?? 0), 0) : 0;
      const buy = Math.max(0, qty - stock);
      if (buy > 0) prefill.push({ id, qty: String(buy) });
    });
    setLines(prefill);
    setAdding(false);
    setSearch('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplier]);

  const suggestions = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return items
      .filter((i) => !lines.some((l) => l.id === i.id) && containsCI(i.itemName, q))
      .slice(0, 6);
  }, [items, lines, search]);

  function send() {
    if (!supplier) return;
    const rows = lines.map((l) => `• ${nameOf(l.id)} ×${qtyOf(l)}`).join('\n');
    const greeting = supplier.contact?.trim() || supplier.name;
    const text = `שלום ${greeting}, אשמח שתכינו לי:\n\n${rows}\n\nתודה, ${BUSINESS_NAME}`;
    openWhatsapp(supplier.phone, text);
  }

  return (
    <Modal visible={!!supplier} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAdding((a) => !a)} activeOpacity={0.85}>
              <Ionicons name={adding ? 'close' : 'add'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>הזמנה מ{supplier?.name ?? ''}</Text>
          </View>
          <Text style={styles.sub}>מתחיל ממה שחסר לעבודות הפתוחות — ערוך והוסף כרצונך.</Text>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
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
                  <TouchableOpacity
                    key={s.id}
                    style={styles.suggRow}
                    onPress={() => {
                      setLines((ls) => [...ls, { id: s.id, qty: '1' }]);
                      setSearch('');
                      setAdding(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.suggText} numberOfLines={1}>{s.itemName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {lines.length === 0 ? (
              <Text style={styles.empty}>אין פריטים חסרים — הוסף פריטים עם ה-+.</Text>
            ) : (
              lines.map((l) => (
                <View key={l.id} style={styles.lineRow}>
                  <TouchableOpacity onPress={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                  <TextInput
                    style={styles.qtyInput}
                    value={l.qty}
                    onChangeText={(v) =>
                      setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, qty: v.replace(/\D/g, '') } : x)))
                    }
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                    placeholder="1"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <Text style={styles.lineName} numberOfLines={1}>{nameOf(l.id)}</Text>
                </View>
              ))
            )}
          </ScrollView>

          <CustomButton label="שלח לספק בוואטסאפ" onPress={send} disabled={lines.length === 0} style={styles.btn} />
          <CustomButton label="סגור" variant="ghost" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  card: { backgroundColor: Colors.background, borderRadius: 14, padding: 18, maxHeight: '85%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginStart: 10 },
  sub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 4, marginBottom: 10 },
  body: { flexGrow: 0 },
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
  empty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginVertical: 14 },
  lineRow: {
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
  lineName: { flex: 1, fontSize: 14, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  qtyInput: {
    width: 52,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 5,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  btn: { marginTop: 10, marginBottom: 8 },
});
