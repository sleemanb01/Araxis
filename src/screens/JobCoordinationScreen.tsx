import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { StatusBadge } from '../components/StatusBadge';
import { useJobStore } from '../store/useJobStore';
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

  const getJobById = useJobStore((s) => s.getJobById);
  const updateJobStatus = useJobStore((s) => s.updateJobStatus);

  const job = getJobById(jobId);

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

  function handleSendCalendarLink() {
    // TODO: integrate with calendar service / WhatsApp deep link
    Alert.alert('שליחת קישור', 'פונקציה זו תחובר לשירות יומן בהמשך.');
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

        {/* Actions */}
        <View style={styles.actions}>
          <CustomButton
            label="התקשר ללקוח"
            variant="secondary"
            onPress={handleCallCustomer}
          />
          <CustomButton
            label="שלח קישור ליומן"
            variant="secondary"
            onPress={handleSendCalendarLink}
          />
          <CustomButton
            label="אשר ושגר טכנאי"
            variant="primary"
            onPress={handleConfirmAndDispatch}
          />
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
