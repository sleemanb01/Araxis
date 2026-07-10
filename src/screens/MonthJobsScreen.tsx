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
import { ils } from '../utils/format';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteP = RouteProp<RootStackParamList, 'MonthJobs'>;

/** ALL of a month's jobs — finished included; unpaid ones flag their balance. */
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
      .filter((c) => monthKey(new Date(c.scheduledDate)) === route.params.month)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [calls, caps.viewAllCalls, uid, route.params.month]);

  const subtitleFor = (c: ServiceCall) => {
    const f = finsById[c.id];
    if (caps.viewFinancials && f && f.overallPrice - f.paidAmount > 0.005) {
      return `יתרה לגבייה: ${ils(f.overallPrice - f.paidAmount)}`;
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
            <Text style={styles.sub}>{jobs.length} עבודות</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין עבודות בחודש זה.</Text>}
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
