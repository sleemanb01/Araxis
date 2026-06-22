import React, { useState } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JobCard } from '../components/JobCard';
import { FAB } from '../components/FAB';
import { SectionHeader } from '../components/SectionHeader';
import { useJobStore } from '../store/useJobStore';
import { useAuthStore } from '../store/useAuthStore';
import { Colors, StatusColors, StatusLabelsHe } from '../constants/colors';
import { Layout } from '../constants/layout';
import { Job, JobStatus } from '../types/job';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Completed jobs move to the Dashboard, so they aren't filtered here.
const STATUS_FILTERS: Array<{ key: JobStatus | 'all'; label: string }> = [
  { key: 'all',        label: 'הכל' },
  { key: 'scheduled',  label: StatusLabelsHe['scheduled'] },
  { key: 'en_route',   label: StatusLabelsHe['en_route'] },
  { key: 'in_progress',label: StatusLabelsHe['in_progress'] },
];

export function MyJobsScreen() {
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<JobStatus | 'all'>('all');
  const jobs = useJobStore((s) => s.jobs); // subscribe → re-render on Firestore updates
  const uid = useAuthStore((s) => s.user?.uid) ?? '';

  const allMyJobs = jobs.filter((j) => j.assignedTo === uid && j.status !== 'completed');
  const visibleJobs =
    activeFilter === 'all'
      ? allMyJobs
      : allMyJobs.filter((j) => j.status === activeFilter);

  function handleJobPress(job: Job) {
    if (job.status === 'in_progress' || job.status === 'en_route') {
      navigation.navigate('JobExecution', { jobId: job.id });
    } else {
      navigation.navigate('JobCoordination', { jobId: job.id });
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <SectionHeader title="המשימות שלי" count={allMyJobs.length} />

        {/* Status filter tabs */}
        <View style={styles.tabBar}>
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            const color = f.key === 'all' ? Colors.primary : StatusColors[f.key as JobStatus];
            return (
              <TouchableOpacity
                key={f.key}
                style={styles.tab}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <Text
                  style={[styles.tabText, isActive && { color, fontWeight: '700' }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {f.label}
                </Text>
                <View
                  style={[
                    styles.tabIndicator,
                    { backgroundColor: isActive ? color : 'transparent' },
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          data={visibleJobs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <JobCard job={item} onPress={handleJobPress} canCall />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      </View>
      <FAB onPress={() => navigation.navigate('NewJob')} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 10,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
    paddingHorizontal: 3,
  },
  tabIndicator: {
    height: 3,
    width: '80%',
    borderRadius: 2,
    marginTop: 8,
  },
  list: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.tabBarHeight + Layout.fabSize + 16,
  },
});
