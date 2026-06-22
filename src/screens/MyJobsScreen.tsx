import React, { useState } from 'react';
import { View, FlatList, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
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

const STATUS_FILTERS: Array<{ key: JobStatus | 'all'; label: string }> = [
  { key: 'all',        label: 'הכל' },
  { key: 'scheduled',  label: StatusLabelsHe['scheduled'] },
  { key: 'en_route',   label: StatusLabelsHe['en_route'] },
  { key: 'in_progress',label: StatusLabelsHe['in_progress'] },
  { key: 'completed',  label: StatusLabelsHe['completed'] },
];

export function MyJobsScreen() {
  const navigation = useNavigation<Nav>();
  const [activeFilter, setActiveFilter] = useState<JobStatus | 'all'>('all');
  const jobs = useJobStore((s) => s.jobs); // subscribe → re-render on Firestore updates
  const uid = useAuthStore((s) => s.user?.uid) ?? '';

  const allMyJobs = jobs.filter((j) => j.assignedTo === uid);
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

        {/* Filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {STATUS_FILTERS.map((f) => {
            const isActive = activeFilter === f.key;
            const color = f.key === 'all' ? Colors.primary : StatusColors[f.key as JobStatus];
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.chip, isActive && { backgroundColor: color, borderColor: color }]}
                onPress={() => setActiveFilter(f.key)}
              >
                <Text style={[styles.chipText, isActive && { color: '#FFF' }]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: 10,
    gap: 8,
  },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: Colors.surface,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  list: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.tabBarHeight + Layout.fabSize + 16,
  },
});
