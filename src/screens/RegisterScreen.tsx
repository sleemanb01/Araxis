import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { useUser } from '../context/UserContext';
import { createPendingProfile } from '../services/userService';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

/** First-run after sign-in: capture a name so the admin can provision the crew member. */
export function RegisterScreen() {
  const { user, signOut } = useUser();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!name.trim() || !user) return;
    setSaving(true);
    setError(null);
    try {
      await createPendingProfile(user.uid, name.trim());
      // Profile subscription flips the app to the pending screen automatically.
    } catch {
      setError('הרישום נכשל. נסה שוב.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.container}>
          <Text style={styles.title}>השלמת רישום</Text>
          <Text style={styles.subtitle}>הזן את שמך. מנהל המערכת ישייך אותך לצוות ולתפקיד.</Text>
          <TextField label="שם מלא" value={name} onChange={setName} placeholder="ישראל ישראלי" />
          {error && <Text style={styles.error}>{error}</Text>}
          <CustomButton label="המשך" onPress={submit} loading={saving} disabled={!name.trim()} style={styles.btn} />
          <CustomButton label="התנתק" variant="ghost" onPress={signOut} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { flex: 1, padding: Layout.screenPadding * 1.5, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  error: { color: Colors.danger, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  btn: { marginTop: 8, marginBottom: 8 },
});
