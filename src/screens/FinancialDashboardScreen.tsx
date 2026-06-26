import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllCalls, getFinancials } from '../services/serviceCallService';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Totals {
  revenue: number;
  paid: number;
  outstanding: number;
  payouts: number;
  profit: number;
  calls: number;
}

const ZERO: Totals = { revenue: 0, paid: 0, outstanding: 0, payouts: 0, profit: 0, calls: 0 };

function ils(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

export function FinancialDashboardScreen() {
  const [loading, setLoading] = useState(true);
  const [t, setT] = useState<Totals>(ZERO);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const calls = await getAllCalls();
        const fins = await Promise.all(calls.map((c) => getFinancials(c.id).catch(() => null)));
        let revenue = 0;
        let paid = 0;
        let payouts = 0;
        calls.forEach((c, i) => {
          const f = fins[i];
          if (f) {
            revenue += f.overallPrice || 0;
            paid += f.paidAmount || 0;
          }
          payouts += c.payouts.totalTechPayout || 0;
        });
        if (!cancelled) {
          setT({ revenue, paid, outstanding: revenue - paid, payouts, profit: revenue - payouts, calls: calls.length });
          setLoading(false);
        }
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ActivityIndicator color={Colors.primary} style={{ marginTop: 48 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>לוח כספים</Text>
        <Text style={styles.sub}>על פני {t.calls} קריאות שירות</Text>
        <View style={styles.grid}>
          <Metric label="הכנסות" value={ils(t.revenue)} />
          <Metric label="רווח" value={ils(t.profit)} accent />
          <Metric label="תשלומי צוות" value={ils(t.payouts)} />
          <Metric label="שולם" value={ils(t.paid)} />
          <Metric label="יתרה לגבייה" value={ils(t.outstanding)} warn={t.outstanding > 0} />
        </View>
        <Text style={styles.note}>רווח = הכנסות − תשלומי צוות · יתרה = הכנסות − שולם</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, accent, warn }: { label: string; value: string; accent?: boolean; warn?: boolean }) {
  return (
    <View style={[styles.card, accent && styles.cardAccent, warn && styles.cardWarn]}>
      <Text style={[styles.cardLabel, accent && styles.cardLabelAccent]}>{label}</Text>
      <Text style={[styles.cardValue, accent && styles.cardValueAccent, warn && styles.cardValueWarn]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
  },
  cardAccent: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  cardWarn: { backgroundColor: '#FAEEDA', borderColor: '#F0D9A8' },
  cardLabel: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right' },
  cardLabelAccent: { color: '#FFFFFF' },
  cardValue: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'right', marginTop: 8, writingDirection: 'ltr' },
  cardValueAccent: { color: '#FFFFFF' },
  cardValueWarn: { color: '#854F0B' },
  note: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 18 },
});
