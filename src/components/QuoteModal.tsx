import React, { useMemo, useState } from 'react';
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
import { TextField } from './TextField';
import { useInventory } from '../context/InventoryContext';
import { openWhatsapp } from '../utils/contact';
import { containsCI, ils } from '../utils/format';
import { BUSINESS_NAME } from '../constants/business';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Line {
  id: string;
  qty: string; // input text, >= 1 when parsed
}

/**
 * הצעת מחיר — quick quote builder: pick items (customer prices), set
 * quantities, get a total, and send the quote via WhatsApp. Nothing is saved.
 */
export function QuoteModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { items } = useInventory();
  const [client, setClient] = useState('');
  const [phone, setPhone] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [labor, setLabor] = useState(''); // עבודת יד
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState('');

  const priceOf = (id: string) => {
    const it = items.find((i) => i.id === id);
    return it?.customerPrice ?? it?.price ?? 0;
  };
  const nameOf = (id: string) => items.find((i) => i.id === id)?.itemName ?? '—';
  const qtyOf = (l: Line) => Math.max(1, parseInt(l.qty, 10) || 1);

  const suggestions = useMemo(() => {
    const q = search.trim();
    if (!q) return [];
    return items
      .filter((i) => !lines.some((l) => l.id === i.id) && containsCI(i.itemName, q))
      .slice(0, 6);
  }, [items, lines, search]);

  const laborN = Math.max(0, parseFloat(labor) || 0);
  const total = lines.reduce((s, l) => s + priceOf(l.id) * qtyOf(l), 0) + laborN;

  function close() {
    setClient('');
    setPhone('');
    setLines([]);
    setLabor('');
    setAdding(false);
    setSearch('');
    onClose();
  }

  function sendWhatsapp() {
    const rows = [
      ...lines.map((l) => `• ${nameOf(l.id)} ×${qtyOf(l)} — ${ils(priceOf(l.id) * qtyOf(l))}`),
      ...(laborN > 0 ? [`• עבודת יד — ${ils(laborN)}`] : []),
    ].join('\n');
    const text =
      `הצעת מחיר — ${BUSINESS_NAME}\n` +
      (client.trim() ? `עבור: ${client.trim()}\n` : '') +
      `\n${rows}\n\nסה״כ: ${ils(total)}`;
    openWhatsapp('+9725' + phone, text);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setAdding((a) => !a)} activeOpacity={0.85}>
              <Ionicons name={adding ? 'close' : 'add'} size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.title}>הצעת מחיר</Text>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <TextField label="שם הלקוח" value={client} onChange={setClient} placeholder="לדוגמה: משפחת כהן" />

            <Text style={styles.phoneLabel}>טלפון (לשליחה בוואטסאפ)</Text>
            <View style={styles.phoneRow}>
              <Text style={styles.phonePrefix}>+972 5</Text>
              <TextInput
                style={styles.phoneInput}
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, ''))}
                placeholder="0-123-4567"
                placeholderTextColor={Colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={8}
                textAlign="right"
              />
            </View>

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
                    <Text style={styles.suggPrice}>{ils(s.customerPrice ?? s.price ?? 0)}</Text>
                    <Text style={styles.suggText} numberOfLines={1}>{s.itemName}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {lines.length === 0 ? (
              <Text style={styles.empty}>הוסף פריטים עם ה-+.</Text>
            ) : (
              lines.map((l) => (
                <View key={l.id} style={styles.lineRow}>
                  <TouchableOpacity onPress={() => setLines((ls) => ls.filter((x) => x.id !== l.id))} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                  </TouchableOpacity>
                  <Text style={styles.linePrice}>{ils(priceOf(l.id) * qtyOf(l))}</Text>
                  <TextInput
                    style={styles.qtyInput}
                    value={l.qty}
                    onChangeText={(v) =>
                      setLines((ls) => ls.map((x) => (x.id === l.id ? { ...x, qty: v.replace(/\D/g, '') } : x)))
                    }
                    keyboardType="number-pad"
                    maxLength={3}
                    textAlign="center"
                    placeholder="1"
                    placeholderTextColor={Colors.textSecondary}
                  />
                  <Text style={styles.lineName} numberOfLines={1}>{nameOf(l.id)}</Text>
                </View>
              ))
            )}

            <TextField label="עבודת יד (₪)" value={labor} onChange={setLabor} placeholder="0" keyboardType="numeric" />

            {(lines.length > 0 || laborN > 0) && <Text style={styles.total}>סה״כ: {ils(total)}</Text>}
          </ScrollView>

          <CustomButton
            label="שלח בוואטסאפ"
            onPress={sendWhatsapp}
            disabled={(lines.length === 0 && laborN <= 0) || phone.length < 7}
            style={styles.btn}
          />
          <CustomButton label="סגור" variant="ghost" onPress={close} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  card: { backgroundColor: Colors.background, borderRadius: 14, padding: 18, maxHeight: '85%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  body: { flexGrow: 0 },
  phoneLabel: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right', marginBottom: 6 },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  phonePrefix: { fontSize: 15, color: Colors.textSecondary, fontWeight: '600', marginEnd: 8, writingDirection: 'ltr' },
  phoneInput: { flex: 1, paddingVertical: 11, fontSize: 15, color: Colors.textPrimary },
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
  suggPrice: { fontSize: 13, fontWeight: '700', color: '#1E9E5A' },
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
  linePrice: { fontSize: 13, fontWeight: '800', color: '#1E9E5A', writingDirection: 'ltr' },
  qtyInput: {
    width: 48,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 5,
    fontSize: 14,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  total: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', marginTop: 6, marginBottom: 4 },
  btn: { marginTop: 10, marginBottom: 8 },
});
