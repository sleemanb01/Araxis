import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { JobCard } from '../components/JobCard';
import { useJobStore } from '../store/useJobStore';
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { Job } from '../types/job';
import { takePendingDatePick, clearPendingDatePick } from '../utils/datePicker';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type RouteP = RouteProp<RootStackParamList, 'FullCalendar'>;

const HE_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function dayKey(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}

function buildMonth(view: Date): (Date | null)[][] {
  const year = view.getFullYear();
  const month = view.getMonth();
  const startDay = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function FullCalendarScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const picker = route.params?.picker ?? false;
  const uid = useAuthStore((s) => s.user?.uid) ?? '';
  const jobs = useJobStore((s) => s.jobs);

  const [view, setView] = useState(() => {
    const init = route.params?.selected ? new Date(route.params.selected) : new Date();
    return new Date(init.getFullYear(), init.getMonth(), 1);
  });
  const [selectedKey, setSelectedKey] = useState<string | null>(
    route.params?.selected ? dayKey(route.params.selected) : dayKey(new Date())
  );

  const mine = useMemo(
    () => jobs.filter((j) => j.assignedTo === uid && j.scheduledAt),
    [jobs, uid]
  );
  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    mine.forEach((j) => {
      const k = dayKey(j.scheduledAt as string);
      m[k] = (m[k] ?? 0) + 1;
    });
    return m;
  }, [mine]);

  const weeks = useMemo(() => buildMonth(view), [view]);
  const monthLabel = view.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
  const todayKey = dayKey(new Date());

  const dayJobs = useMemo(
    () => (selectedKey ? mine.filter((j) => dayKey(j.scheduledAt as string) === selectedKey) : []),
    [mine, selectedKey]
  );

  function shiftMonth(delta: number) {
    setView((v) => new Date(v.getFullYear(), v.getMonth() + delta, 1));
  }
  function handlePress(job: Job) {
    navigation.navigate('JobCoordination', { jobId: job.id });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.monthRow}>
          <TouchableOpacity onPress={() => shiftMonth(-1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-forward" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.month}>{monthLabel}</Text>
          <TouchableOpacity onPress={() => shiftMonth(1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {HE_WEEKDAYS.map((w) => (
            <Text key={w} style={styles.weekdayHead}>
              {w}
            </Text>
          ))}
        </View>

        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((date, di) => {
              if (!date) return <View key={di} style={styles.cell} />;
              const k = dayKey(date);
              const count = counts[k] ?? 0;
              const selected = selectedKey === k;
              const isToday = k === todayKey;
              return (
                <TouchableOpacity
                  key={di}
                  style={styles.cell}
                  onPress={() => {
                    if (picker) {
                      const cb = takePendingDatePick();
                      clearPendingDatePick();
                      const picked = new Date(date);
                      picked.setHours(9, 0, 0, 0);
                      cb?.(picked.toISOString());
                      navigation.goBack();
                    } else {
                      setSelectedKey(k);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.dayInner,
                      selected && styles.daySelected,
                      !selected && isToday && styles.dayToday,
                    ]}
                  >
                    <Text style={[styles.dayNum, selected && styles.dayNumSel]}>{date.getDate()}</Text>
                  </View>
                  <View style={[styles.dot, count > 0 && (selected ? styles.dotSel : styles.dotOn)]} />
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {picker ? (
          <Text style={styles.pickerHint}>הקש על יום כדי לבחור תאריך</Text>
        ) : (
          <>
            <Text style={styles.listTitle}>
              {dayJobs.length > 0 ? `משימות · ${dayJobs.length}` : 'אין משימות ביום זה'}
            </Text>
            {dayJobs.map((job) => (
              <JobCard key={job.id} job={job} onPress={handlePress} canCall />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  month: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  weekRow: { flexDirection: 'row' },
  weekdayHead: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 4 },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: Colors.primary },
  dayToday: { borderWidth: 1, borderColor: Colors.primary },
  dayNum: { fontSize: 15, color: Colors.textPrimary },
  dayNumSel: { color: '#FFFFFF', fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 3, backgroundColor: 'transparent' },
  dotOn: { backgroundColor: Colors.primary },
  dotSel: { backgroundColor: Colors.primary },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginTop: 18,
    marginBottom: 10,
  },
  pickerHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 18,
  },
});
