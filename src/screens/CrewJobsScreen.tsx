import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getAllCalls } from '../services/serviceCallService';
import { ServiceCall } from '../types/serviceCall';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'CrewJobs'>;

function formatDate(iso: string): string {
  return iso ? new Date(iso).toLocaleDateString('he-IL') : '';
}

export function CrewJobsScreen() {
  const route = useRoute<RouteP>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [jobs, setJobs] = useState<ServiceCall[]>([]);

  useEffect(() => {
    let cancelled = false;
    getAllCalls()
      .then((all) => {
        if (cancelled) return;
        setJobs(
          all
            .filter((c) => c.crewId === route.params.crewId && c.status === 'completed')
            .sort((a, b) => +new Date(b.scheduledDate) - +new Date(a.scheduledDate))
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [route.params.crewId]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={jobs}
        keyExtractor={(j) => j.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.row}
            onPress={() => navigation.navigate('ServiceCallDetail', { callId: item.id })}
            activeOpacity={0.8}
          >
            <Text style={styles.chev}>‹</Text>
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>{item.clientName}</Text>
              <Text style={styles.meta} numberOfLines={1}>
                {formatDate(item.scheduledDate)}
                {item.address ? ' · ' + item.address : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={
          <View>
            <Text style={styles.title}>עבודות שבוצעו</Text>
            <Text style={styles.sub}>{jobs.length} עבודות</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>אין עבודות שהושלמו עדיין.</Text>}
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
  chev: { fontSize: 24, color: Colors.textSecondary },
  info: { flex: 1, marginStart: 12, alignItems: 'flex-end' },
  name: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  meta: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 3 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
