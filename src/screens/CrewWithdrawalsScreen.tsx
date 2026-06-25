import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { subscribeToCrewWithdrawals } from '../services/withdrawalService';
import { getUsersByIds } from '../services/userService';
import { Withdrawal } from '../types/withdrawal';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'CrewWithdrawals'>;

function formatDate(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('he-IL') +
    ' · ' +
    d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
  );
}

export function CrewWithdrawalsScreen() {
  const route = useRoute<RouteP>();
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});

  useEffect(() => {
    const unsub = subscribeToCrewWithdrawals(route.params.crewId, setWithdrawals, () => {});
    return unsub;
  }, [route.params.crewId]);

  useEffect(() => {
    const ids = [...new Set(withdrawals.map((w) => w.withdrawerId).filter(Boolean))];
    if (!ids.length) return;
    getUsersByIds(ids)
      .then((us) => setNames(Object.fromEntries(us.map((u) => [u.uid, u.name]))))
      .catch(() => {});
  }, [withdrawals]);

  const totalUnits = withdrawals.reduce((s, w) => s + w.amount, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={withdrawals}
        keyExtractor={(w) => w.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.amount}>{item.amount}</Text>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.itemName || item.itemId}</Text>
              <Text style={styles.meta}>
                {(names[item.withdrawerId] || 'משתמש')} · {formatDate(item.createdAt)}
              </Text>
            </View>
          </View>
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>היסטוריית משיכות</Text>
            <Text style={styles.sub}>
              {withdrawals.length} משיכות · {totalUnits} יחידות
            </Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין משיכות עדיין.</Text>}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 13,
    marginBottom: 10,
  },
  amount: { fontSize: 18, fontWeight: '700', color: Colors.primary, minWidth: 34, textAlign: 'center' },
  info: { flex: 1, marginStart: 12 },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  meta: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 3 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
