import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from './CustomButton';
import { TextField } from './TextField';
import { findUserByPhone } from '../services/userService';
import { toE164 } from '../services/authService';
import { UserProfile } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

/** Look up an existing user by phone (E.164) and hand them back. The phone field
 *  pre-seeds the Israeli mobile prefix and shows the resolved E.164 live. */
export function AddByPhoneForm({
  title = 'הוספת חבר',
  onFound,
  onCancel,
}: {
  title?: string;
  onFound: (u: UserProfile) => void;
  onCancel: () => void;
}) {
  const [phone, setPhone] = useState('+972 5');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasEnoughDigits = phone.replace(/\D/g, '').length >= 9;
  const normalized = hasEnoughDigits ? toE164(phone.trim()) : null;

  async function search() {
    if (!hasEnoughDigits) {
      setError('מספר טלפון לא תקין');
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const u = await findUserByPhone(toE164(phone.trim()));
      if (u) onFound(u);
      else setError('לא נמצא משתמש עם מספר זה. בקש ממנו להיכנס לאפליקציה ולהזין שם תחילה.');
    } catch {
      setError('החיפוש נכשל. נסה שוב.');
    } finally {
      setSearching(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.hint}>
          הזן את מספר הטלפון. אם הוא כבר נכנס לאפליקציה — נשלוף את פרטיו אוטומטית.
        </Text>
        <TextField
          label="מספר טלפון"
          value={phone}
          onChange={setPhone}
          placeholder="+972 50 1234567"
          keyboardType="phone-pad"
        />
        {normalized && <Text style={styles.preview}>יחפש לפי: {normalized}</Text>}
        {error && <Text style={styles.err}>{error}</Text>}
        <CustomButton label="חפש ושייך" onPress={search} loading={searching} style={styles.btn} />
        <CustomButton label="ביטול" variant="ghost" onPress={onCancel} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 14 },
  hint: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 14 },
  preview: { fontSize: 13, color: Colors.primary, textAlign: 'right', writingDirection: 'ltr', marginBottom: 10 },
  err: { fontSize: 13, color: Colors.danger, textAlign: 'right', marginBottom: 10 },
  btn: { marginTop: 12, marginBottom: 8 },
});
