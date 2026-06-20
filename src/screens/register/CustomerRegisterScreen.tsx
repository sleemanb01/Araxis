import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../../components/CustomButton';
import { useAuthStore } from '../../store/useAuthStore';
import { createProfile } from '../../services/userService';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

export function CustomerRegisterScreen() {
  const user = useAuthStore((s) => s.user);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('שגיאה', 'יש למלא שם פרטי ושם משפחה.');
      return;
    }
    setSaving(true);
    try {
      await createProfile({
        uid: user.uid,
        phone: user.phoneNumber ?? '',
        role: 'customer',
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        createdAt: new Date().toISOString(),
      });
      // Profile listener in App.tsx routes to the main app automatically.
    } catch (e: any) {
      console.warn('[register customer] failed:', e);
      Alert.alert('שגיאה', 'שמירת הפרופיל נכשלה. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>פרטי לקוח</Text>

        <Field label="שם פרטי" value={firstName} onChange={setFirstName} placeholder="ישראל" />
        <Field label="שם משפחה" value={lastName} onChange={setLastName} placeholder="ישראלי" />

        <CustomButton
          label="סיום הרשמה"
          onPress={handleSubmit}
          loading={saving}
          disabled={!firstName.trim() || !lastName.trim()}
          style={{ marginTop: 8 }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Field({
  label, value, onChange, placeholder,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        textAlign="right"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: {
    fontSize: 22, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'right', marginBottom: 24,
  },
  field: { marginBottom: 16 },
  label: {
    fontSize: 13, fontWeight: '600', color: Colors.textSecondary,
    textAlign: 'right', marginBottom: 6,
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
});
