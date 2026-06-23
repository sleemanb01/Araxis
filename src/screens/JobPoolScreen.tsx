import React from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { JobCard } from '../components/JobCard';
import { FAB } from '../components/FAB';
import { SectionHeader } from '../components/SectionHeader';
import { useJobStore } from '../store/useJobStore';
import { useShallow } from 'zustand/react/shallow';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { Job } from '../types/job';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function JobPoolScreen() {
  const navigation = useNavigation<Nav>();
  const poolJobs = useJobStore(useShallow((s) => s.getPoolJobs()));

  function handleJobPress(job: Job) {
    navigation.navigate('JobCoordination', { jobId: job.id });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <SectionHeader title="בריכת משימות" count={poolJobs.length} />
        <FlatList
          data={poolJobs}
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
  list: {
    paddingHorizontal: Layout.screenPadding,
    paddingBottom: Layout.tabBarHeight + Layout.fabSize + 16,
  },
});
