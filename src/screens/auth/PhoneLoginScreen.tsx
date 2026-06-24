import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../../components/CustomButton';
import { useUser } from '../../context/UserContext';
import { sendOtp, toE164 } from '../../services/authService';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'PhoneLogin'>;

export function PhoneLoginScreen() {
  const navigation = useNavigation<Nav>();
  const { setConfirmation } = useUser();

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = phone.replace(/\D/g, '').length >= 9;

  async function handleSendCode() {
    setError(null);
    setLoading(true);
    try {
      const confirmation = await sendOtp(phone);
      setConfirmation(confirmation);
      navigation.navigate('Otp', { phone: toE164(phone) });
    } catch (e: any) {
      if (__DEV__) console.log('[sendOtp] failed:', e?.code, e);
      setError(translateError(e?.code) ?? 'שליחת הקוד נכשלה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Image source={require('../../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>ברוכים הבאים ל-Mima</Text>
          <Text style={styles.subtitle}>הזן את מספר הטלפון שלך לכניסה</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.prefix}>972+</Text>
            <TextInput
              style={styles.input}
              placeholder="50-123-4567"
              placeholderTextColor={Colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              textAlign="right"
              autoFocus
              maxLength={15}
            />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <CustomButton
            label="שלח קוד אימות"
            onPress={handleSendCode}
            disabled={!isValid}
            loading={loading}
            style={styles.button}
          />

          <Text style={styles.disclaimer}>
            בלחיצה על "שלח קוד" ישלח אליך קוד אימות חד-פעמי ב-SMS.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function translateError(code?: string): string | null {
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'מספר טלפון לא תקין.';
    case 'auth/too-many-requests':
      return 'יותר מדי ניסיונות. נסה שוב מאוחר יותר.';
    case 'auth/network-request-failed':
      return 'בעיית רשת. בדוק את החיבור לאינטרנט.';
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: {
    flex: 1,
    padding: Layout.screenPadding * 1.5,
    justifyContent: 'center',
  },
  logo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignSelf: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  prefix: {
    fontSize: 16,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginEnd: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  error: {
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'right',
    marginBottom: 12,
  },
  button: { marginTop: 8 },
  disclaimer: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
});
