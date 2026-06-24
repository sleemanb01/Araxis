import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ServiceCallCard } from '../components/ServiceCallCard';
import { SectionHeader } from '../components/SectionHeader';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { ServiceCall } from '../types/serviceCall';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, role } = useUser();
  const { calls, loading } = useLiveMetrics();
  const uid = profile?.uid ?? '';
  const isJunior = role === 'junior_tech';

  // Role-scoped visibility. (Rules enforce this too; this filters the client copy.)
  const mine = useMemo(() => {
    if (role === 'admin') return calls;
    if (role === 'lead_tech') return calls.filter((c) => c.teamAssignment.leadTech === uid);
    return calls.filter((c) => c.teamAssignment.assistants.includes(uid));
  }, [calls, role, uid]);

  const payoutTotal = useMemo(
    () =>
      mine.reduce(
        (sum, c) => sum + (isJunior ? c.payouts.splits[uid] ?? 0 : c.payouts.totalTechPayout),
        0
      ),
    [mine, isJunior, uid]
  );

  const summaryLabel = isJunior
    ? 'התשלומים שלי'
    : role === 'lead_tech'
    ? 'תשלומי הצוות שלי'
    : 'סך תשלומי הצוותים';

  const subtitleFor = (c: ServiceCall) =>
    isJunior
      ? `התשלום שלי: ₪${(c.payouts.splits[uid] ?? 0).toLocaleString('he-IL')}`
      : `תשלום צוות: ₪${c.payouts.totalTechPayout.toLocaleString('he-IL')}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={mine}
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
            <Text style={styles.title}>שלום, {profile?.name ?? ''}</Text>
            <View style={styles.summary}>
              <Text style={styles.summaryLabel}>{summaryLabel}</Text>
              <Text style={styles.summaryValue}>₪{payoutTotal.toLocaleString('he-IL')}</Text>
              <Text style={styles.summarySub}>{mine.length} קריאות קרובות</Text>
            </View>
            <SectionHeader title="הקריאות שלי" count={mine.length} />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
          ) : (
            <Text style={styles.empty}>אין קריאות קרובות.</Text>
          )
        }
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.tabBarHeight + 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', paddingTop: 10 },
  summary: { backgroundColor: Colors.primary, borderRadius: 16, padding: 18, marginTop: 14, marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#DBEAFE', textAlign: 'right' },
  summaryValue: { fontSize: 30, fontWeight: '800', color: '#FFFFFF', textAlign: 'right', marginTop: 4 },
  summarySub: { fontSize: 13, color: '#DBEAFE', textAlign: 'right', marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
