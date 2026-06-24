import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { CustomButton } from '../../components/CustomButton';
import { useUser } from '../../context/UserContext';
import { confirmOtp, sendOtp } from '../../services/authService';
import { Colors } from '../../constants/colors';
import { Layout } from '../../constants/layout';
import type { AuthStackParamList } from '../../navigation/types';

type RouteP = RouteProp<AuthStackParamList, 'Otp'>;

const RESEND_SECONDS = 60;

export function OtpScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteP>();
  const { phone } = route.params;

  const { confirmation, setConfirmation } = useUser();

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  async function handleVerify() {
    if (!confirmation) {
      setError('פג תוקף הבקשה. חזור ושלח קוד מחדש.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await confirmOtp(confirmation, code);
      // Auth listener in App.tsx will swap to the main app automatically.
    } catch (e: any) {
      setError(translateError(e?.code) ?? 'הקוד שגוי. נסה שוב.');
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0) return;
    setError(null);
    try {
      const fresh = await sendOtp(phone);
      setConfirmation(fresh);
      setCountdown(RESEND_SECONDS);
      setCode('');
    } catch {
      setError('שליחה מחדש נכשלה. נסה שוב.');
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <Text style={styles.title}>אימות מספר טלפון</Text>
          <Text style={styles.subtitle}>
            הזן את הקוד שנשלח אל {phone}
          </Text>

          <TextInput
            ref={inputRef}
            style={styles.codeInput}
            placeholder="------"
            placeholderTextColor={Colors.border}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            textAlign="center"
            autoFocus
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <CustomButton
            label="אמת והתחבר"
            onPress={handleVerify}
            disabled={code.length < 6}
            loading={loading}
            style={styles.button}
          />

          <TouchableOpacity onPress={handleResend} disabled={countdown > 0}>
            <Text style={[styles.resend, countdown > 0 && styles.resendDisabled]}>
              {countdown > 0 ? `שליחה מחדש בעוד ${countdown} שניות` : 'שלח קוד מחדש'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.changeNumber}>שנה מספר טלפון</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function translateError(code?: string): string | null {
  switch (code) {
    case 'auth/invalid-verification-code':
      return 'קוד אימות שגוי.';
    case 'auth/code-expired':
      return 'הקוד פג תוקף. שלח קוד חדש.';
    case 'auth/session-expired':
      return 'פג תוקף ההפעלה. שלח קוד חדש.';
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
  codeInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 18,
    fontSize: 32,
    letterSpacing: 12,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  error: {
    color: Colors.danger,
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  button: { marginBottom: 24 },
  resend: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 16,
  },
  resendDisabled: { color: Colors.textSecondary },
  changeNumber: {
    color: Colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
});
