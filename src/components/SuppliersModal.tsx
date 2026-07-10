import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomButton } from './CustomButton';
import { TextField } from './TextField';
import { addSupplier, deleteSupplier } from '../services/supplierService';
import { dialPhone, openWhatsapp } from '../utils/contact';
import { toE164 } from '../services/authService';
import { Supplier } from '../types/supplier';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

/** Supplier contact book: add suppliers; each row has call + WhatsApp. */
export function SuppliersModal({
  visible,
  onClose,
  canEdit,
  suppliers,
}: {
  visible: boolean;
  onClose: () => void;
  canEdit: boolean;
  suppliers: Supplier[];
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim() || phone.replace(/\D/g, '').length < 9) {
      Alert.alert('שגיאה', 'יש להזין שם ומספר טלפון תקין.');
      return;
    }
    setSaving(true);
    try {
      await addSupplier(name.trim(), toE164(phone), contact.trim() || undefined);
      setName('');
      setContact('');
      setPhone('');
      setAdding(false);
    } catch (e: any) {
      Alert.alert('שגיאה', e?.message ?? 'הוספת הספק נכשלה.');
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(s: Supplier) {
    Alert.alert('מחיקת ספק', `למחוק את ${s.name}?`, [
      { text: 'ביטול', style: 'cancel' },
      {
        text: 'מחק',
        style: 'destructive',
        onPress: () => deleteSupplier(s.id).catch((e: any) => Alert.alert('שגיאה', e?.message ?? 'המחיקה נכשלה.')),
      },
    ]);
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.bg} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            {canEdit ? (
              <TouchableOpacity style={styles.addBtn} onPress={() => setAdding((a) => !a)} activeOpacity={0.85}>
                <Ionicons name={adding ? 'close' : 'add'} size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.addBtn} />
            )}
            <Text style={styles.title}>ספקים</Text>
          </View>

          {adding && (
            <View style={styles.addBox}>
              <TextField label="שם הספק" value={name} onChange={setName} placeholder="לדוגמה: י.א. אלקטרוניקה" />
              <TextField label="איש קשר" value={contact} onChange={setContact} placeholder="לדוגמה: יוסי" />
              <TextField label="טלפון" value={phone} onChange={setPhone} placeholder="050-1234567" keyboardType="phone-pad" />
              <CustomButton label="הוסף ספק" onPress={save} loading={saving} disabled={!name.trim()} />
            </View>
          )}

          <FlatList
            data={suppliers}
            keyExtractor={(s) => s.id}
            style={styles.list}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <Text style={styles.empty}>{canEdit ? 'אין ספקים עדיין — הוסף עם ה-+.' : 'אין ספקים עדיין.'}</Text>
            }
            renderItem={({ item }) => (
              <View style={styles.row}>
                <View style={styles.rowBtns}>
                  <TouchableOpacity style={styles.cBtn} onPress={() => dialPhone(item.phone)} hitSlop={6}>
                    <Ionicons name="call" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.cBtn, styles.waBtn]}
                    onPress={() => openWhatsapp(item.phone)}
                    hitSlop={6}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  {canEdit && (
                    <TouchableOpacity onPress={() => confirmDelete(item)} hitSlop={6}>
                      <Ionicons name="trash-outline" size={18} color={Colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.rowInfo}>
                  <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.rowPhone}>
                    {item.contact ? `${item.contact} · ` : ''}{item.phone}
                  </Text>
                </View>
              </View>
            )}
          />
          <CustomButton label="סגור" variant="ghost" onPress={onClose} />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  card: { backgroundColor: Colors.background, borderRadius: 14, padding: 18, maxHeight: '82%' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right' },
  addBox: { marginBottom: 10 },
  list: { flexGrow: 0, marginBottom: 8 },
  empty: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginVertical: 16 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowBtns: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  waBtn: { backgroundColor: '#25D366' },
  rowInfo: { flex: 1, alignItems: 'flex-end', marginStart: 10 },
  rowName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, textAlign: 'right' },
  rowPhone: { fontSize: 12, color: Colors.textSecondary, marginTop: 2, writingDirection: 'ltr' },
});
