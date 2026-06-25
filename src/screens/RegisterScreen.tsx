import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomButton } from '../components/CustomButton';
import { TextField } from '../components/TextField';
import { useUser } from '../context/UserContext';
import { createPendingProfile } from '../services/userService';
import { subscribeToServices, addService } from '../services/serviceCatalogService';
import { ServiceOption } from '../types/serviceCatalog';
import { Availability } from '../types/user';
import { Colors } from '../constants/colors';
import { Layout } from '../constants/layout';

const DAY_LETTERS = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש']; // 0=Sunday … 6=Saturday

/** First-run after sign-in: capture the crew member's name, the services they
 *  provide (open catalog), and their availability. They stay pending until an
 *  admin provisions their capabilities. */
export function RegisterScreen() {
  const { user, signOut } = useUser();
  const [name, setName] = useState('');
  const [catalog, setCatalog] = useState<ServiceOption[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState('');
  const [days, setDays] = useState<number[]>([]);
  const [from, setFrom] = useState('08:00');
  const [to, setTo] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToServices(setCatalog, () => {});
    return () => unsub();
  }, []);

  function toggleService(serviceName: string) {
    setServices((prev) =>
      prev.includes(serviceName) ? prev.filter((s) => s !== serviceName) : [...prev, serviceName]
    );
  }

  async function handleAddService() {
    const canonical = await addService(newService);
    if (!canonical) return;
    setServices((prev) => (prev.includes(canonical) ? prev : [...prev, canonical]));
    setNewService('');
  }

  function toggleDay(d: number) {
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
  }

  async function submit() {
    if (!name.trim() || !user) return;
    setSaving(true);
    setError(null);
    const availability: Availability | undefined = days.length
      ? { days: [...days].sort((a, b) => a - b), from: from.trim() || '08:00', to: to.trim() || '17:00' }
      : undefined;
    try {
      await createPendingProfile(user.uid, name.trim(), {
        phone: user.phoneNumber ?? undefined,
        services,
        availability,
      });
      // Profile subscription flips the app to the pending screen automatically.
    } catch {
      setError('הרישום נכשל. נסה שוב.');
      setSaving(false);
    }
  }

  // Catalog plus any just-added services not yet echoed back by the listener.
  const options = Array.from(new Set([...catalog.map((c) => c.name), ...services]));

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>השלמת רישום</Text>
          <Text style={styles.subtitle}>
            הזן את פרטיך. מנהל המערכת ישייך אותך לצוות ולהרשאות.
          </Text>

          <TextField label="שם מלא" value={name} onChange={setName} placeholder="ישראל ישראלי" />

          <Text style={styles.section}>השירותים שאני מספק</Text>
          {options.length > 0 && (
            <View style={styles.chips}>
              {options.map((s) => {
                const on = services.includes(s);
                return (
                  <TouchableOpacity
                    key={s}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => toggleService(s)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>{s}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={styles.addRow}>
            <View style={styles.addField}>
              <TextField
                label=""
                value={newService}
                onChange={setNewService}
                placeholder="הוסף שירות שאינו ברשימה…"
              />
            </View>
            <CustomButton
              label="הוסף"
              variant="secondary"
              onPress={handleAddService}
              disabled={!newService.trim()}
              style={styles.addBtn}
            />
          </View>

          <Text style={styles.section}>ימי ושעות זמינות</Text>
          <View style={styles.days}>
            {DAY_LETTERS.map((letter, i) => {
              const on = days.includes(i);
              return (
                <TouchableOpacity
                  key={i}
                  style={[styles.day, on && styles.dayOn]}
                  onPress={() => toggleDay(i)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayText, on && styles.dayTextOn]}>{letter}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <TextField label="עד שעה" value={to} onChange={setTo} placeholder="17:00" />
            </View>
            <View style={styles.timeField}>
              <TextField label="משעה" value={from} onChange={setFrom} placeholder="08:00" />
            </View>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}
          <CustomButton
            label="המשך"
            onPress={submit}
            loading={saving}
            disabled={!name.trim()}
            style={styles.btn}
          />
          <CustomButton label="התנתק" variant="ghost" onPress={signOut} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  container: { padding: Layout.screenPadding * 1.5, paddingTop: 40, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginBottom: 24 },
  section: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary, textAlign: 'right', marginTop: 8, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginBottom: 12 },
  chip: {
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 18,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  chipOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, color: Colors.textPrimary },
  chipTextOn: { color: '#FFFFFF', fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginBottom: 8 },
  addField: { flex: 1 },
  addBtn: { marginBottom: 16, paddingHorizontal: 18 },
  days: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  day: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  dayText: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  dayTextOn: { color: '#FFFFFF' },
  timeRow: { flexDirection: 'row', gap: 12 },
  timeField: { flex: 1 },
  error: { color: Colors.danger, fontSize: 13, textAlign: 'center', marginBottom: 8 },
  btn: { marginTop: 8, marginBottom: 8 },
});
