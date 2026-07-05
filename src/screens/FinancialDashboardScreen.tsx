import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { useInventory } from '../context/InventoryContext';
import { useFinancialData } from '../hooks/useFinancialData';
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

  if (day && dayT) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>כספים — היום</Text>
          <Text style={styles.sub}>{new Date(day + 'T00:00:00').toLocaleDateString('he-IL')}</Text>

          <View style={styles.profitWrap}>
            <View style={styles.profitCircle}>
              <Text style={styles.profitLabel}>הכנסות</Text>
              <Text style={styles.profitValue}>{ils(dayT.gross)}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <Metric label="עלות ציוד" value={ils(dayT.equipment)} tone="orange" />
            <Metric label="עלות צוות" value={ils(dayT.payouts)} tone="orange" />
          </View>
          <View style={styles.row}>
            <Metric label="רווח" value={ils(dayT.profit)} tone={dayT.profit < 0 ? 'red' : 'green'} />
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
          <Metric label="לא שולם" value={ils(t.outstanding)} tone="red" />
        </View>
        <View style={styles.row}>
          <Metric label="עלות ציוד" value={ils(t.equipment)} tone="orange" />
          <Metric label="עלות צוות" value={ils(t.payouts)} tone="orange" />
        </View>

        <Text style={styles.note}>רווח = הכנסות − עלות ציוד − עלות צוות</Text>
      </ScrollView>
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
});
