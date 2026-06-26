import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllCalls, getFinancials } from '../services/serviceCallService';
import { useInventory } from '../context/InventoryContext';
import { ServiceCall, PrivateFinancials } from '../types/serviceCall';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

interface Totals {
  revenue: number;
  paid: number;
  outstanding: number;
  payouts: number;
  equipment: number;
  profit: number;
  calls: number;
}

function ils(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

export function FinancialDashboardScreen() {
  const { items } = useInventory();
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [fins, setFins] = useState<(PrivateFinancials | null)[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cs = await getAllCalls();
        const fs = await Promise.all(cs.map((c) => getFinancials(c.id).catch(() => null)));
        if (!cancelled) {
          setCalls(cs);
          setFins(fs);
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

  const t = useMemo<Totals>(() => {
    let gross = 0; // total client price
    let paid = 0;
    let payouts = 0;
    let equipment = 0;
    calls.forEach((c, i) => {
      const f = fins[i];
      if (f) {
        gross += f.overallPrice || 0;
        paid += f.paidAmount || 0;
      }
      payouts += c.payouts.totalTechPayout || 0;
      (c.requiredItems ?? []).forEach((id) => {
        equipment += items.find((it) => it.id === id)?.price ?? 0;
      });
    });
    const revenue = gross - equipment; // revenue net of equipment cost
    return { revenue, paid, outstanding: gross - paid, payouts, equipment, profit: revenue - payouts, calls: calls.length };
  }, [calls, fins, items]);

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
          <Metric label="עלות ציוד" value={ils(t.equipment)} />
        </View>
        <Text style={styles.note}>הכנסות = מחיר ללקוח − עלות ציוד · רווח = הכנסות − תשלומי צוות</Text>
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
