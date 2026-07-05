import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ServiceCall } from '../types/serviceCall';
import { dialPhone, openWhatsapp, openNavigation } from '../utils/contact';
import { useUser } from '../context/UserContext';
import { useInventory } from '../context/InventoryContext';
import { updateProfile } from '../services/userService';
import { qtyOn } from '../utils/finance';
import { ils } from '../utils/format';
import { Colors, CallStatusColors, CallStatusLabelsHe } from '../constants/colors';

interface Props {
  call: ServiceCall;
  subtitle?: string; // role-specific line, e.g. the viewer's payout
  onPress: (call: ServiceCall) => void;
}

/** A service-call row with a status-colored edge bar. Memoized — list rows
 *  re-render only when their call/subtitle/handler actually change. */
export const ServiceCallCard = React.memo(function ServiceCallCard({ call, subtitle, onPress }: Props) {
  const { profile, user, caps } = useUser();
  const { items } = useInventory();
  const color = CallStatusColors[call.status];
  const date = new Date(call.scheduledDate).toLocaleDateString('he-IL');

  // What this job still needs to BUY (unchecked required items beyond stock).
  const [buyOpen, setBuyOpen] = useState(false);
  const buyList: { id: string; name: string; qty: number; stock: number; buy: number; price: number; cost: number }[] = [];
  if (caps.viewFinancials && call.status !== 'completed') {
    const checked = new Set(call.checkedItems ?? []);
    (call.requiredItems ?? []).forEach((id) => {
      if (checked.has(id)) return;
      const it = items.find((i) => i.id === id);
      const stock = it ? Object.values(it.locations).reduce((s, n) => s + (n ?? 0), 0) : 0;
      const qty = qtyOn(call, id);
      const buy = Math.max(0, qty - stock);
      if (buy <= 0) return;
      const price = it?.price ?? 0;
      buyList.push({ id, name: it?.itemName ?? '—', qty, stock, buy, price, cost: buy * price });
    });
    buyList.sort((a, b) => b.cost - a.cost);
  }
  const buyUnits = buyList.reduce((s, n) => s + n.buy, 0);
  const buyCost = buyList.reduce((s, n) => s + n.cost, 0);

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(call)} activeOpacity={0.8}>
      <View style={[styles.edge, { backgroundColor: color }]} />
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.client} numberOfLines={1}>{call.clientName}</Text>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{CallStatusLabelsHe[call.status]}</Text>
          </View>
        </View>
        <Text style={styles.date}>{date}</Text>
        {buyUnits > 0 && (
          <TouchableOpacity style={styles.buyPill} onPress={() => setBuyOpen(true)} hitSlop={6} activeOpacity={0.8}>
            <Text style={styles.buyPillText}>לקנייה {buyUnits} · {ils(buyCost)}</Text>
          </TouchableOpacity>
        )}
        {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        {(!!call.contactPhone || !!call.address) && (
          <View style={styles.actions}>
            {!!call.contactPhone && (
              <TouchableOpacity style={[styles.actBtn, styles.callBtn]} onPress={() => dialPhone(call.contactPhone!)} hitSlop={4}>
                <Ionicons name="call" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {!!call.contactPhone && (
              <TouchableOpacity style={[styles.actBtn, styles.waBtn]} onPress={() => openWhatsapp(call.contactPhone!)} hitSlop={4}>
                <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            {!!call.address && (
              <TouchableOpacity
                style={[styles.actBtn, styles.navBtn]}
                onPress={() =>
                  openNavigation(call.address!, profile?.navApp, (app) => {
                    if (user) updateProfile(user.uid, { navApp: app }).catch(() => {});
                  })
                }
                hitSlop={4}
              >
                <Ionicons name="navigate" size={15} color="#FFFFFF" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <Modal visible={buyOpen} transparent animationType="fade" onRequestClose={() => setBuyOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ציוד לקנייה — {call.clientName}</Text>
            <Text style={styles.modalSub}>סה״כ {buyUnits} יחידות · {ils(buyCost)}</Text>
            {buyList.map((n) => (
              <View key={n.id} style={styles.buyRow}>
                <Text style={styles.buyCost}>{ils(n.cost)}</Text>
                <View style={styles.buyInfo}>
                  <Text style={styles.buyName} numberOfLines={1}>{n.name}</Text>
                  <Text style={styles.buyMeta}>
                    לקנייה {n.buy} × {ils(n.price)} · נדרש {n.qty} · במלאי {n.stock}
                  </Text>
                </View>
              </View>
            ))}
            <TouchableOpacity onPress={() => setBuyOpen(false)} style={styles.closeBtn} activeOpacity={0.8}>
              <Text style={styles.closeText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  edge: { width: 5 },
  body: { flex: 1, padding: 14, gap: 4 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  client: { flex: 1, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  date: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  subtitle: { fontSize: 14, fontWeight: '600', color: Colors.primary, textAlign: 'right' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  actBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  callBtn: { backgroundColor: Colors.primary },
  waBtn: { backgroundColor: '#25D366' },
  navBtn: { backgroundColor: '#0F766E' },
  buyPill: {
    alignSelf: 'flex-end',
    backgroundColor: '#E8F0FE',
    borderWidth: 1,
    borderColor: '#C3D4FA',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 10,
    marginTop: 4,
  },
  buyPillText: { fontSize: 11, fontWeight: '700', color: '#2563EB' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 18, maxHeight: '75%' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  modalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginTop: 3, marginBottom: 12 },
  buyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  buyCost: { fontSize: 15, fontWeight: '800', color: '#B91C1C', writingDirection: 'ltr' },
  buyInfo: { flex: 1, alignItems: 'flex-end', marginStart: 10 },
  buyName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  buyMeta: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  closeBtn: { alignSelf: 'center', marginTop: 10, paddingVertical: 8, paddingHorizontal: 28 },
  closeText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
