import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ServiceCallCard } from '../components/ServiceCallCard';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { ServiceCall } from '../types/serviceCall';
import { dayKey } from '../utils/finance';
import { formatDayLabel } from '../utils/date';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteP = RouteProp<RootStackParamList, 'DayJobs'>;

export function DayJobsScreen() {
  const route = useRoute<RouteP>();
  const navigation = useNavigation<Nav>();
  const { profile, caps } = useUser();
  const { calls } = useLiveMetrics();
  const uid = profile?.uid ?? '';
  const showTeamPay = caps.viewTeamPayouts;

  const dayJobs = useMemo(() => {
    const mine = caps.viewAllCalls
      ? calls
      : calls.filter((c) => c.teamAssignment.leadTech === uid || c.teamAssignment.assistants.includes(uid));
    return mine
      .filter((c) => dayKey(new Date(c.scheduledDate)) === route.params.day)
      .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
  }, [calls, caps.viewAllCalls, uid, route.params.day]);

  const subtitleFor = (c: ServiceCall) =>
    showTeamPay
      ? `תשלום צוות: ₪${c.payouts.totalTechPayout.toLocaleString('he-IL')}`
      : `התשלום שלי: ₪${(c.payouts.splits[uid] ?? 0).toLocaleString('he-IL')}`;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={dayJobs}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ServiceCallCard
            call={item}
            subtitle={subtitleFor(item)}
            onPress={(c) => navigation.navigate('ServiceCallDetail', { callId: c.id })}
          />
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>{formatDayLabel(route.params.day)}</Text>
            <Text style={styles.sub}>{dayJobs.length} עבודות</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין עבודות ליום זה.</Text>}
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
