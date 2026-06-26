import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getAllCalls, getFinancials } from '../services/serviceCallService';
import { useInventory } from '../context/InventoryContext';
import { ServiceCall, PrivateFinancials } from '../types/serviceCall';
import { aggregateTotals } from '../utils/finance';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

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

  const t = useMemo(() => aggregateTotals(calls, fins, items), [calls, fins, items]);

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
        <Text style={styles.sub}>על פני {calls.length} קריאות שירות</Text>

        <View style={styles.profitWrap}>
          <View style={[styles.profitCircle, t.profit < 0 && styles.profitNeg]}>
            <Text style={styles.profitLabel}>רווח</Text>
            <Text style={styles.profitValue}>{ils(t.profit)}</Text>
          </View>
        </View>

        <View style={styles.row}>
          <Metric label="שולם" value={ils(t.paid)} />
          <Metric label="לא שולם" value={ils(t.outstanding)} warn={t.outstanding > 0} />
        </View>
        <View style={styles.row}>
          <Metric label="עלות ציוד" value={ils(t.equipment)} />
          <Metric label="עלות צוות" value={ils(t.payouts)} />
        </View>

        <Text style={styles.note}>רווח = הכנסות − עלות ציוד − עלות צוות</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={[styles.card, warn && styles.cardWarn]}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={[styles.cardValue, warn && styles.cardValueWarn]}>{value}</Text>
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
});
