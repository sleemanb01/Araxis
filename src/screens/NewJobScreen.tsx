import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextField as Field } from '../components/TextField';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { useJobStore } from '../store/useJobStore';
import { useAuthStore } from '../store/useAuthStore';
import { DateStrip } from '../components/DateStrip';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export function NewJobScreen() {
  const navigation = useNavigation();
  const addJob = useJobStore((s) => s.addJob);
  const uid = useAuthStore((s) => s.user?.uid) ?? null;

  const [customerName, setCustomerName] = useState('');
  const [address, setAddress]           = useState('');
  const [phone, setPhone]               = useState('');
  const [description, setDescription]   = useState('');
  const [price, setPrice]               = useState('');
  const [scheduledAt, setScheduledAt]   = useState<string | null>(null);

  function handleSubmit() {
    if (!customerName.trim() || !address.trim() || !phone.trim()) {
      Alert.alert('שגיאה', 'יש למלא שם לקוח, כתובת וטלפון.');
      return;
    }

    if (!scheduledAt) {
      Alert.alert('שגיאה', 'יש לבחור מועד למשימה.');
      return;
    }

    const parsedPrice = price.trim() ? Number(price) : NaN;

    addJob({
      customerName: customerName.trim(),
      address:      address.trim(),
      phone:        phone.trim(),
      description:  description.trim(),
      status:       'scheduled',
      assignedTo:   uid,
      scheduledAt,
      price:        Number.isFinite(parsedPrice) ? parsedPrice : null,
    });

    navigation.goBack();
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.pageTitle}>משימה חדשה</Text>

        <Field label="שם לקוח" value={customerName} onChange={setCustomerName} placeholder="ישראל ישראלי" />
        <Field label="כתובת"   value={address}      onChange={setAddress}      placeholder="רחוב הרצל 1, תל אביב" />
        <Field label="טלפון"   value={phone}        onChange={setPhone}        placeholder="050-0000000" keyboardType="phone-pad" />
        <Field label="תיאור"   value={description}  onChange={setDescription}  placeholder="תיאור הבעיה..." multiline />
        <Field label="מחיר (אופציונלי)" value={price} onChange={setPrice} placeholder="₪ —" keyboardType="numeric" />

        {/* Date — the job is assigned to you on this date */}
        <Text style={styles.dateLabel}>מועד</Text>
        <DateStrip value={scheduledAt} onChange={setScheduledAt} />
        <View style={{ height: 20 }} />

        <View style={styles.actions}>
          <CustomButton label="שמור משימה" onPress={handleSubmit} />
          <CustomButton label="ביטול" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Layout.screenPadding,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 24,
  },
  dateLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 8,
  },
  actions: {
    gap: 12,
  },
});
