import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useNavigation } from '@react-navigation/native';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { Calendar } from '../components/Calendar';
import { BarcodeScannerModal } from '../components/BarcodeScannerModal';
import { getUsersByIds } from '../services/userService';
import { createServiceCall, setFinancials } from '../services/serviceCallService';
import { createInventoryItem } from '../services/inventoryService';
import { useUser } from '../context/UserContext';
import { useInventory } from '../context/InventoryContext';
import { UserProfile } from '../types/user';
import { WAREHOUSE } from '../types/inventory';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

const HE_WD = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function NewServiceCallScreen() {
  const navigation = useNavigation();
  const { crews, caps } = useUser();
  const { items } = useInventory();
  const [crew, setCrew] = useState<UserProfile[]>([]); // crew-mate profiles (for availability)
  const [clientName, setClientName] = useState('');
  const [address, setAddress] = useState('');
  const [locating, setLocating] = useState(false);
  const [contactPhone, setContactPhone] = useState('+972 5');
  const [notes, setNotes] = useState('');
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
  const [requiredItems, setRequiredItems] = useState<string[]>([]);
  const [scanOpen, setScanOpen] = useState(false);
  const [pendingBarcode, setPendingBarcode] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [calOpen, setCalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [itemSearch, setItemSearch] = useState('');

  // Next two weeks for the horizontal date strip; the full calendar covers the rest.
  const strip = useMemo(() => {
    const base = new Date();
    base.setHours(9, 0, 0, 0);
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d;
    });
  }, []);

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

  function addRequired(id: string) {
    setRequiredItems((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }
  function removeRequired(id: string) {
    setRequiredItems((prev) => prev.filter((x) => x !== id));
  }

  // Scanned a required item: add it if it's already in the warehouse, else prompt
  // to create a new (missing) item.
  function onScanned(code: string) {
    setScanOpen(false);
    const existing = items.find((i) => i.barcode === code);
    if (existing) addRequired(existing.id);
    else {
      setPendingBarcode(code);
      setNewItemName('');
    }
  }

  // Add an item manually (pick existing in the modal, or create a new one by name).
  async function createManual() {
    const n = itemSearch.trim();
    if (!n) return;
    try {
      const id = await createInventoryItem({ itemName: n, lacks: true, locations: { [WAREHOUSE]: 0 } });
      addRequired(id);
      setManualOpen(false);
      setItemSearch('');
    } catch {
      Alert.alert('שגיאה', 'הוספת הפריט נכשלה.');
    }
  }

  async function confirmNewItem() {
    if (!pendingBarcode || !newItemName.trim()) return;
    try {
      const id = await createInventoryItem({
        itemName: newItemName.trim(),
        barcode: pendingBarcode,
        lacks: true,
        locations: { [WAREHOUSE]: 0 },
      });
      addRequired(id);
      setPendingBarcode(null);
      setNewItemName('');
    } catch {
      Alert.alert('שגיאה', 'הוספת הפריט למחסן נכשלה.');
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
        ...(notes.trim() ? { notes: notes.trim() } : {}),
        ...(requiredItems.length ? { requiredItems } : {}),
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

        <Text style={styles.label}>מועד · {date.toLocaleDateString('he-IL')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateStripScroll}
          contentContainerStyle={styles.dateStrip}
        >
          <TouchableOpacity style={styles.calBtn} onPress={() => setCalOpen(true)} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {strip.map((d) => {
            const sel = sameDay(d, date);
            const avail = availableWeekdays.includes(d.getDay());
            return (
              <TouchableOpacity
                key={d.toISOString()}
                style={[styles.dateChip, sel && styles.dateChipSel]}
                onPress={() => setDate(d)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateWd, sel && styles.dateTextSel]}>{HE_WD[d.getDay()]}</Text>
                <Text style={[styles.dateNum, sel && styles.dateTextSel]}>{d.getDate()}</Text>
                {avail && !sel && <View style={styles.dateDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

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

        <Text style={styles.label}>פריטים נדרשים (אופציונלי)</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.reqScroll}
          contentContainerStyle={styles.reqRow}
        >
          <TouchableOpacity style={styles.reqAdd} onPress={() => setScanOpen(true)} activeOpacity={0.85}>
            <Ionicons name="barcode-outline" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.reqAddManual} onPress={() => setManualOpen(true)} activeOpacity={0.85}>
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          {requiredItems.map((id) => {
            const item = items.find((i) => i.id === id);
            return (
              <View key={id} style={[styles.reqChip, item?.lacks && styles.reqChipLacks]}>
                {item?.lacks && <View style={styles.redDot} />}
                <Text style={styles.reqChipText} numberOfLines={1}>{item?.itemName ?? '—'}</Text>
                <TouchableOpacity onPress={() => removeRequired(id)} hitSlop={6}>
                  <Ionicons name="close-circle" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>

        {(caps.viewTeamPayouts || caps.viewFinancials) && (
          <View style={styles.financeRow}>
            {caps.viewTeamPayouts && (
              <View style={styles.financeCol}>
                <TextField label="תשלום צוות ₪" value={payout} onChange={setPayout} placeholder="0" keyboardType="numeric" />
              </View>
            )}
            {caps.viewFinancials && (
              <>
                <View style={styles.financeCol}>
                  <TextField label="מחיר ללקוח ₪" value={price} onChange={setPrice} placeholder="0" keyboardType="numeric" />
                </View>
                <View style={styles.financeCol}>
                  <TextField label="שולם ₪" value={paid} onChange={setPaid} placeholder="0" keyboardType="numeric" />
                </View>
              </>
            )}
          </View>
        )}
        {caps.viewTeamPayouts && selectedCrew && (
          <Text style={styles.note}>יחולק שווה בשווה בין {memberIds.length} חברי {selectedCrew.name}.</Text>
        )}

        <TextField label="הערות" value={notes} onChange={setNotes} placeholder="הערות לקריאה" multiline />

        <CustomButton label="צור קריאה" onPress={submit} loading={saving} style={styles.btn} />
      </ScrollView>

      <BarcodeScannerModal visible={scanOpen} onClose={() => setScanOpen(false)} onScanned={onScanned} />

      <Modal visible={calOpen} transparent animationType="fade" onRequestClose={() => setCalOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Calendar
              selected={date}
              onSelect={(d) => {
                setDate(d);
                setCalOpen(false);
              }}
              availableWeekdays={availableWeekdays}
            />
            <CustomButton label="סגור" variant="ghost" onPress={() => setCalOpen(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={manualOpen} transparent animationType="fade" onRequestClose={() => setManualOpen(false)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>הוספת פריט</Text>
            <TextField label="חיפוש או שם פריט" value={itemSearch} onChange={setItemSearch} placeholder="הקלד שם…" />
            <ScrollView style={styles.pickList} keyboardShouldPersistTaps="handled">
              {items
                .filter((it) => !itemSearch.trim() || it.itemName.includes(itemSearch.trim()))
                .slice(0, 30)
                .map((it) => (
                  <TouchableOpacity
                    key={it.id}
                    style={styles.pickRow}
                    onPress={() => {
                      addRequired(it.id);
                      setManualOpen(false);
                      setItemSearch('');
                    }}
                  >
                    <Text style={styles.pickText}>{it.itemName}{it.lacks ? ' (חסר)' : ''}</Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
            {!!itemSearch.trim() && !items.some((i) => i.itemName === itemSearch.trim()) && (
              <CustomButton
                label={`צור חדש: "${itemSearch.trim()}"`}
                variant="secondary"
                onPress={createManual}
                style={styles.btn}
              />
            )}
            <CustomButton
              label="ביטול"
              variant="ghost"
              onPress={() => {
                setManualOpen(false);
                setItemSearch('');
              }}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={!!pendingBarcode} transparent animationType="fade" onRequestClose={() => setPendingBarcode(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>פריט חדש</Text>
            <Text style={styles.modalSub} numberOfLines={1}>ברקוד: {pendingBarcode}</Text>
            <TextField label="שם הפריט" value={newItemName} onChange={setNewItemName} placeholder="לדוגמה: מצלמה" />
            <Text style={styles.modalSub}>● יתווסף למחסן עם סימון "חסר".</Text>
            <CustomButton label="הוסף" onPress={confirmNewItem} disabled={!newItemName.trim()} style={styles.btn} />
            <CustomButton label="ביטול" variant="ghost" onPress={() => setPendingBarcode(null)} />
          </View>
        </View>
      </Modal>
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
  financeRow: { flexDirection: 'row', gap: 8 },
  financeCol: { flex: 1 },
  dateStripScroll: { height: 64, marginBottom: 14 },
  dateStrip: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  calBtn: { width: 48, height: 56, borderRadius: 10, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  dateChip: {
    width: 48,
    height: 56,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateChipSel: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dateWd: { fontSize: 12, color: Colors.textSecondary },
  dateNum: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary, marginTop: 2 },
  dateTextSel: { color: '#FFFFFF' },
  dateDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#1E9E5A', marginTop: 3 },
  reqAddManual: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center' },
  pickList: { maxHeight: 200 },
  pickRow: { paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: Colors.border },
  pickText: { fontSize: 15, color: Colors.textPrimary, textAlign: 'right' },
  reqScroll: { height: 52, marginBottom: 14 },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqAdd: {
    width: 52,
    height: 44,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  reqChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    maxWidth: 180,
  },
  reqChipLacks: { borderColor: Colors.danger },
  reqChipText: { fontSize: 14, color: Colors.textPrimary },
  redDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.danger },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Layout.screenPadding },
  modalCard: { backgroundColor: Colors.background, borderRadius: 14, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginBottom: 4 },
  modalSub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'right', marginBottom: 8 },
});
