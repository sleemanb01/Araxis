import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { JobCard } from '../components/JobCard';
import { useJobStore } from '../store/useJobStore';
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { Job } from '../types/job';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const HE_WEEKDAYS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

function dayKey(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d;
  return `${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`;
}

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const uid = useAuthStore((s) => s.user?.uid) ?? '';
  const jobs = useJobStore((s) => s.jobs);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [pastOpen, setPastOpen] = useState(false);
  const [owedOpen, setOwedOpen] = useState(false);

  const mine = useMemo(() => jobs.filter((j) => j.assignedTo === uid), [jobs, uid]);
  const active = useMemo(() => mine.filter((j) => j.status !== 'completed'), [mine]);
  const completed = useMemo(() => mine.filter((j) => j.status === 'completed'), [mine]);
  // Revenue from all assigned jobs, based on the actual amount paid.
  const income = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const collected = mine.reduce((s, j) => s + (j.paidAmount ?? 0), 0);
    const owed = mine.reduce((s, j) => s + Math.max(0, (j.price ?? 0) - (j.paidAmount ?? 0)), 0);
    const expected = mine.reduce((s, j) => s + (j.price ?? 0), 0);
    const month = mine.reduce((s, j) => {
      if (!j.paidAt) return s;
      const d = new Date(j.paidAt);
      return d.getFullYear() === y && d.getMonth() === m ? s + (j.paidAmount ?? 0) : s;
    }, 0);
    return { total: collected, month, paid: collected, owed, expected };
  }, [mine]);

  // Jobs that still owe money (price greater than paid so far).
  const unpaidJobs = useMemo(
    () => mine.filter((j) => (j.price ?? 0) - (j.paidAmount ?? 0) > 0),
    [mine]
  );

  // Next 14 days, each with a count of my active jobs scheduled that day.
  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const key = dayKey(d);
      const count = active.filter((j) => j.scheduledAt && dayKey(j.scheduledAt) === key).length;
      return { date: d, key, count };
    });
  }, [active]);

  const shown = useMemo(
    () =>
      selectedKey
        ? active.filter((j) => j.scheduledAt && dayKey(j.scheduledAt) === selectedKey)
        : active,
    [active, selectedKey]
  );

  function handlePress(job: Job) {
    navigation.navigate('JobCoordination', { jobId: job.id });
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>לוח בקרה</Text>

        <View style={styles.metrics}>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>סך הכנסות</Text>
            <Text style={styles.metricValue}>₪{income.total}</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricLabel}>הכנסות החודש</Text>
            <Text style={styles.metricValue}>₪{income.month}</Text>
          </View>
        </View>

        <View style={styles.payRow}>
          <View style={styles.payCell}>
            <Text style={[styles.payVal, { color: '#16A34A' }]}>₪{income.paid}</Text>
            <Text style={styles.payLabel}>נגבה</Text>
          </View>
          <TouchableOpacity style={styles.payCell} onPress={() => setOwedOpen(true)} activeOpacity={0.7}>
            <Text style={[styles.payVal, { color: '#854F0B' }]}>₪{income.owed}</Text>
            <Text style={styles.payLabel}>ממתין לתשלום ›</Text>
          </TouchableOpacity>
          <View style={styles.payCell}>
            <Text style={[styles.payVal, { color: Colors.textSecondary }]}>₪{income.expected}</Text>
            <Text style={styles.payLabel}>שווי כולל</Text>
          </View>
        </View>

        <View style={styles.calHeader}>
          <Text style={styles.calTitle}>השבועיים הקרובים</Text>
          <TouchableOpacity
            style={styles.calLink}
            onPress={() => navigation.navigate('FullCalendar')}
            activeOpacity={0.7}
          >
            <Text style={styles.calLinkText}>יומן מלא</Text>
            <Ionicons name="chevron-back" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.calendar}
        >
          {days.map(({ date, key, count }) => {
            const selected = selectedKey === key;
            return (
              <TouchableOpacity
                key={key}
                style={[styles.dayCell, selected && styles.dayCellSelected]}
                onPress={() => setSelectedKey(selected ? null : key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.weekday, selected && styles.daySelText]}>
                  {HE_WEEKDAYS[date.getDay()]}
                </Text>
                <Text style={[styles.dayNum, selected && styles.daySelText]}>
                  {date.getDate()}
                </Text>
                {count > 0 ? (
                  <View style={[styles.dot, selected && styles.dotSelected]}>
                    <Text style={[styles.dotText, selected && styles.dotTextSelected]}>{count}</Text>
                  </View>
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={styles.sectionTitle}>
          {selectedKey ? 'משימות ביום זה' : 'המשימות שמשובצות אליי'} · {shown.length}
        </Text>
        {shown.length === 0 ? (
          <Text style={styles.empty}>
            {selectedKey ? 'אין משימות ביום זה.' : 'אין משימות משובצות.'}
          </Text>
        ) : (
          shown.map((job) => <JobCard key={job.id} job={job} onPress={handlePress} canCall />)
        )}

        {/* Past jobs — collapsible */}
        <TouchableOpacity
          style={styles.collapseHeader}
          onPress={() => setPastOpen((o) => !o)}
          activeOpacity={0.7}
        >
          <Text style={styles.collapseTitle}>עבודות קודמות · {completed.length}</Text>
          <Ionicons
            name={pastOpen ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
        {pastOpen &&
          (completed.length === 0 ? (
            <Text style={styles.empty}>אין עבודות קודמות.</Text>
          ) : (
            completed.map((job) => (
              <JobCard key={job.id} job={job} onPress={handlePress} />
            ))
          ))}
      </ScrollView>

      <Modal
        visible={owedOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setOwedOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ממתין לתשלום · ₪{income.owed}</Text>
              <TouchableOpacity
                onPress={() => setOwedOpen(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {unpaidJobs.length === 0 ? (
                <Text style={styles.modalEmpty}>אין חובות פתוחים.</Text>
              ) : (
                unpaidJobs.map((j) => {
                  const remaining = (j.price ?? 0) - (j.paidAmount ?? 0);
                  return (
                    <TouchableOpacity
                      key={j.id}
                      style={styles.owedRow}
                      onPress={() => {
                        setOwedOpen(false);
                        navigation.navigate('JobCoordination', { jobId: j.id });
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.owedInfo}>
                        <Text style={styles.owedName} numberOfLines={1}>{j.customerName}</Text>
                        <Text style={styles.owedSub}>
                          שולם ₪{j.paidAmount ?? 0} מתוך ₪{j.price ?? 0}
                        </Text>
                      </View>
                      <View style={styles.owedRemainingWrap}>
                        <Text style={styles.owedRemaining}>₪{remaining}</Text>
                        <Text style={styles.owedRemainingLabel}>נותר</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.tabBarHeight + 16 },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    paddingTop: 10,
    paddingBottom: 12,
  },
  metrics: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  metric: { flex: 1, backgroundColor: Colors.surface, borderRadius: 10, padding: 14 },
  payRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  payCell: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    gap: 3,
  },
  payVal: { fontSize: 16, fontWeight: '700' },
  payLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center' },
  metricLabel: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 4 },
  metricValue: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginTop: 16,
    marginBottom: 10,
  },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 10,
  },
  calTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  calLink: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  calLinkText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  calendar: { gap: 8, paddingBottom: 2 },
  dayCell: {
    width: 52,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    gap: 4,
  },
  dayCellSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  weekday: { fontSize: 12, color: Colors.textSecondary },
  dayNum: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  daySelText: { color: '#FFFFFF' },
  dot: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotSelected: { backgroundColor: '#FFFFFF' },
  dotText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF' },
  dotTextSelected: { color: Colors.primary },
  dotPlaceholder: { height: 18 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 16, marginBottom: 8, fontSize: 14 },
  collapseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
    marginBottom: 10,
    paddingVertical: 4,
  },
  collapseTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 18,
    paddingBottom: 28,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  modalEmpty: { textAlign: 'center', color: Colors.textSecondary, paddingVertical: 24, fontSize: 15 },
  owedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  owedInfo: { flex: 1, minWidth: 0, marginEnd: 10 },
  owedName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  owedSub: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 3 },
  owedRemainingWrap: { alignItems: 'center' },
  owedRemaining: { fontSize: 16, fontWeight: '700', color: '#854F0B' },
  owedRemainingLabel: { fontSize: 11, color: Colors.textSecondary },
});
