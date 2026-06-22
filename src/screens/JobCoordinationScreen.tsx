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
import { StatusBadge } from '../components/StatusBadge';
import { DateStrip } from '../components/DateStrip';
import { useJobStore } from '../store/useJobStore';
import { useAuthStore } from '../store/useAuthStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';
import { PaymentStatus } from '../types/job';
import type { RootStackParamList } from '../navigation/types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RouteP = RouteProp<RootStackParamList, 'JobCoordination'>;
type Nav = NativeStackNavigationProp<RootStackParamList>;

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'לא שולם',
  partial: 'חלקי',
  paid: 'שולם',
};

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
  const setPaymentStatus = useJobStore((s) => s.setPaymentStatus);
  const uid = useAuthStore((s) => s.user?.uid) ?? null;

  const job = getJobById(jobId);
  const [priceStr, setPriceStr] = useState(job?.price != null ? String(job.price) : '');
  const [pickedDate, setPickedDate] = useState<string | null>(null);

  if (!job) {
    return (
      <SafeAreaView style={styles.safe}>
        <Text style={styles.errorText}>משימה לא נמצאה</Text>
      </SafeAreaView>
    );
  }

  function handleCallCustomer() {
    Linking.openURL(`tel:${job!.phone}`);
  }

  function savePrice() {
    const trimmed = priceStr.trim();
    const parsed = trimmed ? Number(trimmed) : NaN;
    setPrice(job!.id, Number.isFinite(parsed) ? parsed : null);
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
          <DetailRow label="כתובת"   value={job.address} />
          <DetailRow label="טלפון"   value={job.phone} />
          <DetailRow label="תיאור"   value={job.description} />
          {job.scheduledAt && (
            <DetailRow
              label="תאריך"
              value={new Date(job.scheduledAt).toLocaleString('he-IL')}
            />
          )}
        </View>

        {/* Price (optional quote) */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>מחיר (אופציונלי)</Text>
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
        </View>

        {/* Payment status */}
        <View style={styles.priceSection}>
          <Text style={styles.priceLabel}>סטטוס תשלום</Text>
          <View style={styles.paySegment}>
            {(['unpaid', 'partial', 'paid'] as PaymentStatus[]).map((ps) => {
              const active = (job.paymentStatus ?? 'unpaid') === ps;
              return (
                <TouchableOpacity
                  key={ps}
                  style={[styles.paySeg, active && styles.paySegActive]}
                  onPress={() => setPaymentStatus(job.id, ps)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.paySegText, active && styles.paySegTextActive]}>
                    {PAYMENT_LABELS[ps]}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <CustomButton
            label="התקשר ללקוח"
            variant="secondary"
            onPress={handleCallCustomer}
          />
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.value}>{value}</Text>
      <Text style={detailStyles.label}>{label}</Text>
    </View>
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
  value: {
    fontSize: 14,
    color: Colors.textPrimary,
    flex: 1,
    textAlign: 'left',
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
