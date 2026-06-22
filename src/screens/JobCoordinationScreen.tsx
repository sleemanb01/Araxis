import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { Ionicons } from '@expo/vector-icons';
import { StatusBadge } from '../components/StatusBadge';
import { DateStrip } from '../components/DateStrip';
import { callNumber } from '../utils/contact';
import { navigateToAddress } from '../utils/navigation';
import { useJobStore } from '../store/useJobStore';
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RouteP = RouteProp<RootStackParamList, 'JobCoordination'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function JobCoordinationScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<RouteP>();
  const { jobId } = route.params;

  useJobStore((s) => s.jobs); // subscribe → reflect realtime updates
  const getJobById = useJobStore((s) => s.getJobById);
  const updateJobStatus = useJobStore((s) => s.updateJobStatus);
  const assignWithDate = useJobStore((s) => s.assignWithDate);
  const unassignJob = useJobStore((s) => s.unassignJob);
  const setPrice = useJobStore((s) => s.setPrice);
  const setPaidAmount = useJobStore((s) => s.setPaidAmount);
  const uid = useAuthStore((s) => s.user?.uid) ?? null;

  const job = getJobById(jobId);
  const [priceStr, setPriceStr] = useState(job?.price != null ? String(job.price) : '');
  const [paidStr, setPaidStr] = useState(job?.paidAmount != null ? String(job.paidAmount) : '');
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>משימה לא נמצאה</Text>
      </SafeAreaView>
    );
  }

  function savePrice() {
    const trimmed = priceStr.trim();
    const parsed = trimmed ? Number(trimmed) : NaN;
    setPrice(job!.id, Number.isFinite(parsed) ? parsed : null);
  }

  const priceVal = priceStr.trim() && Number.isFinite(Number(priceStr)) ? Number(priceStr) : null;
  const paidVal = paidStr.trim() && Number.isFinite(Number(paidStr)) ? Number(paidStr) : 0;
  const balance = priceVal != null ? priceVal - paidVal : null;

  function savePaid() {
    setPaidAmount(job!.id, Math.max(0, paidVal), priceVal);
  }

  function handleAssignToMe() {
    // Assignment requires a date.
    if (!uid || !pickedDate) return;
    assignWithDate(job!.id, uid, pickedDate);
    navigation.goBack();
  }

  function handleUnassign() {
    unassignJob(job!.id);
    navigation.goBack();
  }

  function handleConfirmAndDispatch() {
    updateJobStatus(job!.id, 'en_route');
    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.customerName}>{job.customerName}</Text>
          <StatusBadge status={job.status} />
        </View>

        {/* Detail rows */}
        <View style={styles.card}>
          <DetailRow
            label="כתובת"
            value={job.address}
            icon="location-outline"
            onPress={() => navigateToAddress(job.address)}
          />
          <DetailRow
            label="טלפון"
            value={job.phone}
            icon="call-outline"
            onPress={() => callNumber(job.phone)}
          />
          <DetailRow label="תיאור"   value={job.description} />
          {job.scheduledAt && (
            <DetailRow
              label="תאריך"
              value={new Date(job.scheduledAt).toLocaleDateString('he-IL')}
            />
          )}
        </View>

        {/* Price + payment */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>מחיר</Text>
          <View style={styles.priceInputRow}>
            <Text style={styles.shekel}>₪</Text>
            <TextInput
              style={styles.priceInput}
              value={priceStr}
              onChangeText={setPriceStr}
              onEndEditing={savePrice}
              keyboardType="numeric"
              placeholder="—"
              placeholderTextColor={Colors.textSecondary}
              textAlign="right"
              returnKeyType="done"
            />
          </View>

          <Text style={[styles.priceLabel, { marginTop: 14 }]}>שולם עד כה</Text>
          <View style={styles.priceInputRow}>
            <Text style={styles.shekel}>₪</Text>
            <TextInput
              style={styles.priceInput}
              value={paidStr}
              onChangeText={setPaidStr}
              onEndEditing={savePaid}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={Colors.textSecondary}
              textAlign="right"
              returnKeyType="done"
            />
          </View>

          {balance != null && balance > 0 && (
            <Text style={styles.balanceText}>יתרה לתשלום: ₪{balance}</Text>
          )}
          {balance != null && balance <= 0 && priceVal != null && priceVal > 0 && (
            <Text style={styles.paidFullText}>שולם במלואו ✓</Text>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {job.assignedTo == null ? (
            <>
              <Text style={styles.assignDateLabel}>בחר מועד לשיבוץ</Text>
              <DateStrip value={pickedDate} onChange={setPickedDate} />
              <CustomButton
                label="שבץ אליי"
                variant="primary"
                onPress={handleAssignToMe}
                disabled={!pickedDate}
              />
            </>
          ) : (
            <>
              <CustomButton
                label="אשר ושגר טכנאי"
                variant="primary"
                onPress={handleConfirmAndDispatch}
              />
              <CustomButton
                label="בטל שיבוץ"
                variant="danger"
                onPress={handleUnassign}
              />
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  onPress,
  icon,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const inner = (
    <>
      <View style={detailStyles.valueWrap}>
        {icon && <Ionicons name={icon} size={15} color={Colors.primary} />}
        <Text style={[detailStyles.value, onPress && detailStyles.link]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      <Text style={detailStyles.label}>{label}</Text>
    </>
  );
  return onPress ? (
    <TouchableOpacity style={detailStyles.row} onPress={onPress} activeOpacity={0.6}>
      {inner}
    </TouchableOpacity>
  ) : (
    <View style={detailStyles.row}>{inner}</View>
  );
}

const detailStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '600',
    textAlign: 'right',
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginEnd: 8,
  },
  value: {
    fontSize: 14,
    color: Colors.textPrimary,
    flexShrink: 1,
    textAlign: 'left',
  },
  link: {
    color: Colors.primary,
    fontWeight: '600',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Layout.screenPadding,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'right',
    marginStart: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardBorderRadius,
    padding: Layout.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  priceSection: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.cardBorderRadius,
    padding: Layout.cardPadding,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  priceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  assignDateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 6,
    marginTop: 4,
  },
  priceInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  shekel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  paySegment: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  paySeg: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: Colors.surface },
  paySegActive: { backgroundColor: Colors.primary },
  paySegText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  paySegTextActive: { color: '#FFFFFF' },
  balanceText: { fontSize: 13, fontWeight: '600', color: '#854F0B', textAlign: 'right', marginTop: 12 },
  paidFullText: { fontSize: 13, fontWeight: '600', color: '#16A34A', textAlign: 'right', marginTop: 12 },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  errorText: {
    textAlign: 'center',
    marginTop: 40,
    color: Colors.textSecondary,
    fontSize: 16,
  },
});
