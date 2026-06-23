import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextField as Field } from '../../components/TextField';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../../components/CustomButton';
import { useJobStore } from '../../store/useJobStore';
import { useAuthStore } from '../../store/useAuthStore';
import { SERVICE_CATEGORIES } from '../../constants/services';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

export function NewRequestScreen() {
  const navigation = useNavigation();
  const addJob = useJobStore((s) => s.addJob);
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!description.trim() || !address.trim() || !phone.trim()) {
      Alert.alert('שגיאה', 'יש למלא תיאור הבעיה, כתובת וטלפון.');
      return;
    }
    if (!user) return;

    const customerName = profile
      ? `${profile.firstName} ${profile.lastName}`.trim()
      : 'לקוח';
    const fullDescription = category
      ? `${category} — ${description.trim()}`
      : description.trim();

    setSaving(true);
    try {
      await addJob({
        customerId: user.uid,
        customerName,
        address: address.trim(),
        phone: phone.trim(),
        description: fullDescription,
        status: 'awaiting',
        assignedTo: null,
        scheduledAt: null,
      });
      navigation.goBack();
    } catch (e) {
      console.warn('[newRequest] failed:', e);
      Alert.alert('שגיאה', 'שליחת הקריאה נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>קריאת שירות חדשה</Text>
        <Text style={styles.subtitle}>תאר את התקלה ואיש מקצוע יחזור אליך.</Text>

        <Field
          label="תיאור הבעיה"
          value={description}
          onChange={setDescription}
          placeholder="לדוגמה: המזגן לא מקרר"
          multiline
        />
        <Field
          label="כתובת"
          value={address}
          onChange={setAddress}
          placeholder="רחוב הרצל 1, תל אביב"
        />
        <Field
          label="טלפון ליצירת קשר"
          value={phone}
          onChange={setPhone}
          placeholder="050-0000000"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>סוג השירות (אופציונלי)</Text>
        <View style={styles.chips}>
          {SERVICE_CATEGORIES.map((c) => {
            const active = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => setCategory(active ? '' : c)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.actions}>
          <CustomButton label="שלח קריאה" onPress={handleSubmit} loading={saving} />
          <CustomButton label="ביטול" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'right',
    marginBottom: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    marginBottom: 24,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textPrimary },
  chipTextActive: { color: '#FFFFFF', fontWeight: '600' },
  actions: { gap: 12 },
});
