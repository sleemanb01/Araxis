import React, { useEffect, useState } from 'react';
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
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Rule {
  priority: boolean;
  critical: string; // input text; empty = default threshold
}

/**
 * Stock rules: mark items as high priority and set the per-item critical
 * quantity (below it the item counts as low stock).
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
  const [rules, setRules] = useState<Record<string, Rule>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setRules(
      Object.fromEntries(
        items.map((i) => [
          i.id,
          { priority: i.priority === true, critical: i.criticalQty != null ? String(i.criticalQty) : '' },
        ])
      )
    );
    // Snapshot on open only — edits shouldn't be clobbered by live item updates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function setRule(id: string, patch: Partial<Rule>) {
    setRules((r) => ({ ...r, [id]: { ...r[id], ...patch } }));
  }

  async function save() {
    setSaving(true);
    try {
      const changed = items.filter((i) => {
        const r = rules[i.id];
        if (!r) return false;
        const critical = r.critical.trim() === '' ? null : Math.max(0, parseInt(r.critical, 10) || 0);
        return r.priority !== (i.priority === true) || critical !== (i.criticalQty ?? null);
      });
      await Promise.all(
        changed.map((i) => {
          const r = rules[i.id];
          const critical = r.critical.trim() === '' ? null : Math.max(0, parseInt(r.critical, 10) || 0);
          return updateInventoryItem(i.id, { priority: r.priority, criticalQty: critical as any });
        })
      );
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
          <Text style={styles.title}>כללי מלאי</Text>
          <Text style={styles.sub}>סמן עדיפות גבוהה (⭐) וקבע כמות קריטית לכל פריט — מתחתיה הפריט יסומן כמלאי נמוך.</Text>
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => {
              const r = rules[item.id] ?? { priority: false, critical: '' };
              return (
                <View style={styles.row}>
                  <TextInput
                    style={styles.qtyInput}
                    value={r.critical}
                    onChangeText={(v) => setRule(item.id, { critical: v.replace(/\D/g, '') })}
                    placeholder="5"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="number-pad"
                    maxLength={4}
                    textAlign="center"
                  />
                  <TouchableOpacity onPress={() => setRule(item.id, { priority: !r.priority })} hitSlop={8}>
                    <Ionicons
                      name={r.priority ? 'star' : 'star-outline'}
                      size={22}
                      color={r.priority ? '#D97706' : Colors.textSecondary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.name} numberOfLines={1}>{item.itemName}</Text>
                </View>
              );
            }}
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
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  sub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 4, marginBottom: 12, lineHeight: 17 },
  list: { flexGrow: 0, marginBottom: 8 },
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
