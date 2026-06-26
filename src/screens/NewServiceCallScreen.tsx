import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { Calendar } from '../components/Calendar';
import { getUsersByIds } from '../services/userService';
import { createServiceCall, setFinancials } from '../services/serviceCallService';
import { useUser } from '../context/UserContext';
import { UserProfile } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

export function NewServiceCallScreen() {
  const navigation = useNavigation();
  const { crews, caps } = useUser();
  const [crew, setCrew] = useState<UserProfile[]>([]); // crew-mate profiles (for availability)
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [contactPhone, setContactPhone] = useState('+972 5');
  const [date, setDate] = useState(() => {
    const d = new Date();
    d.setHours(9, 0, 0, 0);
    return d;
  });
  const [crewId, setCrewId] = useState(''); // optional crew assigned to the job
  const [payout, setPayout] = useState('');
  const [price, setPrice] = useState('');
  const [paid, setPaid] = useState('');
  const [saving, setSaving] = useState(false);

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

  const selectedCrew = crews.find((c) => c.id === crewId) ?? null;
  const memberIds = selectedCrew?.memberIds ?? [];

  // Weekdays (0=Sun..6=Sat) the chosen crew is available (intersection of its
  // members' availability); before a crew is picked, the union across crew mates.
  const availableWeekdays = useMemo(() => {
    const daysOf = (p: UserProfile) =>
      p.availability?.days?.length ? p.availability.days : [0, 1, 2, 3, 4, 5, 6];
    if (selectedCrew) {
      const sel = crew.filter((p) => memberIds.includes(p.uid));
      if (sel.length) return [0, 1, 2, 3, 4, 5, 6].filter((d) => sel.every((p) => daysOf(p).includes(d)));
      return [0, 1, 2, 3, 4, 5, 6];
    }
    const s = new Set<number>();
    crew.forEach((p) => daysOf(p).forEach((d) => s.add(d)));
    return Array.from(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crew, crewId]);

  async function useCurrentLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('הרשאה', 'נדרשת הרשאת מיקום כדי למלא את הכתובת.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({});
      const coords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
      const places = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const p = places[0];
      const line = [p?.street ?? p?.name, p?.streetNumber].filter(Boolean).join(' ');
      const addr = [line, p?.city].filter(Boolean).join(', ');
      setAddress(addr || coords);
    } catch {
      Alert.alert('שגיאה', 'לא ניתן לקבל מיקום נוכחי.');
    } finally {
      setLocating(false);
    }
  }

  async function submit() {
    if (!clientName.trim()) {
      Alert.alert('שגיאה', 'יש להזין שם לקוח.');
      return;
    }
    const total = Math.max(0, parseFloat(payout) || 0);
    let teamAssignment = { leadTech: '', assistants: [] as string[] };
    const splits: Record<string, number> = {};
    if (selectedCrew) {
      const lead = selectedCrew.manager;
      teamAssignment = { leadTech: lead, assistants: memberIds.filter((u) => u !== lead) };
      const per = memberIds.length ? Math.round(total / memberIds.length) : 0;
      memberIds.forEach((u) => (splits[u] = per));
    }

    setSaving(true);
    try {
      const id = await createServiceCall({
        clientName: clientName.trim(),
        ...(address.trim() ? { address: address.trim() } : {}),
        ...(contactPhone.trim() ? { contactPhone: contactPhone.trim() } : {}),
        status: 'pending',
        scheduledDate: date.toISOString(),
        hardwareUsed: [],
        teamAssignment,
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
        <View style={styles.addressRow}>
          <View style={styles.addressField}>
            <TextField label="כתובת" value={address} onChange={setAddress} placeholder="רחוב, עיר" />
          </View>
          <TouchableOpacity
            style={styles.locBtn}
            onPress={useCurrentLocation}
            disabled={locating}
            activeOpacity={0.85}
          >
            {locating ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="location" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
        <TextField label="טלפון ליצירת קשר" value={contactPhone} onChange={setContactPhone} placeholder="+972 50 1234567" keyboardType="phone-pad" />

        <Text style={styles.label}>מועד</Text>
        <Calendar selected={date} onSelect={setDate} availableWeekdays={availableWeekdays} />
        <Text style={styles.note}>● ימים זמינים לצוות מסומנים בנקודה ירוקה</Text>

        <Text style={styles.label}>צוות (אופציונלי)</Text>
        <View style={styles.chips}>
          {crews.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, crewId === c.id && styles.chipActive]}
              onPress={() => setCrewId((id) => (id === c.id ? '' : c.id))}
            >
              <Text style={[styles.chipText, crewId === c.id && styles.chipTextActive]}>{c.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {caps.viewTeamPayouts && (
          <>
            <TextField label="תשלום לצוות (₪)" value={payout} onChange={setPayout} placeholder="0" keyboardType="numeric" />
            {selectedCrew && (
              <Text style={styles.note}>יחולק שווה בשווה בין {memberIds.length} חברי {selectedCrew.name}.</Text>
            )}
          </>
        )}

        {caps.viewFinancials && (
          <>
            <TextField label="מחיר ללקוח (₪)" value={price} onChange={setPrice} placeholder="0" keyboardType="numeric" />
            <TextField label="שולם (₪)" value={paid} onChange={setPaid} placeholder="0" keyboardType="numeric" />
          </>
        )}

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
  addressRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  addressField: { flex: 1 },
  locBtn: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
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
