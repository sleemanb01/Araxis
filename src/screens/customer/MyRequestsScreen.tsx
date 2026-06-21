import React from 'react';
import { View, Text, FlatList, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { JobCard } from '../../components/JobCard';
import { FAB } from '../../components/FAB';
import { SectionHeader } from '../../components/SectionHeader';
import { useJobStore } from '../../store/useJobStore';
import { useAuthStore } from '../../store/useAuthStore';
import { Colors, StatusLabelsHe } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import { Job } from '../../types/job';
import type { RootStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function MyRequestsScreen() {
  const navigation = useNavigation<Nav>();
  const uid = useAuthStore((s) => s.user?.uid) ?? '';
  const myRequests = useJobStore((s) => s.getMyRequests(uid));

  function handlePress(job: Job) {
    const when = job.scheduledAt
      ? `\nמועד: ${new Date(job.scheduledAt).toLocaleString('he-IL')}`
      : '';
    Alert.alert('סטטוס הקריאה', `${job.description}\n\nסטטוס: ${StatusLabelsHe[job.status]}${when}`);
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <SectionHeader title="הקריאות שלי" count={myRequests.length} />
        <FlatList
          data={myRequests}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <JobCard job={item} onPress={handlePress} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>עדיין אין קריאות שירות</Text>
              <Text style={styles.emptySub}>לחץ על + כדי לפתוח קריאת שירות ראשונה</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      </View>
      <FAB onPress={() => navigation.navigate('NewRequest')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  list: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.tabBarHeight + Layout.fabSize + 16,
    flexGrow: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 8,
  },
  emptyText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  emptySub: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
});
