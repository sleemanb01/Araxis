import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { CustomButton } from './CustomButton';
import { TextField } from './TextField';
import { addJobPayment, MORNING_ENABLED } from '../services/paymentService';
import { PaymentMethod, DocKind, PAYMENT_METHOD_HE, DOC_KIND_HE } from '../types/payment';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

const METHODS = Object.keys(PAYMENT_METHOD_HE) as PaymentMethod[];
const DOC_KINDS = Object.keys(DOC_KIND_HE) as DocKind[];

interface Props {
  visible: boolean;
  onClose: () => void;
  callId: string;
  /** Open balance (total − reserved payments); 0/undefined = unknown. */
  balance?: number;
}

export function AddPaymentModal({ visible, onClose, callId, balance }: Props) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [note, setNote] = useState('');
  const [issueNow, setIssueNow] = useState(true);
  const [docKind, setDocKind] = useState<DocKind>('receipt');
  const [saving, setSaving] = useState(false);

  async function save() {
    const amt = parseFloat(amount) || 0;
    if (amt <= 0) {
      Alert.alert('שגיאה', 'יש להזין סכום חיובי.');
      return;
    }
    if (balance != null && amt > balance + 0.005) {
      Alert.alert('שגיאה', `הסכום גדול מהיתרה הפתוחה (₪${Math.round(balance).toLocaleString('he-IL')}).`);
      return;
    }
    setSaving(true);
    try {
      await addJobPayment({
        callId,
        amount: amt,
        method,
        note: note.trim(),
        issueNow: MORNING_ENABLED && issueNow,
        docKind,
      });
      setSaving(false);
      setAmount('');
      setNote('');
      onClose();
    } catch (e: any) {
      setSaving(false);
      Alert.alert('שגיאה', e?.message ?? 'הוספת התשלום נכשלה.');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <Text style={styles.title}>תשלום חדש</Text>
          {balance != null && balance > 0 && (
            <Text style={styles.balance}>יתרה לתשלום: ₪{Math.round(balance).toLocaleString('he-IL')}</Text>
          )}
          <TextField label="סכום שהתקבל (₪)" value={amount} onChange={setAmount} placeholder="0" keyboardType="numeric" />

          <Text style={styles.label}>אמצעי תשלום</Text>
          <View style={styles.chips}>
            {METHODS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, method === m && styles.chipOn]}
                onPress={() => setMethod(m)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, method === m && styles.chipTextOn]}>{PAYMENT_METHOD_HE[m]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextField label="הערה (אופציונלי)" value={note} onChange={setNote} placeholder="לדוגמה: מקדמה על ציוד" />

          {MORNING_ENABLED && (
            <View style={styles.issueRow}>
              <Switch value={issueNow} onValueChange={setIssueNow} />
              <Text style={styles.issueText}>הפק מסמך עכשיו (Morning)</Text>
            </View>
          )}
          {MORNING_ENABLED && issueNow && (
            <View style={styles.chips}>
              {DOC_KINDS.map((k) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.chip, docKind === k && styles.chipOn]}
                  onPress={() => setDocKind(k)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, docKind === k && styles.chipTextOn]}>{DOC_KIND_HE[k]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <CustomButton label="שמור תשלום" onPress={save} loading={saving} disabled={!amount.trim()} style={styles.btn} />
          <CustomButton label="ביטול" variant="ghost" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  card: { backgroundColor: Colors.background, borderRadius: 14, padding: 20 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  balance: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginBottom: 14 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 13, color: Colors.textPrimary },
  chipTextOn: { color: '#FFFFFF' },
  issueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 10, marginBottom: 10 },
  issueText: { fontSize: 15, color: Colors.textPrimary },
  btn: { marginTop: 6, marginBottom: 8 },
});
