import React, { useState } from 'react';
import { Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TextField as Field } from '../../components/TextField';
import { CustomButton } from '../../components/CustomButton';
import { useAuthStore } from '../../store/useAuthStore';
import { createProfile } from '../../services/userService';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';

export function CustomerRegisterScreen() {
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setProfileLoaded = useAuthStore((s) => s.setProfileLoaded);

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
      const profile = {
        uid: user.uid,
        phone: user.phoneNumber ?? '',
        role: 'customer' as const,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        createdAt: new Date().toISOString(),
      };
      await createProfile(profile);
      // Switch to the main app immediately (don't depend on the listener).
      setProfile(profile);
      setProfileLoaded(true);
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: {
    fontSize: 22, fontWeight: '700', color: Colors.textPrimary,
    textAlign: 'right', marginBottom: 24,
  },
});
