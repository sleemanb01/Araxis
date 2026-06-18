import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { useJobStore } from '../store/useJobStore';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

const MY_TECH_ID = 'tech_1';

export function NewJobScreen() {
  const navigation = useNavigation();
  const addJob = useJobStore((s) => s.addJob);

  const [customerName, setCustomerName] = useState('');
  const [address, setAddress]           = useState('');
  const [phone, setPhone]               = useState('');
  const [description, setDescription]   = useState('');
  const [assignToMe, setAssignToMe]     = useState(false);

  function handleSubmit() {
    if (!customerName.trim() || !address.trim() || !phone.trim()) {
      Alert.alert('שגיאה', 'יש למלא שם לקוח, כתובת וטלפון.');
      return;
    }

    addJob({
      customerName: customerName.trim(),
      address:      address.trim(),
      phone:        phone.trim(),
      description:  description.trim(),
      status:       assignToMe ? 'scheduled' : 'awaiting',
      assignedTo:   assignToMe ? MY_TECH_ID : null,
      scheduledAt:  null,
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

        {/* Assign toggle */}
        <View style={styles.toggleRow}>
          <Switch
            value={assignToMe}
            onValueChange={setAssignToMe}
            trackColor={{ true: Colors.primary }}
            thumbColor={assignToMe ? '#FFFFFF' : '#F4F4F5'}
          />
          <Text style={styles.toggleLabel}>
            {assignToMe ? 'שייך אליי' : 'שלח לבריכה הכללית'}
          </Text>
        </View>

        <View style={styles.actions}>
          <CustomButton label="שמור משימה" onPress={handleSubmit} />
          <CustomButton label="ביטול" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'phone-pad' | 'email-address';
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType = 'default' }: FieldProps) {
  return (
    <View style={fieldStyles.wrapper}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && fieldStyles.multiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        multiline={multiline}
        keyboardType={keyboardType}
        textAlign="right"
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  multiline: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
});

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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginBottom: 24,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  toggleLabel: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  actions: {
    gap: 12,
  },
});
