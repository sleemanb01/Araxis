import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ScrollView, ActivityIndicator, TouchableOpacity, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ServiceCallCard } from '../components/ServiceCallCard';
import { SectionHeader } from '../components/SectionHeader';
import { CustomButton } from '../components/CustomButton';
import { Calendar } from '../components/Calendar';
import { FAB } from '../components/FAB';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { useInventory } from '../context/InventoryContext';
import { subscribeToArchive, ArchiveSummary } from '../services/archiveService';
import { useFinancialData } from '../hooks/useFinancialData';
import { ServiceCall } from '../types/serviceCall';
import { dayKey, monthKey, callProfit, itemPriceMap } from '../utils/finance';
import { formatMonthLabel } from '../utils/date';
import { containsCI } from '../utils/format';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const STRIP_DAYS = 15; // today + 2 weeks ahead

export function DashboardScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, caps } = useUser();
  const { calls, loading } = useLiveMetrics();
  const { items } = useInventory();
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

  const [tab, setTab] = useState<'schedule' | 'months'>('schedule');
  const [selectedDay, setSelectedDay] = useState(() => new Date());
  const [calOpen, setCalOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [archive, setArchive] = useState<ArchiveSummary>({ monthlyProfit: {}, lastExportAt: null });

  useEffect(() => {
    if (!caps.viewFinancials) return;
    return subscribeToArchive(setArchive, () => {});
  }, [caps.viewFinancials]);

  // Financials aren't on the live call docs; one shared cached fetch covers them.
  const { finsById: fins } = useFinancialData(caps.viewFinancials);

  /** Days that have jobs — green dots on the strip and the calendar. */
  const jobDays = useMemo(() => {
    const s = new Set<string>();
    mine.forEach((c) => s.add(dayKey(new Date(c.scheduledDate))));
    return s;
  }, [mine]);

  const stripDays = useMemo(() => {
    const base = new Date();
    return Array.from(
      { length: STRIP_DAYS },
      (_, i) => new Date(base.getFullYear(), base.getMonth(), base.getDate() + i)
    );
  }, []);

  // Search across ALL jobs by customer name or phone (any date, any status).
  const searchResults = useMemo(() => {
    const q = search.trim();
    if (!searchOpen || !q) return null;
    const qDigits = q.replace(/\D/g, '').replace(/^972/, '0');
    const phoneOf = (c: ServiceCall) => (c.contactPhone ?? '').replace(/\D/g, '').replace(/^972/, '0');
    return mine
      .filter((c) => containsCI(c.clientName, q) || (!!qDigits && phoneOf(c).includes(qDigits)))
      .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  }, [mine, search, searchOpen]);

  const dayJobs = useMemo(() => {
    const k = dayKey(selectedDay);
    return mine
      .filter((c) => dayKey(new Date(c.scheduledDate)) === k)
      .sort(
        (a, b) =>
          // finished jobs sink to the bottom; within each group, by time
          (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0) ||
          a.scheduledDate.localeCompare(b.scheduledDate)
      );
  }, [mine, selectedDay]);

  // "Months" → one row per month with its profit + how many jobs are still
  // OPEN (unfinished, or finished but not fully paid). Live months are merged
  // with the archived monthly totals, so recycled months still show.
  const months = useMemo(() => {
    const priceMap = itemPriceMap(items);
    const m: Record<string, number> = { ...archive.monthlyProfit };
    const open: Record<string, number> = {};
    mine.forEach((c) => {
      const k = monthKey(new Date(c.scheduledDate));
      const f = fins[c.id] ?? null;
      m[k] = (m[k] ?? 0) + callProfit(c, f, priceMap);
      const isOpen = c.status !== 'completed' || (!!f && f.overallPrice - f.paidAmount > 0.005);
      if (isOpen) open[k] = (open[k] ?? 0) + 1;
    });
    return Object.entries(m)
      .sort((a, b) => b[0].localeCompare(a[0])) // most recent first
      .map(([month, profit]) => ({ month, profit, open: open[month] ?? 0 }));
  }, [mine, fins, items, archive]);

  const subtitleFor = (c: ServiceCall) =>
    showTeamPay
      ? `תשלום צוות: ₪${c.payouts.totalTechPayout.toLocaleString('he-IL')}`
      : `התשלום שלי: ₪${(c.payouts.splits[uid] ?? 0).toLocaleString('he-IL')}`;

  const openCall = useCallback(
    (c: ServiceCall) => navigation.navigate('ServiceCallDetail', { callId: c.id }),
    [navigation]
  );

  const selectedKey = dayKey(selectedDay);
  const header = (
    <View>
      <SectionHeader
        title="הקריאות שלי"
        count={searchResults ? searchResults.length : tab === 'schedule' ? dayJobs.length : mine.length}
      />
      <View style={styles.segment}>
        <TouchableOpacity
          style={styles.searchToggle}
          onPress={() => {
            setSearchOpen((o) => !o);
            setSearch('');
          }}
          activeOpacity={0.8}
        >
          <Ionicons name={searchOpen ? 'close' : 'search'} size={18} color={Colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'schedule' && styles.segBtnOn]}
          onPress={() => {
            setTab('schedule');
            setSelectedDay(new Date()); // "today" jumps back to today
          }}
          activeOpacity={0.8}
        >
          <Text style={[styles.segText, tab === 'schedule' && styles.segTextOn]}>היום</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segBtn, tab === 'months' && styles.segBtnOn]}
          onPress={() => setTab('months')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segText, tab === 'months' && styles.segTextOn]}>הכל</Text>
        </TouchableOpacity>
      </View>

      {searchOpen && (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={17} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="חיפוש לפי שם לקוח או טלפון…"
            placeholderTextColor={Colors.textSecondary}
            value={search}
            onChangeText={setSearch}
            textAlign="right"
            autoFocus
          />
        </View>
      )}

      {tab === 'schedule' && !searchOpen && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.strip}
          contentContainerStyle={styles.stripRow}
        >
          <TouchableOpacity
            style={[styles.dayChip, styles.calChip]}
            onPress={() => setCalOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="calendar-outline" size={22} color={Colors.primary} />
          </TouchableOpacity>
          {stripDays.map((d) => {
            const k = dayKey(d);
            const sel = k === selectedKey;
            return (
              <TouchableOpacity
                key={k}
                style={[styles.dayChip, sel && styles.dayChipOn]}
                onPress={() => setSelectedDay(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dayChipWd, sel && styles.dayChipTextOn]}>
                  {d.toLocaleDateString('he-IL', { weekday: 'short' })}
                </Text>
                <Text style={[styles.dayChipNum, sel && styles.dayChipTextOn]}>{d.getDate()}</Text>
                <View style={[styles.jobDot, !jobDays.has(k) && styles.jobDotOff, sel && jobDays.has(k) && styles.jobDotOn]} />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const emptyComp = loading ? (
    <ActivityIndicator color={Colors.primary} style={{ marginTop: 40 }} />
  ) : (
    <Text style={styles.empty}>{tab === 'schedule' ? 'אין עבודות ביום זה.' : 'אין קריאות קרובות.'}</Text>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {searchResults ? (
        <FlatList
          data={searchResults}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ServiceCallCard call={item} subtitle={subtitleFor(item)} onPress={openCall} />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={styles.empty}>לא נמצאו עבודות.</Text>}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />
      ) : tab === 'schedule' ? (
        <FlatList
          data={dayJobs}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <ServiceCallCard call={item} subtitle={subtitleFor(item)} onPress={openCall} />
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyComp}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          data={months}
          keyExtractor={(m) => m.month}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.monthRow}
              onPress={() => navigation.navigate('MonthJobs', { month: item.month })}
              activeOpacity={0.8}
            >
              <Text style={styles.chevMonth}>‹</Text>
              {caps.viewFinancials && (
                <Text style={[styles.monthProfit, item.profit < 0 && styles.monthProfitNeg]}>
                  ₪{Math.round(item.profit).toLocaleString('he-IL')}
                </Text>
              )}
              <View style={styles.monthInfo}>
                <Text style={styles.monthName}>{formatMonthLabel(item.month)}</Text>
                <Text style={styles.monthMeta}>
                  {item.open > 0 ? `${item.open} עבודות פתוחות` : 'אין עבודות פתוחות'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListHeaderComponent={header}
          ListEmptyComponent={emptyComp}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {caps.createCalls && (
        <FAB onPress={() => navigation.navigate('NewServiceCall')} bottomOffset={Layout.tabBarHeight} />
      )}

      <Modal visible={calOpen} transparent animationType="fade" onRequestClose={() => setCalOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Calendar
              selected={selectedDay}
              onSelect={(d) => {
                setSelectedDay(d);
                setCalOpen(false);
              }}
              markedDays={jobDays}
              allowPast
            />
            <CustomButton label="סגור" variant="ghost" onPress={() => setCalOpen(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  list: { paddingHorizontal: Layout.screenPadding, paddingBottom: Layout.tabBarHeight + 16 },
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
  searchToggle: {
    width: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 4,
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: Colors.textPrimary },
  strip: { height: 74, marginTop: 12, marginBottom: 4 },
  stripRow: { gap: 8, alignItems: 'center' },
  dayChip: {
    width: 52,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayChipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayChipWd: { fontSize: 11, color: Colors.textSecondary, fontWeight: '600' },
  dayChipNum: { fontSize: 17, color: Colors.textPrimary, fontWeight: '700' },
  dayChipTextOn: { color: '#FFFFFF' },
  jobDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#1E9E5A' },
  jobDotOn: { backgroundColor: '#FFFFFF' },
  jobDotOff: { backgroundColor: 'transparent' },
  calChip: { justifyContent: 'center' },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  modalCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 16 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  chevMonth: { fontSize: 24, color: Colors.textSecondary, marginEnd: 8 },
  monthProfit: { fontSize: 16, fontWeight: '800', color: '#1E9E5A', writingDirection: 'ltr', marginEnd: 12 },
  monthProfitNeg: { color: Colors.danger },
  monthInfo: { flex: 1, alignItems: 'flex-end' },
  monthName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  monthMeta: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  empty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 30, fontSize: 15 },
});
