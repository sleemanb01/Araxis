import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ServiceCallCard } from '../components/ServiceCallCard';
import { SectionHeader } from '../components/SectionHeader';
import { CustomButton } from '../components/CustomButton';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { useInventory } from '../context/InventoryContext';
import { getFinancials } from '../services/serviceCallService';
import { ServiceCall, PrivateFinancials } from '../types/serviceCall';
import { dayKey, callProfit } from '../utils/finance';
import { formatDayLabel } from '../utils/date';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, caps } = useUser();
  const { calls, loading } = useLiveMetrics();
  const { items } = useInventory();
  const uid = profile?.uid ?? '';
  const showTeamPay = caps.viewTeamPayouts;

  // Capability-scoped visibility. (Rules enforce this too; this filters the client copy.)
  const mine = useMemo(
    () =>
      caps.viewAllCalls
        ? calls
        : calls.filter(
            (c) => c.teamAssignment.leadTech === uid || c.teamAssignment.assistants.includes(uid)
          ),
    [calls, caps.viewAllCalls, uid]
  );

  const [filter, setFilter] = useState<'today' | 'all'>('today');

  // Financials aren't on the live call docs; fetch them (viewFinancials) for profit.
  const [fins, setFins] = useState<Record<string, PrivateFinancials | null>>({});
  const callIds = mine.map((c) => c.id).join(',');
  useEffect(() => {
    if (!caps.viewFinancials) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        mine.map(async (c) => [c.id, await getFinancials(c.id).catch(() => null)] as const)
      );
      if (!cancelled) setFins(Object.fromEntries(entries));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callIds, caps.viewFinancials]);

  const todayJobs = useMemo(() => {
    const k = dayKey(new Date());
    return mine
      .filter((c) => dayKey(new Date(c.scheduledDate)) === k)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [mine]);

  // "All" → one row per day that has jobs (tap to open that day's list).
  const days = useMemo(() => {
    const map = new Map<string, { count: number; profit: number }>();
    mine.forEach((c) => {
      const k = dayKey(new Date(c.scheduledDate));
      const cur = map.get(k) ?? { count: 0, profit: 0 };
      cur.count += 1;
      cur.profit += callProfit(c, fins[c.id] ?? null, items);
      map.set(k, cur);
    });
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, v]) => ({ day, count: v.count, profit: v.profit }));
  }, [mine, fins, items]);

  const subtitleFor = (c: ServiceCall) =>
    showTeamPay
      ? `תשלום צוות: ₪${c.payouts.totalTechPayout.toLocaleString('he-IL')}`
      : `התשלום שלי: ₪${(c.payouts.splits[uid] ?? 0).toLocaleString('he-IL')}`;

  const header = (
    <View>
      <Text style={styles.title}>שלום, {profile?.name ?? ''}</Text>
      {caps.createCalls && (
        <CustomButton
          label="+ קריאה חדשה"
          onPress={() => navigation.navigate('NewServiceCall')}
          style={styles.newBtn}
        />
      )}
      <SectionHeader title="הקריאות שלי" count={filter === 'today' ? todayJobs.length : mine.length} />
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segBtn, filter === 'today' && styles.segBtnOn]}
          onPress={() => setFilter('today')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segText, filter === 'today' && styles.segTextOn]}>היום</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, filter === 'all' && styles.segBtnOn]}
          onPress={() => setFilter('all')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segText, filter === 'all' && styles.segTextOn]}>הכל</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const emptyComp = loading ? (
    <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
  ) : (
    <Text style={styles.empty}>אין קריאות קרובות.</Text>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {filter === 'today' ? (
        <FlatList
          data={todayJobs}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ServiceCallCard
              call={item}
              subtitle={subtitleFor(item)}
              onPress={(c) => navigation.navigate('ServiceCallDetail', { callId: c.id })}
            />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyComp}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={days}
          keyExtractor={(d) => d.day}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.dayRow}
              onPress={() => navigation.navigate('DayJobs', { day: item.day })}
              activeOpacity={0.8}
            >
              <Text style={styles.chev}>‹</Text>
              {caps.viewFinancials && (
                <Text style={[styles.dayProfit, item.profit < 0 && styles.dayProfitNeg]}>
                  ₪{Math.round(item.profit).toLocaleString('he-IL')}
                </Text>
              )}
              <View style={styles.dayInfo}>
                <Text style={styles.dayName}>{formatDayLabel(item.day)}</Text>
                <Text style={styles.dayMeta}>{item.count} עבודות</Text>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyComp}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.tabBarHeight + 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', paddingTop: 10 },
  newBtn: { marginTop: 14 },
  segment: { flexDirection: 'row', gap: 8, marginTop: 14, marginBottom: 2 },
  segBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
  },
  segBtnOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  segText: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  segTextOn: { color: '#FFFFFF' },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
  },
  chev: { fontSize: 24, color: Colors.textSecondary },
  dayProfit: { fontSize: 15, fontWeight: '800', color: '#1E9E5A', writingDirection: 'ltr', marginHorizontal: 8 },
  dayProfitNeg: { color: Colors.danger },
  dayInfo: { flex: 1, marginStart: 12, alignItems: 'flex-end' },
  dayName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  dayMeta: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 3 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
