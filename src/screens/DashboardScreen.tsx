import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ServiceCallCard } from '../components/ServiceCallCard';
import { SectionHeader } from '../components/SectionHeader';
import { CustomButton } from '../components/CustomButton';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { ServiceCall } from '../types/serviceCall';
import { dayKey } from '../utils/finance';
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
  const sections = useMemo(() => {
    const todayKey = dayKey(new Date());
    const byDate = [...mine].sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate));
    if (filter === 'today') {
      const data = byDate.filter((c) => dayKey(new Date(c.scheduledDate)) === todayKey);
      return data.length ? [{ title: '', data }] : [];
    }
    // All jobs, grouped into one list per calendar day.
    const map = new Map<string, ServiceCall[]>();
    byDate.forEach((c) => {
      const k = dayKey(new Date(c.scheduledDate));
      const arr = map.get(k);
      if (arr) arr.push(c);
      else map.set(k, [c]);
    });
    return Array.from(map.values()).map((data) => ({
      title: new Date(data[0].scheduledDate).toLocaleDateString('he-IL', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }),
      data,
    }));
  }, [mine, filter]);
  const total = sections.reduce((n, s) => n + s.data.length, 0);

  const subtitleFor = (c: ServiceCall) =>
    showTeamPay
      ? `תשלום צוות: ₪${c.payouts.totalTechPayout.toLocaleString('he-IL')}`
      : `התשלום שלי: ₪${(c.payouts.splits[uid] ?? 0).toLocaleString('he-IL')}`;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <SectionList
        sections={sections}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ServiceCallCard
            call={item}
            subtitle={subtitleFor(item)}
            onPress={(c) => navigation.navigate('ServiceCallDetail', { callId: c.id })}
          />
        )}
        renderSectionHeader={({ section }) =>
          section.title ? <Text style={styles.dateHeader}>{section.title}</Text> : null
        }
        stickySectionHeadersEnabled={false}
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
            <SectionHeader title="הקריאות שלי" count={total} />
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
  dateHeader: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary, textAlign: 'right', marginTop: 16, marginBottom: 8 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
