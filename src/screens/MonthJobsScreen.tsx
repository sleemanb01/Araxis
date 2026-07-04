import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ServiceCallCard } from '../components/ServiceCallCard';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { useFinancialData } from '../hooks/useFinancialData';
import { ServiceCall } from '../types/serviceCall';
import { monthKey } from '../utils/finance';
import { formatMonthLabel } from '../utils/date';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteP = RouteProp<RootStackParamList, 'MonthJobs'>;

/** A month's OPEN jobs: unfinished, plus finished ones the client still owes on. */
export function MonthJobsScreen() {
  const route = useRoute<RouteP>();
  const navigation = useNavigation<Nav>();
  const { profile, caps } = useUser();
  const { calls } = useLiveMetrics();
  const { finsById } = useFinancialData(caps.viewFinancials);
  const uid = profile?.uid ?? '';
  const showTeamPay = caps.viewTeamPayouts;

  const jobs = useMemo(() => {
    const mine = caps.viewAllCalls
      ? calls
      : calls.filter((c) => c.teamAssignment.leadTech === uid || c.teamAssignment.assistants.includes(uid));
    return mine
      .filter((c) => {
        if (monthKey(new Date(c.scheduledDate)) !== route.params.month) return false;
        if (c.status !== 'completed') return true; // unfinished
        const f = finsById[c.id];
        return !!f && f.overallPrice - f.paidAmount > 0.005; // finished but unpaid
      })
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [calls, caps.viewAllCalls, uid, route.params.month, finsById]);

  const subtitleFor = (c: ServiceCall) => {
    const f = finsById[c.id];
    if (caps.viewFinancials && f && f.overallPrice - f.paidAmount > 0.005) {
      return `יתרה לגבייה: ₪${Math.round(f.overallPrice - f.paidAmount).toLocaleString('he-IL')}`;
    }
    return showTeamPay
      ? `תשלום צוות: ₪${c.payouts.totalTechPayout.toLocaleString('he-IL')}`
      : `התשלום שלי: ₪${(c.payouts.splits[uid] ?? 0).toLocaleString('he-IL')}`;
  };

  const openCall = useCallback(
    (c: ServiceCall) => navigation.navigate('ServiceCallDetail', { callId: c.id }),
    [navigation]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={jobs}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ServiceCallCard call={item} subtitle={subtitleFor(item)} onPress={openCall} />
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{formatMonthLabel(route.params.month)}</Text>
            <Text style={styles.sub}>{jobs.length} עבודות פתוחות או לא משולמות</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין עבודות פתוחות בחודש זה.</Text>}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { padding: Layout.screenPadding },
  title: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  sub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 14 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
