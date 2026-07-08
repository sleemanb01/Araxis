import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Modal, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useUser } from '../context/UserContext';
import { useFinancialData } from '../hooks/useFinancialData';
import { workDaysInMonth } from '../utils/date';
import { subscribeToExpenses, addExpense, deleteExpense } from '../services/expenseService';
import { Expense } from '../types/expense';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { dialPhone, openWhatsapp } from '../utils/contact';
import { aggregateTotals, buyListForOpenCalls, dayKey } from '../utils/finance';
import { monthlyTaxes, directTaxRate, VAT_RATE } from '../utils/tax';
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
  const { profile } = useUser();
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

  // General business expenses — circles under the profit circle.
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expAddOpen, setExpAddOpen] = useState(false);
  const [expName, setExpName] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expSaving, setExpSaving] = useState(false);

  useEffect(() => subscribeToExpenses(setExpenses, () => {}), []);
  const monthExpenses = expenses.reduce(
    (s, e) => s + (e.createdAt.slice(0, 7) === new Date().toISOString().slice(0, 7) ? e.amount : 0),
    0
  );

  // Shopping list: what OPEN jobs need beyond what's on hand (warehouse +
  // crews). Per item: units to BUY and their cost at the actual (cost) price.
  const [stockOpen, setStockOpen] = useState(false);
  const buyList = useMemo(() => buyListForOpenCalls(calls, items), [calls, items]);
  const buyUnits = buyList.reduce((s, n) => s + n.buy, 0);
  const buyCost = buyList.reduce((s, n) => s + n.cost, 0);

  // Taxes over the CURRENT BOOK — the very same aggregates the cards above
  // show, so the screen's arithmetic adds up exactly:
  // revenue − expenses − equipment/1.18 − crew − shopping list.
  const monthTax = useMemo(
    () =>
      monthlyTaxes({
        revenue: t.gross,
        equipment: t.equipment,
        crew: t.payouts,
        expenses: monthExpenses,
        toBuy: buyCost,
      }),
    [t, monthExpenses, buyCost]
  );
  // A day carries the month's expenses divided by the owner's WORK days.
  const dayExpenses = monthExpenses / workDaysInMonth(profile?.availability?.days);

  async function saveExpense() {
    const amount = Math.max(0, parseFloat(expAmount) || 0);
    if (!expName.trim() || amount <= 0) {
      Alert.alert('שגיאה', 'יש להזין שם וסכום חיובי.');
      return;
    }
    setExpSaving(true);
    try {
      await addExpense(expName.trim(), amount);
      setExpName('');
      setExpAmount('');
      setExpAddOpen(false);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'הוספת ההוצאה נכשלה.');
    } finally {
      setExpSaving(false);
    }
  }

  function expenseActions(e: Expense) {
    Alert.alert(e.name, ils(e.amount), [
      {
        text: 'מחק',
        style: 'destructive',
        onPress: () => deleteExpense(e.id).catch((err: any) => Alert.alert('שגיאה', err?.message ?? 'המחיקה נכשלה.')),
      },
      { text: 'סגור', style: 'cancel' },
    ]);
  }

  // Collections list: jobs the client still owes on, biggest debt first.
  // In the day view only that day's jobs; in the all-time view, everything.
  const [unpaidOpen, setUnpaidOpen] = useState(false);
  const unpaidJobs = useMemo(
    () =>
      calls
        .map((c, i) => ({ call: c, balance: (fins[i]?.overallPrice ?? 0) - (fins[i]?.paidAmount ?? 0) }))
        .filter((u) => u.balance > 0.005)
        .filter((u) => !day || dayKey(new Date(u.call.scheduledDate)) === day)
        .sort((a, b) => b.balance - a.balance),
    [calls, fins, day]
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
    // Day taxes: VAT is transactional (exact); income tax + NI use the month's
    // effective rate, split by the month's proportions — an estimate.
    const dayVat = (dayT.gross - dayT.equipment - dayExpenses) * (VAT_RATE / (1 + VAT_RATE));
    // Same convention as the book: revenue − expenses − equipment/1.18 − crew.
    const dayPreTax = dayT.gross - dayExpenses - dayT.equipment / (1 + VAT_RATE) - dayT.payouts;
    const mDirect = monthTax.incomeTax + monthTax.nationalInsurance;
    const dayDirect = dayPreTax > 0 ? dayPreTax * directTaxRate(monthTax) : 0;
    const dayIT = mDirect > 0 ? dayDirect * (monthTax.incomeTax / mDirect) : 0;
    const dayNI = mDirect > 0 ? dayDirect * (monthTax.nationalInsurance / mDirect) : 0;
    const dayNet = dayPreTax - dayIT - dayNI;

    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.sub}>{new Date(day + 'T00:00:00').toLocaleDateString('he-IL')}</Text>

          <View style={styles.profitWrap}>
            <View style={[styles.profitCircle, dayNet < 0 && styles.profitNeg]}>
              <Text style={styles.profitValue}>{ils(dayNet)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Metric label="עלות ציוד" value={ils(dayT.equipment)} tone="orange" />
            <Metric label="עלות צוות" value={ils(dayT.payouts)} tone="orange" />
          </View>
          <View style={styles.row}>
            <Metric label="הכנסות" value={ils(dayT.gross)} tone="green" />
            <TouchableOpacity style={styles.flexTouch} onPress={() => setUnpaidOpen(true)} activeOpacity={0.8}>
              <Metric label="לא שולם" value={ils(dayT.outstanding)} tone="red" />
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>הוצאות ומסים — היום (משוער)</Text>
          <View style={styles.row}>
            <Metric label="הוצאות (חלק יומי)" value={ils(dayExpenses)} tone="orange" />
            <Metric label="מע״מ" value={ils(dayVat)} tone="orange" />
          </View>
          <View style={styles.row}>
            <Metric label="ביטוח לאומי" value={ils(dayNI)} tone="orange" />
            <Metric label="מס הכנסה" value={ils(dayIT)} tone="orange" />
          </View>
          <View style={styles.row}>
            <Metric label="רווח לפני מס" value={ils(dayPreTax)} tone={dayPreTax < 0 ? 'red' : 'green'} />
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
        <View style={styles.profitWrap}>
          <View style={[styles.profitCircle, monthTax.net < 0 && styles.profitNeg]}>
            <Text style={styles.profitValue}>{ils(monthTax.net)}</Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.expStrip}
          contentContainerStyle={styles.expStripRow}
        >
          <TouchableOpacity style={styles.expCol} onPress={() => setExpAddOpen(true)} activeOpacity={0.8}>
            <View style={[styles.expCircle, styles.expAddCircle]}>
              <Text style={styles.expAddAmount}>{ils(monthExpenses)}</Text>
            </View>
            <Text style={styles.expName}>הוצאות החודש</Text>
          </TouchableOpacity>
          {expenses.map((e) => (
            <TouchableOpacity key={e.id} style={styles.expCol} onPress={() => expenseActions(e)} activeOpacity={0.8}>
              <View style={styles.expCircle}>
                <Text style={styles.expAmount}>{ils(e.amount)}</Text>
              </View>
              <Text style={styles.expName} numberOfLines={1}>{e.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
        <View style={styles.row}>
          <TouchableOpacity style={styles.flexTouch} onPress={() => setStockOpen(true)} activeOpacity={0.8}>
            <Metric label="ציוד לקנייה" value={`${buyUnits} · ${ils(buyCost)}`} tone="blue" />
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>מסים — החודש</Text>
        <View style={styles.row}>
          <Metric label="מע״מ" value={ils(monthTax.vat)} tone="orange" />
          <Metric label="ביטוח לאומי" value={ils(monthTax.nationalInsurance)} tone="orange" />
        </View>
        <View style={styles.row}>
          <Metric label="מס הכנסה" value={ils(monthTax.incomeTax)} tone="orange" />
          <Metric label="רווח לפני מס" value={ils(monthTax.preTax)} tone={monthTax.preTax < 0 ? 'red' : 'green'} />
        </View>

      </ScrollView>
      {unpaidModal}

      <Modal visible={expAddOpen} transparent animationType="fade" onRequestClose={() => setExpAddOpen(false)}>
        <KeyboardAvoidingView style={styles.modalBg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>הוצאה חדשה</Text>
            <TextField label="שם ההוצאה" value={expName} onChange={setExpName} placeholder="לדוגמה: דלק, שכירות" />
            <TextField label="סכום (₪)" value={expAmount} onChange={setExpAmount} placeholder="0" keyboardType="numeric" />
            <CustomButton label="הוסף" onPress={saveExpense} loading={expSaving} disabled={!expName.trim()} />
            <CustomButton label="ביטול" variant="ghost" onPress={() => setExpAddOpen(false)} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={stockOpen} transparent animationType="fade" onRequestClose={() => setStockOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ציוד לקנייה</Text>
            {buyList.length > 0 && (
              <Text style={styles.buyTotal}>סה״כ {buyUnits} יחידות · {ils(buyCost)}</Text>
            )}
            <ScrollView style={styles.unpaidList}>
              {buyList.length === 0 && <Text style={styles.note}>אין ציוד שחסר לעבודות הפתוחות.</Text>}
              {buyList.map((n) => (
                <View key={n.id} style={styles.payRow}>
                  <Text style={[styles.stockCount, styles.stockShort]}>{ils(n.cost)}</Text>
                  <View style={styles.payInfo}>
                    <Text style={styles.payClient} numberOfLines={1}>{n.name}</Text>
                    <Text style={styles.payMeta}>
                      לקנייה {n.buy} × {ils(n.price)} · נדרש {n.qty} · במלאי {n.stock}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setStockOpen(false)} style={styles.closeBtn} activeOpacity={0.8}>
              <Text style={styles.closeText}>סגור</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const TONES = {
  green: { card: { backgroundColor: '#E8F6EE', borderColor: '#BBE5CC' }, value: { color: '#1E7E47' } },
  red: { card: { backgroundColor: '#FCEBEB', borderColor: '#F3C9C9' }, value: { color: '#B91C1C' } },
  orange: { card: { backgroundColor: '#FBF0DC', borderColor: '#F0D9A8' }, value: { color: '#B45309' } },
  blue: { card: { backgroundColor: '#E8F0FE', borderColor: '#C3D4FA' }, value: { color: '#2563EB' } },
};

function Metric({ label, value, tone }: { label: string; value: string; tone: 'green' | 'red' | 'orange' | 'blue' }) {
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
  stockCount: { fontSize: 15, fontWeight: '800', color: '#1E7E47', writingDirection: 'ltr' },
  stockShort: { color: '#B91C1C' },
  buyTotal: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right', marginBottom: 10 },
  expStrip: { height: 84, marginBottom: 12 },
  expStripRow: { gap: 12, alignItems: 'center' },
  // The circle stretches into a pill so the FULL amount always fits.
  expCol: { alignItems: 'center', minWidth: 68 },
  expCircle: {
    minWidth: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FBF0DC',
    borderWidth: 1,
    borderColor: '#F0D9A8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  expAddCircle: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  expAddAmount: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', writingDirection: 'ltr' },
  expAmount: { fontSize: 13, fontWeight: '800', color: '#B45309', writingDirection: 'ltr' },
  expName: { fontSize: 11, color: Colors.textSecondary, marginTop: 4, maxWidth: 96, textAlign: 'center' },
});
