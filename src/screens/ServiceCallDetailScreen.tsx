import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { useUser } from '../context/UserContext';
import { useLiveMetrics } from '../context/LiveMetricsContext';
import { useInventory } from '../context/InventoryContext';
import { subscribeToFinancials, setCallStatus, setFinancials } from '../services/serviceCallService';
import { PrivateFinancials, ServiceCallStatus } from '../types/serviceCall';
import {
  financialStatus,
  balanceDue,
  profit,
  FINANCIAL_STATUS_HE,
} from '../utils/finance';
import { Colors, CallStatusColors, CallStatusLabelsHe } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';

type RouteP = RouteProp<RootStackParamList, 'ServiceCallDetail'>;

const NEXT_STATUS: Record<ServiceCallStatus, ServiceCallStatus | null> = {
  pending: 'active',
  active: 'completed',
  completed: null,
};

export function ServiceCallDetailScreen() {
  const route = useRoute<RouteP>();
  const { callId } = route.params;
  const { profile, caps } = useUser();
  const { calls } = useLiveMetrics();
  const { items } = useInventory();
  const uid = profile?.uid ?? '';

  const call = calls.find((c) => c.id === callId);
  const [fin, setFin] = useState<PrivateFinancials | null>(null);
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');

  useEffect(() => {
    if (!caps.viewFinancials) return;
    const unsub = subscribeToFinancials(callId, setFin);
    return () => unsub();
  }, [callId, caps.viewFinancials]);

  useEffect(() => {
    if (fin) {
      setPrice(String(fin.overallPrice));
      setPaid(String(fin.paidAmount));
    }
  }, [fin]);

  if (!call) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.missing}>הקריאה לא נמצאה</Text>
      </SafeAreaView>
    );
  }

  const showTeamPay = caps.viewTeamPayouts;
  const canAdvance = caps.createCalls || call.teamAssignment.leadTech === uid;
  const next = NEXT_STATUS[call.status];
  const hardwareNames = call.hardwareUsed.map(
    (id) => items.find((i) => i.id === id)?.itemName ?? id
  );
  const splitsToShow: [string, number][] = showTeamPay
    ? Object.entries(call.payouts.splits)
    : [[uid, call.payouts.splits[uid] ?? 0]];

  function advance() {
    if (!next) return;
    setCallStatus(callId, next).catch(() => Alert.alert('שגיאה', 'עדכון הסטטוס נכשל.'));
  }

  const priceN = Math.max(0, parseFloat(price) || 0);
  const paidN = Math.max(0, parseFloat(paid) || 0);

  function saveFinancials() {
    setFinancials(callId, { overallPrice: priceN, paidAmount: paidN }).catch(() =>
      Alert.alert('שגיאה', 'שמירת הכספים נכשלה.')
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Text style={styles.client}>{call.clientName}</Text>
          <View style={[styles.badge, { backgroundColor: CallStatusColors[call.status] }]}>
            <Text style={styles.badgeText}>{CallStatusLabelsHe[call.status]}</Text>
          </View>
        </View>
        <Text style={styles.date}>{new Date(call.scheduledDate).toLocaleDateString('he-IL')}</Text>

        <Text style={styles.section}>צוות</Text>
        <Text style={styles.line}>
          ראש צוות: {call.teamAssignment.leadTech === uid ? 'אני' : call.teamAssignment.leadTech}
        </Text>
        <Text style={styles.line}>מסייעים: {call.teamAssignment.assistants.length}</Text>

        <Text style={styles.section}>ציוד שנוצל</Text>
        {hardwareNames.length ? (
          hardwareNames.map((n, i) => (
            <Text key={i} style={styles.line}>• {n}</Text>
          ))
        ) : (
          <Text style={styles.muted}>אין ציוד רשום</Text>
        )}

        <Text style={styles.section}>{showTeamPay ? 'חלוקת תשלום' : 'התשלום שלי'}</Text>
        {splitsToShow.map(([id, amt]) => (
          <View key={id} style={styles.payRow}>
            <Text style={styles.amount}>₪{amt.toLocaleString('he-IL')}</Text>
            <Text style={styles.line}>{id === uid ? 'אני' : id}</Text>
          </View>
        ))}
        {showTeamPay && (
          <View style={styles.payRow}>
            <Text style={styles.amountBold}>₪{call.payouts.totalTechPayout.toLocaleString('he-IL')}</Text>
            <Text style={styles.lineBold}>סה״כ תשלום צוות</Text>
          </View>
        )}

        {caps.viewFinancials && (
          <>
            <Text style={styles.section}>כספים</Text>
            <TextField label="מחיר ללקוח (₪)" value={price} onChange={setPrice} placeholder="0" keyboardType="numeric" />
            <TextField label="שולם (₪)" value={paid} onChange={setPaid} placeholder="0" keyboardType="numeric" />
            <View style={styles.payRow}>
              <Text style={styles.amount}>₪{balanceDue(priceN, paidN).toLocaleString('he-IL')}</Text>
              <Text style={styles.line}>יתרה</Text>
            </View>
            <View style={styles.payRow}>
              <Text style={styles.amountBold}>₪{profit(priceN, call.payouts.totalTechPayout).toLocaleString('he-IL')}</Text>
              <Text style={styles.lineBold}>רווח</Text>
            </View>
            <Text style={styles.finStatus}>{FINANCIAL_STATUS_HE[financialStatus(priceN, paidN)]}</Text>
            <CustomButton label="שמור כספים" variant="secondary" onPress={saveFinancials} style={styles.btnFin} />
          </>
        )}

        {canAdvance && next && (
          <CustomButton
            label={`סמן כ"${CallStatusLabelsHe[next]}"`}
            onPress={advance}
            style={styles.btn}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding, gap: 4 },
  missing: { textAlign: 'center', marginTop: 40, color: Colors.textSecondary, fontSize: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  client: { flex: 1, fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  badge: { borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#FFFFFF' },
  date: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  section: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginTop: 18, marginBottom: 6 },
  line: { fontSize: 15, color: Colors.textPrimary, textAlign: 'right' },
  lineBold: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  muted: { fontSize: 14, color: Colors.textSecondary, textAlign: 'right' },
  payRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  amount: { fontSize: 15, color: Colors.textPrimary },
  amountBold: { fontSize: 16, fontWeight: '800', color: Colors.primary },
  finStatus: { fontSize: 14, fontWeight: '700', color: Colors.primary, textAlign: 'right', marginTop: 6 },
  btn: { marginTop: 28 },
  btnFin: { marginTop: 10 },
});
