import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ServiceCallCard } from '../components/ServiceCallCard';
import { SectionHeader } from '../components/SectionHeader';
import { CustomButton } from '../components/CustomButton';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { ServiceCall } from '../types/serviceCall';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, caps } = useUser();
  const { calls, loading } = useLiveMetrics();
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
  const dayEnd = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    return d.toISOString();
  }, []);
  const visible = filter === 'today' ? mine.filter((c) => c.scheduledDate < dayEnd) : mine;

  const subtitleFor = (c: ServiceCall) =>
    showTeamPay
      ? `תשלום צוות: ₪${c.payouts.totalTechPayout.toLocaleString('he-IL')}`
      : `התשלום שלי: ₪${(c.payouts.splits[uid] ?? 0).toLocaleString('he-IL')}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <FlatList
        data={visible}
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
            {caps.createCalls && (
              <CustomButton
                label="+ קריאה חדשה"
                onPress={() => navigation.navigate('NewServiceCall')}
                style={styles.newBtn}
              />
            )}
            <SectionHeader title="הקריאות שלי" count={visible.length} />
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
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
