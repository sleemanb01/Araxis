import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
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

  const subtitleFor = (c: ServiceCall) =>
    showTeamPay
      ? `תשלום צוות: ₪${c.payouts.totalTechPayout.toLocaleString('he-IL')}`
      : `התשלום שלי: ₪${(c.payouts.splits[uid] ?? 0).toLocaleString('he-IL')}`;

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
            {caps.createCalls && (
              <CustomButton
                label="+ קריאה חדשה"
                onPress={() => navigation.navigate('NewServiceCall')}
                style={styles.newBtn}
              />
            )}
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
  newBtn: { marginTop: 14 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
