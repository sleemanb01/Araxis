import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useFinancialData } from '../hooks/useFinancialData';
import { dialPhone, openWhatsapp } from '../utils/contact';
import { aggregateTotals, dayKey } from '../utils/finance';
import { ils } from '../utils/format';
import { PAYMENT_METHOD_HE } from '../types/payment';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'FinancialDashboard'>;

export function FinancialDashboardScreen() {
  const route = useRoute<RouteP>();
  const day = route.params?.day;
  const { items } = useInventory();
  const { calls, fins, payments, loading } = useFinancialData(true);

  const t = useMemo(() => aggregateTotals(calls, fins, items), [calls, fins, items]);

  // Day view: the payments RECEIVED on `day` (what the daily ring counts).
  const dayPays = useMemo(
    () =>
      day
        ? payments
            .filter((p) => p.status === 'issued' && p.date === day)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        : [],
    [payments, day]
  );
  const clientOf = (callId?: string) => calls.find((c) => c.id === callId)?.clientName ?? 'לקוח';

  // Collections list: every job the client still owes on, biggest debt first.
  const [unpaidOpen, setUnpaidOpen] = useState(false);
  const unpaidJobs = useMemo(
    () =>
      calls
        .map((c, i) => ({ call: c, balance: (fins[i]?.overallPrice ?? 0) - (fins[i]?.paidAmount ?? 0) }))
        .filter((u) => u.balance > 0.005)
        .sort((a, b) => b.balance - a.balance),
    [calls, fins]
  );

  // Totals of the jobs scheduled on `day` (revenue = client price; costs/profit
  // per the dashboard formula: profit = revenue − equipment − crew).
  const dayT = useMemo(() => {
    if (!day) return null;
    const pairs = calls
      .map((c, i) => [c, fins[i]] as const)
      .filter(([c]) => dayKey(new Date(c.scheduledDate)) === day);
    return aggregateTotals(pairs.map(([c]) => c), pairs.map(([, f]) => f), items);
  }, [calls, fins, items, day]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  const unpaidModal = (
    <Modal visible={unpaidOpen} transparent animationType="fade" onRequestClose={() => setUnpaidOpen(false)}>
      <View style={styles.modalBg}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>לא שולם</Text>
          <ScrollView style={styles.unpaidList}>
            {unpaidJobs.length === 0 && <Text style={styles.note}>אין חובות פתוחים.</Text>}
            {unpaidJobs.map(({ call, balance }) => (
              <View key={call.id} style={styles.payRow}>
                <View style={styles.unpaidBtns}>
                  {!!call.contactPhone && (
                    <>
                      <TouchableOpacity style={styles.cBtn} onPress={() => dialPhone(call.contactPhone!)} hitSlop={6}>
                        <Ionicons name="call" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.cBtn, styles.waBtn]}
                        onPress={() =>
                          openWhatsapp(
                            call.contactPhone!,
                            `שלום ${call.clientName}, תזכורת ליתרת תשלום של ₪${Math.round(balance).toLocaleString('he-IL')}.`
                          )
                        }
                        hitSlop={6}
                      >
                        <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </>
                  )}
                </View>
                <View style={styles.payInfo}>
                  <Text style={styles.payClient} numberOfLines={1}>{call.clientName}</Text>
                  <Text style={styles.payMeta}>{new Date(call.scheduledDate).toLocaleDateString('he-IL')}</Text>
                  <Text style={styles.unpaidAmount}>{ils(balance)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity onPress={() => setUnpaidOpen(false)} style={styles.closeBtn} activeOpacity={0.8}>
            <Text style={styles.closeText}>סגור</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (day && dayT) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>כספים — היום</Text>
          <Text style={styles.sub}>{new Date(day + 'T00:00:00').toLocaleDateString('he-IL')}</Text>

          <View style={styles.profitWrap}>
            <View style={[styles.profitCircle, dayT.profit < 0 && styles.profitNeg]}>
              <Text style={styles.profitLabel}>רווח</Text>
              <Text style={styles.profitValue}>{ils(dayT.profit)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Metric label="עלות ציוד" value={ils(dayT.equipment)} tone="orange" />
            <Metric label="עלות צוות" value={ils(dayT.payouts)} tone="orange" />
          </View>
          <View style={styles.row}>
            <Metric label="הכנסות" value={ils(dayT.gross)} tone="green" />
            <TouchableOpacity style={styles.flexTouch} onPress={() => setUnpaidOpen(true)} activeOpacity={0.8}>
              <Metric label="לא שולם" value={ils(t.outstanding)} tone="red" />
            </TouchableOpacity>
          </View>

          {dayPays.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>תשלומים שהתקבלו היום</Text>
              {dayPays.map((p) => (
                <View key={p.id} style={styles.payRow}>
                  <Text style={styles.payAmount}>{ils(p.amount)}</Text>
                  <View style={styles.payInfo}>
                    <Text style={styles.payClient} numberOfLines={1}>{clientOf(p.callId)}</Text>
                    <Text style={styles.payMeta}>{PAYMENT_METHOD_HE[p.method]}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
        {unpaidModal}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>לוח כספים</Text>
        <Text style={styles.sub}>על פני {calls.length} קריאות שירות</Text>

        <View style={styles.profitWrap}>
          <View style={[styles.profitCircle, t.profit < 0 && styles.profitNeg]}>
            <Text style={styles.profitLabel}>רווח</Text>
            <Text style={styles.profitValue}>{ils(t.profit)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Metric label="שולם" value={ils(t.paid)} tone="green" />
          <TouchableOpacity style={styles.flexTouch} onPress={() => setUnpaidOpen(true)} activeOpacity={0.8}>
            <Metric label="לא שולם" value={ils(t.outstanding)} tone="red" />
          </TouchableOpacity>
        </View>
        <View style={styles.row}>
          <Metric label="עלות ציוד" value={ils(t.equipment)} tone="orange" />
          <Metric label="עלות צוות" value={ils(t.payouts)} tone="orange" />
        </View>

        <Text style={styles.note}>רווח = הכנסות − עלות ציוד − עלות צוות</Text>
      </ScrollView>
      {unpaidModal}
    </SafeAreaView>
  );
}

const TONES = {
  green: { card: { backgroundColor: '#E8F6EE', borderColor: '#BBE5CC' }, value: { color: '#1E7E47' } },
  red: { card: { backgroundColor: '#FCEBEB', borderColor: '#F3C9C9' }, value: { color: '#B91C1C' } },
  orange: { card: { backgroundColor: '#FBF0DC', borderColor: '#F0D9A8' }, value: { color: '#B45309' } },
};

function Metric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'orange' }) {
  const tc = TONES[tone];
  return (
    <View style={[styles.card, tc.card]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, tc.value]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  profitWrap: { alignItems: 'center', marginVertical: 22 },
  profitCircle: {
    width: 188,
    height: 188,
    borderRadius: 94,
    backgroundColor: '#1E9E5A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1E9E5A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 6,
  },
  profitNeg: { backgroundColor: Colors.danger, shadowColor: Colors.danger },
  profitLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 16, fontWeight: '600' },
  profitValue: { color: '#FFFFFF', fontSize: 32, fontWeight: '800', marginTop: 8, writingDirection: 'ltr' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  cardWarn: { backgroundColor: '#FAEEDA', borderColor: '#F0D9A8' },
  cardLabel: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  cardValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', marginTop: 8, writingDirection: 'ltr' },
  cardValueWarn: { color: '#854F0B' },
  note: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 18 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginTop: 16, marginBottom: 8 },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  payAmount: { fontSize: 16, fontWeight: '800', color: '#1E9E5A', writingDirection: 'ltr' },
  payInfo: { flex: 1, alignItems: 'flex-end', marginStart: 10 },
  payClient: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  payMeta: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  flexTouch: { flex: 1 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  modalCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 18, maxHeight: '75%' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 12 },
  unpaidList: { flexGrow: 0 },
  unpaidBtns: { flexDirection: 'row', gap: 8 },
  cBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  waBtn: { backgroundColor: '#25D366' },
  unpaidAmount: { fontSize: 14, fontWeight: '800', color: '#B91C1C', writingDirection: 'ltr', marginTop: 2 },
  closeBtn: { alignSelf: 'center', marginTop: 12, paddingVertical: 8, paddingHorizontal: 28 },
  closeText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
});
