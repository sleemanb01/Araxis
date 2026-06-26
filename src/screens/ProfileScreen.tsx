import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { ProgressRing } from '../components/ProgressRing';
import { useUser } from '../context/UserContext';
import { useInventory } from '../context/InventoryContext';
import { createCrew } from '../services/adminService';
import { getAllCalls, getFinancials } from '../services/serviceCallService';
import { subscribeToTargets, setMonthTarget } from '../services/targetsService';
import { monthlyProfit, dailyProfit, callProfit, monthKey, dayKey } from '../utils/finance';
import { ServiceCall, PrivateFinancials } from '../types/serviceCall';
import { capsLabel } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function ils(n: number): string {
  return '₪' + Math.round(n).toLocaleString('he-IL');
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { profile, caps, crews, signOut } = useUser();
  const { items } = useInventory();

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const [calls, setCalls] = useState<ServiceCall[]>([]);
  const [fins, setFins] = useState<(PrivateFinancials | null)[]>([]);
  const [targets, setTargets] = useState<Record<string, number>>({});
  const [settingTarget, setSettingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState('');
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    if (!caps.viewFinancials) return;
    let cancelled = false;
    (async () => {
      try {
        const cs = await getAllCalls();
        const fs = await Promise.all(cs.map((c) => getFinancials(c.id).catch(() => null)));
        if (!cancelled) {
          setCalls(cs);
          setFins(fs);
        }
      } catch {
        /* leave empty */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caps.viewFinancials]);

  useEffect(() => {
    if (!caps.viewFinancials) return;
    const unsub = subscribeToTargets(setTargets, () => {});
    return unsub;
  }, [caps.viewFinancials]);

  const monthly = useMemo(() => monthlyProfit(calls, fins, items), [calls, fins, items]);
  const daily = useMemo(() => dailyProfit(calls, fins, items), [calls, fins, items]);
  const crewProfits = useMemo(() => {
    const out: Record<string, number> = {};
    calls.forEach((c, i) => {
      if (c.crewId) out[c.crewId] = (out[c.crewId] ?? 0) + callProfit(c, fins[i], items);
    });
    return out;
  }, [calls, fins, items]);

  const now = new Date();
  const curKey = monthKey(now);
  const monthLabel = String(now.getMonth() + 1).padStart(2, '0') + '/' + now.getFullYear();
  const dayLabel = String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
  const monthProfit = monthly[curKey] ?? 0;
  const target = targets[curKey] ?? 0;
  const percent = target > 0 ? Math.round((monthProfit / target) * 100) : 0;
  const year = Array.from({ length: 12 }, (_, m) => monthly[`${viewYear}-${String(m + 1).padStart(2, '0')}`] ?? 0);
  const maxAbs = Math.max(1, ...year.map((v) => Math.abs(v)));

  // Daily target is the monthly target spread evenly across the month.
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyTarget = target > 0 ? target / daysInMonth : 0;
  const todayProfit = daily[dayKey(now)] ?? 0;
  const dayPercent = dailyTarget > 0 ? Math.round((todayProfit / dailyTarget) * 100) : 0;

  if (!profile) return null;

  async function doCreate() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const crewId = await createCrew(name);
      setSaving(false);
      setCreating(false);
      setNewName('');
      if (crewId) navigation.navigate('CrewDetail', { crewId });
    } catch (e: any) {
      setSaving(false);
      Alert.alert('שגיאה', e?.message ?? 'יצירת הצוות נכשלה (ודא שפונקציית הענן פרוסה).');
    }
  }

  function openSetTarget() {
    setTargetInput(target > 0 ? String(target) : '');
    setSettingTarget(true);
  }
  async function saveTarget() {
    const amount = Math.max(0, parseFloat(targetInput) || 0);
    try {
      await setMonthTarget(curKey, amount);
      setTargets((prev) => ({ ...prev, [curKey]: amount })); // reflect immediately
      setSettingTarget(false);
    } catch {
      Alert.alert('שגיאה', 'שמירת היעד נכשלה.');
    }
  }

  const monthColor =
    target <= 0 ? Colors.textSecondary : percent >= 100 ? '#1E9E5A' : percent >= 50 ? '#D97706' : Colors.danger;
  const dayColor =
    dailyTarget <= 0
      ? todayProfit < 0
        ? Colors.danger
        : '#1E9E5A'
      : dayPercent >= 100
      ? '#1E9E5A'
      : dayPercent >= 50
      ? '#D97706'
      : Colors.danger;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.container}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.role}>{capsLabel(caps)}</Text>

        {caps.viewFinancials && (
          <>
            <View style={styles.circlesRow}>
              <TouchableOpacity onPress={() => navigation.navigate('FinancialDashboard')} activeOpacity={0.85}>
                <ProgressRing size={150} strokeWidth={12} progress={dailyTarget > 0 ? dayPercent / 100 : 1} color={dayColor}>
                  <Text style={styles.rLabel}>{dayLabel}</Text>
                  {dailyTarget > 0 ? (
                    <>
                      <Text style={[styles.rValue, { color: dayColor }]}>{dayPercent}%</Text>
                      <Text style={styles.rSub}>{ils(todayProfit)} / {ils(dailyTarget)}</Text>
                    </>
                  ) : (
                    <Text style={[styles.rValue, { color: dayColor }]}>{ils(todayProfit)}</Text>
                  )}
                </ProgressRing>
              </TouchableOpacity>

              <TouchableOpacity onPress={openSetTarget} activeOpacity={0.85}>
                <ProgressRing size={150} strokeWidth={12} progress={target > 0 ? percent / 100 : 0} color={monthColor}>
                  <Text style={styles.rLabel}>{monthLabel}</Text>
                  {target > 0 ? (
                    <>
                      <Text style={[styles.rValue, { color: monthColor }]}>{percent}%</Text>
                      <Text style={styles.rSub}>{ils(monthProfit)} / {ils(target)}</Text>
                    </>
                  ) : (
                    <Text style={styles.rSet}>הגדר יעד</Text>
                  )}
                </ProgressRing>
              </TouchableOpacity>
            </View>

            <View style={styles.chart}>
              <View style={styles.chartHeader}>
                <TouchableOpacity onPress={() => setViewYear((y) => y - 1)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.yearNav}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.chartTitle}>{viewYear}</Text>
                <TouchableOpacity
                  onPress={() => setViewYear((y) => Math.min(y + 1, now.getFullYear()))}
                  disabled={viewYear >= now.getFullYear()}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.yearNav, viewYear >= now.getFullYear() && styles.yearNavOff]}>›</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.bars}>
                {year.map((val, m) => {
                  const h = Math.max(2, Math.round((Math.abs(val) / maxAbs) * 64));
                  const tgt = targets[`${viewYear}-${String(m + 1).padStart(2, '0')}`] ?? 0;
                  const pct = tgt > 0 ? (val / tgt) * 100 : -1; // -1 = no target set
                  const color = pct < 0 ? '#CBD5E1' : pct >= 100 ? '#1E9E5A' : pct >= 50 ? '#D97706' : Colors.danger;
                  return (
                    <View key={m} style={styles.barCol}>
                      <View style={[styles.bar, { height: h, backgroundColor: color }]} />
                      <Text style={styles.barLabel}>{m + 1}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </>
        )}

        <View style={styles.crewSection}>
          <View style={styles.crewHeader}>
            {caps.manageCrew && (
              <TouchableOpacity style={styles.addBtn} onPress={() => setCreating(true)} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addText}>צוות חדש</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.crewTitle}>הצוותים שלי</Text>
          </View>
          <FlatList
            data={crews}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.crewRow}
                onPress={() => navigation.navigate('CrewDetail', { crewId: item.id })}
                activeOpacity={0.8}
              >
                <Text style={styles.chev}>‹</Text>
                {caps.viewFinancials && (
                  <View style={styles.crewProfitBox}>
                    <Text style={[styles.crewProfit, (crewProfits[item.id] ?? 0) < 0 && styles.crewProfitNeg]}>
                      {ils(crewProfits[item.id] ?? 0)}
                    </Text>
                    <Text style={styles.crewProfitCap}>רווח</Text>
                  </View>
                )}
                <View style={styles.crewInfo}>
                  <Text style={styles.crewName}>{item.name}</Text>
                  <Text style={styles.crewMeta}>
                    {item.memberIds.length} חברים
                    {item.manager === profile.uid ? ' · אתה המנהל' : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.crewEmpty}>אינך חבר באף צוות עדיין.</Text>}
            style={styles.crewList}
            showsVerticalScrollIndicator={false}
          />
        </View>

        <CustomButton label="התנתק" variant="danger" onPress={signOut} style={styles.btn} />
      </View>

      <Modal visible={creating} transparent animationType="fade" onRequestClose={() => setCreating(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>צוות חדש</Text>
            <TextField label="שם הצוות" value={newName} onChange={setNewName} placeholder="לדוגמה: צוות צפון" />
            <CustomButton label="צור" onPress={doCreate} loading={saving} disabled={!newName.trim()} style={styles.btn} />
            <CustomButton label="ביטול" variant="ghost" onPress={() => setCreating(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={settingTarget} transparent animationType="fade" onRequestClose={() => setSettingTarget(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>יעד ל{now.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}</Text>
            <TextField label="סכום יעד (₪)" value={targetInput} onChange={setTargetInput} placeholder="0" keyboardType="numeric" />
            <CustomButton label="שמור" onPress={saveTarget} style={styles.btn} />
            <CustomButton label="ביטול" variant="ghost" onPress={() => setSettingTarget(false)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, alignItems: 'center', padding: Layout.screenPadding, paddingTop: 28 },
  name: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  role: { fontSize: 15, color: Colors.textSecondary, marginTop: 2 },
  circlesRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 18 },
  rLabel: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
  rValue: { fontSize: 24, fontWeight: '800', marginTop: 4, writingDirection: 'ltr' },
  rSub: { color: Colors.textSecondary, fontSize: 10, marginTop: 3, writingDirection: 'ltr' },
  rSet: { color: Colors.textPrimary, fontSize: 15, fontWeight: '700', marginTop: 6 },
  chart: {
    alignSelf: 'stretch',
    marginTop: 18,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
  },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  chartTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', flex: 1, writingDirection: 'ltr' },
  yearNav: { fontSize: 26, color: Colors.primary, fontWeight: '700', paddingHorizontal: 12 },
  yearNavOff: { color: Colors.border },
  bars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 80 },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: 11, borderRadius: 3, backgroundColor: Colors.primary },
  barLabel: { fontSize: 9, color: Colors.textSecondary, marginTop: 4 },
  crewSection: { alignSelf: 'stretch', flex: 1, marginTop: 18 },
  crewHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  crewTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  addText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  crewList: { flex: 1, alignSelf: 'stretch' },
  crewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },
  crewProfitBox: { alignItems: 'center', marginHorizontal: 10 },
  crewProfit: { fontSize: 15, fontWeight: '800', color: '#1E9E5A', writingDirection: 'ltr' },
  crewProfitNeg: { color: Colors.danger },
  crewProfitCap: { fontSize: 10, color: Colors.textSecondary, marginTop: 1 },
  crewInfo: { flex: 1, alignItems: 'flex-end' },
  crewName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  crewMeta: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginTop: 2 },
  chev: { fontSize: 24, color: Colors.textSecondary },
  crewEmpty: { textAlign: 'center', color: Colors.textSecondary, marginTop: 24, fontSize: 14 },
  btn: { alignSelf: 'stretch', marginTop: 12 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  modalCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 14 },
});
