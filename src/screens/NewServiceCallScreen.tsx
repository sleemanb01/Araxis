import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { getUsersByIds } from '../services/userService';
import { createServiceCall, setFinancials } from '../services/serviceCallService';
import { useUser } from '../context/UserContext';
import { UserProfile } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

function addDays(n: number): string {
  const d = new Date();
  d.setHours(9, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

export function NewServiceCallScreen() {
  const navigation = useNavigation();
  const [crew, setCrew] = useState<UserProfile[]>([]);
  const [clientName, setClientName] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [leadTech, setLeadTech] = useState('');
  const [assistants, setAssistants] = useState<string[]>([]);
  const [payout, setPayout] = useState('');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');
  const [saving, setSaving] = useState(false);
  const { crews } = useUser();

  // Assignable team = your crew mates (req 1: you only see your crew mates).
  const crewMateIds = useMemo(() => [...new Set(crews.flatMap((c) => c.memberIds))], [crews]);
  const mateKey = crewMateIds.join(',');
  useEffect(() => {
    if (!crewMateIds.length) {
      setCrew([]);
      return;
    }
    getUsersByIds(crewMateIds).then(setCrew).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mateKey]);

  const members = useMemo(
    () => (leadTech ? [leadTech, ...assistants] : assistants),
    [leadTech, assistants]
  );

  function toggleAssistant(uid: string) {
    if (uid === leadTech) return;
    setAssistants((a) => (a.includes(uid) ? a.filter((x) => x !== uid) : [...a, uid]));
  }

  async function submit() {
    if (!clientName.trim() || !leadTech) {
      Alert.alert('שגיאה', 'יש להזין שם לקוח ולבחור ראש צוות.');
      return;
    }
    const total = Math.max(0, parseFloat(payout) || 0);
    const per = members.length ? Math.round(total / members.length) : 0;
    const splits: Record<string, number> = {};
    members.forEach((uid) => (splits[uid] = per));

    setSaving(true);
    try {
      const id = await createServiceCall({
        clientName: clientName.trim(),
        status: 'pending',
        scheduledDate: addDays(dayOffset),
        hardwareUsed: [],
        teamAssignment: { leadTech, assistants },
        payouts: { totalTechPayout: total, splits },
      });
      const priceN = Math.max(0, parseFloat(price) || 0);
      if (priceN > 0) {
        await setFinancials(id, {
          overallPrice: priceN,
          paidAmount: Math.max(0, parseFloat(paid) || 0),
        });
      }
      navigation.goBack();
    } catch {
      Alert.alert('שגיאה', 'יצירת הקריאה נכשלה.');
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>קריאת שירות חדשה</Text>
        <TextField label="שם הלקוח / אתר" value={clientName} onChange={setClientName} placeholder="לדוגמה: אתר מרכזי" />

        <Text style={styles.label}>מועד</Text>
        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setDayOffset((d) => Math.max(0, d - 1))}>
            <Text style={styles.stepTxt}>−</Text>
          </TouchableOpacity>
          <Text style={styles.dateText}>{new Date(addDays(dayOffset)).toLocaleDateString('he-IL')}</Text>
          <TouchableOpacity style={styles.stepBtn} onPress={() => setDayOffset((d) => d + 1)}>
            <Text style={styles.stepTxt}>+</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>ראש צוות</Text>
        <View style={styles.chips}>
          {crew.map((c) => (
            <TouchableOpacity
              key={c.uid}
              style={[styles.chip, leadTech === c.uid && styles.chipActive]}
              onPress={() => setLeadTech(c.uid)}
            >
              <Text style={[styles.chipText, leadTech === c.uid && styles.chipTextActive]}>{c.name || c.uid}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>מסייעים</Text>
        <View style={styles.chips}>
          {crew
            .filter((c) => c.uid !== leadTech)
            .map((c) => (
              <TouchableOpacity
                key={c.uid}
                style={[styles.chip, assistants.includes(c.uid) && styles.chipActive]}
                onPress={() => toggleAssistant(c.uid)}
              >
                <Text style={[styles.chipText, assistants.includes(c.uid) && styles.chipTextActive]}>{c.name || c.uid}</Text>
              </TouchableOpacity>
            ))}
        </View>

        <TextField label="תשלום לצוות (₪)" value={payout} onChange={setPayout} placeholder="0" keyboardType="numeric" />
        <Text style={styles.note}>יחולק שווה בשווה בין {members.length} חברי הצוות.</Text>

        <TextField label="מחיר ללקוח (₪) — מנהל בלבד" value={price} onChange={setPrice} placeholder="0" keyboardType="numeric" />
        <TextField label="שולם (₪)" value={paid} onChange={setPaid} placeholder="0" keyboardType="numeric" />

        <CustomButton label="צור קריאה" onPress={submit} loading={saving} style={styles.btn} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { padding: Layout.screenPadding },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 18, marginBottom: 16 },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepTxt: { fontSize: 22, color: Colors.primary, fontWeight: '700' },
  dateText: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary, minWidth: 120, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginBottom: 16 },
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
  note: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right', marginBottom: 14 },
  btn: { marginTop: 16 },
});
